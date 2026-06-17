from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from sqlmodel import Session

from app.agent.corrector import correct_text
from app.agent.expert import answer_expert as ask_expert
from app.database import engine
from app.infrastructure.audio import AudioBuffer
from app.infrastructure.audio_pipeline import PronunciationPipeline
from app.infrastructure.pronunciation_audio import generate_audio_base64, generate_tts_with_storage
from app.log import get_logger
from app.model import Message, MessageType
from app.security import decode_token as decode_jwt
from app.service.message import MessageService
from app.service.token_store import TokenStore
from app.service.user import UserService

log = get_logger(__name__)
correction_semaphore = asyncio.Semaphore(1)

room_connections: dict[str, set[WebSocket]] = {}
processing_speech: set[str] = set()
vad_cooldown: dict[str, float] = {}
audio_vad_tasks: dict[str, asyncio.Task] = {}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def ws_auth(ws: WebSocket) -> str | None:
    token = ws.query_params.get("token") or ws.headers.get("authorization", "").replace("Bearer ", "")
    payload = decode_jwt(token)
    if payload is None:
        await ws.close(code=4001)
        return None

    jti = payload.get("jti")
    if jti:
        try:
            token_store = TokenStore()
            if token_store.is_blacklisted(jti):
                await ws.close(code=4001)
                return None
        except Exception:
            log.warning("Kiem tra blacklist that bai")

    user_id = payload.get("sub")
    if not user_id:
        await ws.close(code=4001)
        return None

    try:
        from sqlmodel import Session as DBSession

        with DBSession(engine) as session:
            reason = UserService(session).check_banned(UUID(user_id))
            if reason:
                await ws.close(code=4001)
                return None
    except Exception:
        log.warning("Kiem tra ban that bai", exc_info=True)

    return user_id


class AudioManager:
    def __init__(self) -> None:
        self.buffers: dict[str, AudioBuffer] = {}

    def get(self, user_id: str) -> AudioBuffer:
        if user_id not in self.buffers:
            self.buffers[user_id] = AudioBuffer(user_id)
        return self.buffers[user_id]

    def remove(self, user_id: str) -> None:
        self.buffers.pop(user_id, None)


audio_manager = AudioManager()


def save_message(
    session: Session,
    room_id: str,
    user_id: str | None,
    text: str,
    msg_type: str = MessageType.TEXT,
    sender_name: str = "",
    extra_payload: dict | None = None,
) -> Message | None:
    try:
        from uuid import UUID

        payload = dict(extra_payload or {})
        if "display_name" not in payload:
            payload["display_name"] = sender_name or user_id or "system"
        msg = Message(
            room_id=UUID(room_id) if isinstance(room_id, str) else room_id,
            user_id=UUID(user_id) if isinstance(user_id, str) else user_id,
            content=text,
            message_type=msg_type,
            payload=payload,
        )
        return MessageService(session).save(msg)
    except Exception:
        log.warning("Luu tin nhan that bai", exc_info=True)
        return None


async def generate_expert_reply(
    ws: WebSocket,
    room_id: str,
    user_id: str,
    question: str,
) -> None:
    try:
        result = await ask_expert(question, room_id)
        answer = result.get("answer", "")
        if not answer:
            return
        try:
            with Session(engine) as session:
                save_message(session, room_id, None, answer, MessageType.AI_EXPERT, "assistant")
        except Exception:
            log.warning("Luu expert reply vao DB that bai", exc_info=True)
        msg = json.dumps(
            {
                "type": "chat_message",
                "content": answer,
                "sender_id": "assistant",
                "display_name": "assistant",
                "sources": result.get("sources", []),
                "timestamp": now(),
            }
        )
        for ws_client in list(room_connections.get(room_id, set())):
            try:
                asyncio.create_task(ws_client.send_text(msg))
            except Exception:
                pass
    except Exception:
        log.warning("Phan hoi chuyen gia that bai", exc_info=True)


MAX_AUDIO_SECONDS = 20


