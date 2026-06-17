from __future__ import annotations

import asyncio
import json
from uuid import UUID

from sqlmodel import Session, select

from app.agent.heartbeat import generate_heartbeat_question
from app.config import settings
from app.database import engine
from app.infrastructure.redis_client import get_redis_client
from app.log import get_logger
from app.model import Message, MessageType, Room

log = get_logger(__name__)


async def heartbeat_loop() -> None:
    while True:
        try:
            await asyncio.sleep(settings.heartbeat_interval_seconds)
            with Session(engine) as session:
                rooms = session.exec(select(Room).where(Room.current_participants > 0)).all()
            active_rooms = [r for r in rooms if r.current_participants > 0]
            log.info("Nhịp tim - kiểm tra phòng hoạt động", extra={"active_rooms": len(active_rooms)})

            for room in active_rooms:
                if not room.enable_heartbeat:
                    continue
                try:
                    topic = getattr(room, "topic", None) or "AI"
                    context = f"Phòng: {topic}. Hội thoại gần đây: "
                    log.info("Nhịp tim - gửi câu hỏi đến phòng", extra={"room_id": room.id, "heartbeat_count": 0})

                    data = await generate_heartbeat_question(room.id, context)
                    if not data or "question" not in data:
                        continue

                    from app.api.routers.websocket import room_connections

                    room_id_str = str(room.id) if isinstance(room.id, UUID) else room.id
                    question_text = data.get("question", "")
                    if question_text:
                        try:
                            from app.service.message import MessageService

                            with Session(engine) as session:
                                msg = Message(
                                    room_id=UUID(room_id_str) if isinstance(room_id_str, str) else room_id_str,
                                    user_id=None,
                                    content=question_text,
                                    message_type=MessageType.AI_HEARTBEAT,
                                    payload={"question_id": data.get("question_id", ""), "answers": data.get("answers", [])},
                                )
                                MessageService(session).save(msg)
                        except Exception:
                            log.warning("Luu heartbeat vao DB that bai", exc_info=True)

                        from datetime import datetime, timezone

                        heartbeat_msg = json.dumps(
                            {
                                "type": "chat_message",
                                "content": question_text,
                                "sender_id": "assistant",
                                "display_name": "assistant",
                                "question_id": data.get("question_id", ""),
                                "answers": data.get("answers", []),
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            },
                            default=str,
                        )
                        for ws in list(room_connections.get(room_id_str, set())):
                            try:
                                asyncio.create_task(ws.send_text(heartbeat_msg))
                            except Exception:
                                pass

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
