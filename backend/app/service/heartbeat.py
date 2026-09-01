from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, col, select

from app.agent.heartbeat import FALLBACK_QUESTIONS_VI, generate_heartbeat_question
from app.config import settings
from app.database import engine
from app.infrastructure.redis_client import get_redis_client
from app.log import get_logger
from app.model import Message, MessageType, Room

log = get_logger(__name__)

SILENCE_THRESHOLD_SECONDS = 15
RECENT_MESSAGES_LIMIT = 10


def _get_recent_messages(room_id: str, limit: int = RECENT_MESSAGES_LIMIT) -> str:
    try:
        with Session(engine) as session:
            stmt = (
                select(Message)
                .where(Message.room_id == UUID(room_id))
                .where(col(Message.message_type).in_([MessageType.TEXT, MessageType.TRANSCRIPT]))
                .order_by(col(Message.created_at).desc())
                .limit(limit)
            )
            messages = session.exec(stmt).all()
            if not messages:
                return ""
            lines = []
            for m in reversed(list(messages)):
                speaker = m.payload.get("display_name", "User") if m.payload else "User"
                lines.append(f"{speaker}: {m.content}")
            return "\n".join(lines)
    except Exception:
        return ""


async def heartbeat_loop() -> None:
    from app.api.routers.websocket import room_last_speech

    while True:
        try:
            await asyncio.sleep(5)
            now = time.time()

            with Session(engine) as session:
                rooms = session.exec(select(Room).where(Room.current_participants > 0)).all()
            active_rooms = [r for r in rooms if r.current_participants > 0]

            for room in active_rooms:
                if not room.enable_heartbeat:
                    continue

                room_id_str = str(room.id) if isinstance(room.id, UUID) else room.id
                last_speech = room_last_speech.get(room_id_str, 0)
                silence_duration = now - last_speech

                if silence_duration < SILENCE_THRESHOLD_SECONDS:
                    continue

                if last_speech == 0:
                    room_last_speech[room_id_str] = now
                    continue

                try:
                    topic = getattr(room, "topic", None) or "AI"
                    tags = getattr(room, "tags", []) or []
                    tag_str = ", ".join(tags) if tags else topic

                    recent = _get_recent_messages(room_id_str)
                    if recent:
                        context = f"Chủ đề phòng: {topic} ({tag_str})\n\nHội thoại gần đây:\n{recent}\n\nHãy đặt một câu hỏi mở để tiếp tục cuộc thảo luận về chủ đề trên."
                    else:
                        context = f"Chủ đề phòng: {topic} ({tag_str}). Chưa có ai nói. Hãy đặt câu hỏi khởi đầu để bắt đầu cuộc thảo luận."

                    log.info("Nhịp tim - gửi câu hỏi", extra={"room_id": room_id_str, "silence_s": round(silence_duration, 1)})

                    data = await generate_heartbeat_question(room.id, context)
                    if not data or "question" not in data:
                        continue

                    question_text = data.get("question", "")
                    question_vi = data.get("question_vi") or FALLBACK_QUESTIONS_VI.get(question_text, "")
                    if question_text:
                        try:
                            with Session(engine) as session:
                                msg = Message(
                                    room_id=UUID(room_id_str) if isinstance(room_id_str, str) else room_id_str,
                                    user_id=None,
                                    content=question_text,
                                    message_type=MessageType.AI_HEARTBEAT,
                                    payload={
                                        "question_id": data.get("question_id", ""),
                                        "answers": data.get("answers", []),
                                        "vi": question_vi,
                                    },
                                )
                                from app.service.message import MessageService
                                MessageService(session).save(msg)
                        except Exception:
                            log.warning("Luu heartbeat vao DB that bai", exc_info=True)

                        # WebRTC primary: broadcast via LiveKit DataChannel + WS fallback
                        heartbeat_payload = {
                            "type": "chat_message",
                            "content": question_text,
                            "vi": question_vi,
                            "sender_id": "assistant",
                            "display_name": "assistant",
                            "question_id": data.get("question_id", ""),
                            "answers": data.get("answers", []),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        try:
                            from app.infrastructure.webrtc_manager import webrtc_manager

                            livekit_room_name = getattr(room, "livekit_room_name", None)
                            await webrtc_manager.broadcast(
                                room_id_str, heartbeat_payload, livekit_room_name=livekit_room_name
                            )
                        except Exception:
                            log.warning("heartbeat webrtc broadcast failed", exc_info=True)
                            # fallback to legacy WS
                            try:
                                from app.api.routers.websocket import room_connections

                                heartbeat_msg = json.dumps(heartbeat_payload, default=str)
                                for ws in list(room_connections.get(room_id_str, set())):
                                    try:
                                        asyncio.create_task(ws.send_text(heartbeat_msg))
                                    except Exception:
                                        pass
                            except Exception:
                                pass

                        room_last_speech[room_id_str] = now

                    try:
                        client = get_redis_client()
                        client.publish(
                            "room:heartbeat",
                            json.dumps(
                                {
                                    "room_id": room.id,
                                    **data,
                                },
                                default=str,
                            ),
                        )
                    except Exception:
                        pass
                except Exception:
                    log.warning("Nhịp tim - gửi câu hỏi thất bại", exc_info=True, extra={"room_id": room.id})
        except Exception:
            log.warning("Nhịp tim - lỗi vòng lặp", exc_info=True)