async def process_speech(pcm_data: bytes, user_id: str, room_id: str) -> None:
    processing_speech.add(user_id)
    t0 = time.monotonic()
    pcm_secs = round(len(pcm_data) / 16000 / 2, 2)
    log.info("Bat dau xu ly giong noi", extra={"user_id": user_id, "room_id": room_id, "pcm_bytes": len(pcm_data), "pcm_seconds": pcm_secs})

    from app.model import Room as RoomModel
    from sqlmodel import select as sql_select

    try:
        with Session(engine) as session:
            room_db = session.exec(sql_select(RoomModel).where(RoomModel.id == UUID(room_id))).first()
            voice_enabled = room_db.enable_voice_recognition if room_db else True
            correction_enabled = room_db.enable_pronunciation_correction if room_db else True
    except Exception:
        voice_enabled = True
        correction_enabled = True

    if not voice_enabled:
        log.info("Nhan dien giong noi da tat", extra={"user_id": user_id, "room_id": room_id})
        processing_speech.discard(user_id)
        return

    pipeline = PronunciationPipeline()
    try:
        max_bytes = MAX_AUDIO_SECONDS * 16000 * 2
        if len(pcm_data) > max_bytes:
            pcm_data = pcm_data[-max_bytes:]
            log.info("Cat bot audio", extra={"user_id": user_id, "room_id": room_id, "trimmed_to_seconds": MAX_AUDIO_SECONDS})

        result = await pipeline.assess(pcm_data)
        text = (result.get("text", "") or "").strip()
        elapsed_transcribe = round(time.monotonic() - t0, 2)
        log.info("Whisper hoan tat", extra={"user_id": user_id, "room_id": room_id, "text": text, "elapsed_s": elapsed_transcribe})

        if not text:
            log.info("Bo qua doan ghi am trong", extra={"user_id": user_id, "room_id": room_id, "elapsed_s": elapsed_transcribe})
            return

        speaker_name = user_id
        try:
            with Session(engine) as session:
                speaker_user = UserService(session).get_by_id(UUID(user_id))
                if speaker_user:
                    speaker_name = speaker_user.display_name
        except Exception:
            pass

        try:
            with Session(engine) as session:
                saved = save_message(session, room_id, user_id, text, MessageType.TRANSCRIPT, speaker_name)
                if saved:
                    log.info("TRANSCRIPT da luu vao DB", extra={"message_id": str(saved.id), "text": text, "room_id": room_id, "user_id": user_id})
                else:
                    log.warning("TRANSCRIPT save_message tra ve None", extra={"room_id": room_id, "user_id": user_id, "text": text})
        except Exception:
            log.warning("Luu transcript vao DB that bai", exc_info=True)

        transcript_msg = json.dumps(
            {
                "type": "transcript",
                "text": text,
                "user_id": user_id,
                "display_name": speaker_name,
                "status": "final",
                "created_at": now(),
            }
        )
        for ws in list(room_connections.get(room_id, set())):
            try:
                asyncio.create_task(ws.send_text(transcript_msg))
            except Exception:
                pass
        log.info(
            "Da gui transcript qua WebSocket",
            extra={"user_id": user_id, "room_id": room_id, "text_len": len(text), "elapsed_s": round(time.monotonic() - t0, 2)},
        )

        async def run_scoring():
            try:
                timing = result.get("timing", {})
                scores = result["scores"]
                needs_remediation = result["needs_remediation"]
                words = result.get("words", [])
                log.info(
                    "Phan tich phat am hoan tat",
                    extra={
                        "user_id": user_id,
                        "room_id": room_id,
                        "word_count": len(words),
                        "overall_score": scores["overall"],
                        "needs_remediation": needs_remediation,
                        "transcribe_s": timing.get("transcribe_s"),
                        "total_s": timing.get("total_s"),
                        "elapsed_s": round(time.monotonic() - t0, 2),
                    },
                )

                if not correction_enabled:
                    log.info("Sua loi phat am da tat", extra={"user_id": user_id, "room_id": room_id})
                    return

                log.info("Bat dau sua loi phat am", extra={"user_id": user_id, "room_id": room_id, "text": text})
                async with correction_semaphore:
                    correction = await correct_text(
                        text,
                        user_id,
                        {
                            "text": text,
                            "scores": scores,
                            "needs_remediation": needs_remediation,
                            "words": words,
                        },
                    )
                    corrected_text = correction.get("corrected", "")
                    log.info(
                        "Sua loi phat am hoan tat",
                        extra={"user_id": user_id, "room_id": room_id, "corrected": corrected_text, "elapsed_s": round(time.monotonic() - t0, 2)},
                    )

                    tts_display_text = (
                        f"Maybe you didn't pronounce **\"{text}\"** correctly. "
                        "Try listening to the correct pronunciation for this sentence."
                    )

                    chat_msg: dict[str, object] = {
                        "type": "chat_message",
                        "content": tts_display_text,
                        "sender_id": "assistant",
                        "display_name": "assistant",
                        "timestamp": now(),
                    }

                    if corrected_text:
                        tts_audio_b64, tts_audio_key = await generate_tts_with_storage(corrected_text, room_id, lang="en")
                        if tts_audio_b64:
                            chat_msg["tts_audio_base64"] = tts_audio_b64
                        if tts_audio_key:
                            chat_msg["tts_audio_key"] = tts_audio_key

                        extra_payload: dict[str, object] = {
                            "original": text,
                            "explanation": correction.get("explanation", ""),
                            "pronunciation_feedback": correction.get("pronunciation_feedback", ""),
                            "errors": correction.get("errors", []),
                            "pronunciation_audio": correction.get("pronunciation_audio", []),
                            "tts_text": correction.get("tts_text", corrected_text),
                            "tts_display": tts_display_text,
                        }
                        if tts_audio_key:
                            extra_payload["tts_audio_key"] = tts_audio_key
                        if tts_audio_b64:
                            extra_payload["tts_audio_base64"] = tts_audio_b64

                        try:
                            with Session(engine) as session:
                                saved = save_message(
                                    session,
                                    room_id,
                                    None,
                                    corrected_text,
                                    MessageType.AI_CORRECTION,
                                    extra_payload=extra_payload,
                                )
                                if saved:
                                    log.info("AI_CORRECTION da luu vao DB", extra={"message_id": str(saved.id), "corrected_text": corrected_text, "room_id": room_id})
                                else:
                                    log.warning("AI_CORRECTION save_message tra ve None", extra={"room_id": room_id, "corrected_text": corrected_text})
                        except Exception:
                            log.warning("Luu ket qua sua loi vao DB that bai", exc_info=True)

                    chat_msg_json = json.dumps(chat_msg)

                    try:
                        with Session(engine) as session:
                            expert_payload: dict[str, object] = {}
                            if tts_audio_key:
                                expert_payload["tts_audio_key"] = tts_audio_key
                            if tts_audio_b64:
                                expert_payload["tts_audio_base64"] = tts_audio_b64
                            saved = save_message(
                                session,
                                room_id,
                                None,
                                tts_display_text,
                                MessageType.AI_EXPERT,
                                "assistant",
                                extra_payload=expert_payload,
                            )
                            if saved:
                                log.info("AI_EXPERT da luu vao DB", extra={"message_id": str(saved.id), "room_id": room_id})
                            else:
                                log.warning("AI_EXPERT save_message tra ve None", extra={"room_id": room_id})
                    except Exception:
                        log.warning("Luu tin nhan hien thi assistant vao DB that bai", exc_info=True)
                    for ws in list(room_connections.get(room_id, set())):
                        try:
                            asyncio.create_task(ws.send_text(chat_msg_json))
                        except Exception:
                            pass
            except Exception:
                log.warning("Phat am + sua loi that bai", exc_info=True, extra={"user_id": user_id, "room_id": room_id})

        asyncio.create_task(run_scoring())
    except Exception:
        log.warning("Xu ly giong noi that bai", exc_info=True, extra={"user_id": user_id, "room_id": room_id})
    finally:
        pipeline.shutdown()
        processing_speech.discard(user_id)
        vad_cooldown[user_id] = time.time() + 1.0


async def handle_audio_ws(ws: WebSocket, room_id: str) -> None:
    user_id = await ws_auth(ws)
    if not user_id:
        log.warning("WS audio auth that bai", extra={"room_id": room_id})
        return
    await ws.accept()
    old_task = audio_vad_tasks.get(user_id)
    if old_task and not old_task.done():
        old_task.cancel()
    room_connections.setdefault(room_id, set()).add(ws)
    buf = audio_manager.get(user_id)
    log.info("WS audio da ket noi", extra={"room_id": room_id, "user_id": user_id})

    async def vad_loop():
        while True:
            await asyncio.sleep(0.2)
            if not buf.has_voice():
                continue
            if user_id in processing_speech:
                continue
            vad_result = buf.check_vad()
            if vad_result == "speech_end":
                cooldown_end = vad_cooldown.get(user_id, 0)
                if time.time() < cooldown_end:
                    continue
                pcm = buf.finalize()
                if pcm:
                    vad_cooldown[user_id] = time.time() + 1.0
                    log.info("Phat hien ket thuc giong noi (VAD)", extra={"user_id": user_id, "pcm_bytes": len(pcm)})
                    asyncio.create_task(process_speech(pcm, user_id, room_id))

    vad_task = asyncio.create_task(vad_loop())
    audio_vad_tasks[user_id] = vad_task
    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)

            if "seq" in data:
                pcm_b64 = data.get("pcm") or data.get("data")
                if pcm_b64:
                    log.debug("audio_chunk_da_nhan", extra={"user_id": user_id, "seq": data["seq"]})
                    buf.push(data["seq"], pcm_b64)

            elif data.get("type") == "speech_end":
                pcm = buf.finalize()
                log.info("Phat hien ket thuc giong noi", extra={"user_id": user_id, "pcm_bytes": len(pcm) if pcm else 0})
                if pcm:
                    asyncio.create_task(process_speech(pcm, user_id, room_id))

            elif data.get("type") == "heartbeat_ack":
                pass

    except WebSocketDisconnect:
        log.info("WS am thanh ngat ket noi", extra={"room_id": room_id, "user_id": user_id})
    except Exception:
        log.warning("WS am thanh receive error", exc_info=True)
    finally:
        vad_task.cancel()
        audio_vad_tasks.pop(user_id, None)
        audio_manager.remove(user_id)
        processing_speech.discard(user_id)
        vad_cooldown.pop(user_id, None)
        room_connections.get(room_id, set()).discard(ws)
        log.info("Ngat ket noi WebSocket am thanh", extra={"room_id": room_id, "user_id": user_id})


async def handle_room_ws(ws: WebSocket, room_id: str) -> None:
    user_id = await ws_auth(ws)
    if not user_id:
        log.warning("WS phong auth that bai", extra={"room_id": room_id})
        return
    await ws.accept()
    room_connections.setdefault(room_id, set()).add(ws)
    log.info("WS phong da ket noi", extra={"room_id": room_id, "user_id": user_id})

    try:
        welcome_msg = json.dumps(
            {
                "type": "chat_message",
                "content": "👋 Welcome to the room! Practice speaking and I'll help with pronunciation. Try saying something!",
                "sender_id": "assistant",
                "display_name": "assistant",
                "timestamp": now(),
            }
        )
        try:
            asyncio.create_task(ws.send_text(welcome_msg))
        except Exception:
            pass

        system_msg = json.dumps(
            {
                "type": "system",
                "event": "user_joined",
                "user_id": user_id,
                "display_name": user_id,
                "participant_count": len(room_connections.get(room_id, set())),
            }
        )
        for ws_client in room_connections.get(room_id, set()):
            try:
                asyncio.create_task(ws_client.send_text(system_msg))
            except Exception:
                pass

        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))

            elif msg_type == "chat":
                content = (data.get("text") or data.get("content") or "").strip()
                if not content:
                    continue
                log.info("WS phong nhan tin nhan", extra={"room_id": room_id, "user_id": user_id, "text": content})
                try:
                    with Session(engine) as session:
                        sender_user = UserService(session).get_by_id(UUID(user_id))
                        sender_dn = sender_user.display_name if sender_user else ""
                        save_message(session, room_id, user_id, content, MessageType.TEXT, sender_dn)
                except Exception:
                    log.warning("Luu tin nhan chat that bai", exc_info=True)
                broadcast = json.dumps(
                    {
                        "type": "chat_message",
                        "content": content,
                        "sender_id": user_id,
                        "display_name": data.get("display_name", user_id),
                        "timestamp": now(),
                    }
                )
                for ws_client in room_connections.get(room_id, set()):
                    try:
                        asyncio.create_task(ws_client.send_text(broadcast))
                    except Exception:
                        pass

            elif msg_type == "question":
                question = (data.get("text") or data.get("content") or "").strip()
                if question:
                    log.info("WS phong nhan cau hoi", extra={"room_id": room_id, "user_id": user_id})
                    await generate_expert_reply(ws, room_id, user_id, question)

            elif msg_type == "request_tts":
                tts_text = (data.get("text") or "").strip()
                if not tts_text:
                    continue
                log.info("WS phong nhan yeu cau TTS", extra={"room_id": room_id, "user_id": user_id, "text": tts_text})
                audio_b64 = await generate_audio_base64(tts_text)
                if audio_b64:
                    tts_msg = json.dumps({"type": "tts_audio", "audio_base64": audio_b64, "mime": "audio/wav", "text": tts_text})
                    try:
                        await ws.send_text(tts_msg)
                    except Exception:
                        pass

    except WebSocketDisconnect:
        log.info("WS phong ngat ket noi", extra={"room_id": room_id, "user_id": user_id})
    except Exception:
        log.warning("WS phong receive error", exc_info=True)
    finally:
        room_connections.get(room_id, set()).discard(ws)
        leave_msg = json.dumps(
            {
                "type": "system",
                "event": "user_left",
                "user_id": user_id,
                "participant_count": len(room_connections.get(room_id, set())),
            }
        )
        for ws_client in room_connections.get(room_id, set()):
            try:
                asyncio.create_task(ws_client.send_text(leave_msg))
            except Exception:
                pass
        log.info("Ngat ket noi WebSocket phong", extra={"room_id": room_id, "user_id": user_id})
