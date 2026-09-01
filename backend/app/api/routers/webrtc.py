"""WebRTC router — REST replacement for WebSocket handlers.

Migration path:
- Old:  WS /ws/rooms/{room_id}  (chat, heartbeat, presence)
        WS /ws/audio/{room_id} (PCM chunks, VAD)
- New:  HTTP/WebRTC via LiveKit DataChannel + REST endpoints below.
        Frontend publishes chat/audio via LiveKit DataChannel directly
        (peer-to-peer / SFU) and via these REST endpoints for server-processed
        features (STT, pronunciation correction, expert RAG).

All endpoints require JWT auth (same as websocket ws_auth). Responses are
broadcast to the room via WebRTCManager.broadcast which delivers via
LiveKit Server API + legacy WebSocket fallback for backward compat.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.dependencies import get_current_user, get_db_session
from app.infrastructure.audio import AudioBuffer
from app.infrastructure.webrtc_manager import webrtc_manager
from app.log import get_logger
from app.model import Message, MessageType, Room
from app.service.message import MessageService
from app.service.user import UserService

router = APIRouter()
log = get_logger(__name__)

# Reuse same in-memory audio buffers as websocket handler so both transports share state
from app.api.routers.websocket import audio_manager, processing_speech, vad_cooldown, room_last_speech
from app.api.routers.websocket import process_speech as ws_process_speech
from app.api.routers.websocket import generate_expert_reply, save_message
from app.database import engine

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_livekit_room_name(room_id: str) -> str | None:
    try:
        from sqlmodel import Session as DBSession

        with DBSession(engine) as session:
            room = session.exec(select(Room).where(Room.id == UUID(room_id))).first()
            if room:
                return getattr(room, "livekit_room_name", None)
    except Exception:
        pass
    return None


async def _broadcast(room_id: str, payload: dict[str, Any]) -> None:
    livekit_room = _get_livekit_room_name(room_id)
    await webrtc_manager.broadcast(room_id, payload, livekit_room_name=livekit_room)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    display_name: str | None = None


class AudioChunkRequest(BaseModel):
    seq: int = Field(..., ge=0)
    pcm: str = Field(..., description="base64-encoded PCM16le 16kHz mono")
    # alias 'data' for backward compat with websocket payload
    data: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class QuestionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class SignalRequest(BaseModel):
    sdp: str | None = None
    type: str | None = Field(default=None, description="offer | answer")
    candidate: dict | None = None
    target_user_id: str | None = None


# ---------------------------------------------------------------------------
# Chat — replaces ws.onmessage type=chat
# ---------------------------------------------------------------------------

@router.post("/rooms/{room_id}/chat")
async def webrtc_chat(
    room_id: UUID,
    payload: ChatRequest,
    session: Session = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    user_id = current_user["id"]
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty message")

    display_name = payload.display_name
    if not display_name:
        try:
            u = UserService(session).get_by_id(UUID(user_id))
            display_name = u.display_name if u else user_id[:8]
        except Exception:
            display_name = user_id[:8]

    # Persist
    try:
        save_message(session, room_id_str, user_id, text, MessageType.TEXT, display_name)
    except Exception:
        log.warning("webrtc chat save failed", exc_info=True)

    room_last_speech[room_id_str] = time.time()

    msg = {
        "type": "chat_message",
        "content": text,
        "sender_id": user_id,
        "display_name": display_name,
        "timestamp": _now_iso(),
        "transport": "webrtc",
    }
    await _broadcast(room_id_str, msg)
    return {"status": "ok", "broadcast": msg}


# ---------------------------------------------------------------------------
# Question — replaces ws type=question
# ---------------------------------------------------------------------------

@router.post("/rooms/{room_id}/question")
async def webrtc_question(
    room_id: UUID,
    payload: QuestionRequest,
    session: Session = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    user_id = current_user["id"]
    question = payload.text.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty question")

    # generate_expert_reply broadcasts itself via room_connections + DB
    # we run it in background but also await for immediate feedback in migration
    # Use webrtc broadcast path for consistency
    from app.api.routers.websocket import room_connections
    import json as _json

    # Create a dummy WS-like object that pipes to webrtc broadcast
    class _BroadcastWS:
        async def send_text(self, data: str):
            try:
                obj = _json.loads(data) if isinstance(data, str) else data
                await _broadcast(room_id_str, obj)
            except Exception:
                pass

    dummy_ws = _BroadcastWS()  # type: ignore
    # Run expert reply (it will broadcast chat_message to room)
    asyncio.create_task(generate_expert_reply(dummy_ws, room_id_str, user_id, question))  # type: ignore
    return {"status": "queued", "question": question}


# ---------------------------------------------------------------------------
# TTS — replaces ws type=request_tts
# ---------------------------------------------------------------------------

@router.post("/rooms/{room_id}/tts")
async def webrtc_tts(
    room_id: UUID,
    payload: TTSRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    from app.infrastructure.pronunciation_audio import generate_audio_base64

    audio_b64 = await generate_audio_base64(payload.text.strip())
    if not audio_b64:
        raise HTTPException(status_code=500, detail="TTS generation failed")

    # For WebRTC clients, we broadcast via LiveKit data channel directly to requester
    # but also return inline for immediate playback (same as old ws flow which sent back via ws)
    room_id_str = str(room_id)
    tts_msg = {"type": "tts_audio", "audio_base64": audio_b64, "mime": "audio/mpeg", "text": payload.text}
    await _broadcast(room_id_str, tts_msg)
    return tts_msg


# ---------------------------------------------------------------------------
# Audio — replaces WS /ws/audio/{room_id}
# PCM chunks are sent via HTTP POST (from WebRTC DataChannel fallback or direct HTTP)
# Frontend should prefer HTTP chunk upload over WS now.
# ---------------------------------------------------------------------------

@router.post("/rooms/{room_id}/audio/chunk")
async def webrtc_audio_chunk(
    room_id: UUID,
    payload: AudioChunkRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    user_id = current_user["id"]
    b64 = payload.pcm or payload.data
    if not b64:
        raise HTTPException(status_code=400, detail="Missing pcm data")

    buf = audio_manager.get(user_id)
    # push same as websocket handle
    buf.push(payload.seq, b64)

    # Opportunistic VAD check — if speech_end detected, trigger processing like vad_loop
    # (legacy vad_loop in websocket did polling every 200ms; here we check on each chunk)
    if user_id in processing_speech:
        return {"status": "buffered", "seq": payload.seq, "processing": True}

    if not buf.has_voice():
        return {"status": "buffered", "seq": payload.seq}

    vad_result = buf.check_vad()
    if vad_result == "speech_end":
        # cooldown like websocket
        cd = vad_cooldown.get(user_id, 0)
        if time.time() < cd:
            return {"status": "buffered", "seq": payload.seq, "cooldown": True}
        pcm = buf.finalize()
        if pcm:
            vad_cooldown[user_id] = time.time() + 1.0
            log.info("WebRTC VAD speech_end", extra={"user_id": user_id, "room_id": room_id_str, "pcm_bytes": len(pcm)})
            asyncio.create_task(ws_process_speech(pcm, user_id, room_id_str))
            return {"status": "speech_end", "triggered": True}

    return {"status": "buffered", "seq": payload.seq, "vad": vad_result}


@router.post("/rooms/{room_id}/audio/finalize")
async def webrtc_audio_finalize(
    room_id: UUID,
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    user_id = current_user["id"]
    buf = audio_manager.get(user_id)
    pcm = buf.finalize()
    if not pcm:
        return {"status": "empty"}
    # cooldown guard
    # no need to check vad_cooldown here — explicit finalize is user-triggered
    log.info("WebRTC explicit speech finalize", extra={"user_id": user_id, "room_id": room_id_str, "pcm_bytes": len(pcm)})
    asyncio.create_task(ws_process_speech(pcm, user_id, room_id_str))
    room_last_speech[room_id_str] = time.time()
    return {"status": "processing", "pcm_bytes": len(pcm)}


@router.post("/rooms/{room_id}/audio/presence")
async def webrtc_audio_presence(
    room_id: UUID,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Heartbeat / presence update — replaces ws ping/heartbeat_ack.
    Called periodically by WebRTC frontend to keep room_last_speech fresh.
    """
    room_id_str = str(room_id)
    room_last_speech[room_id_str] = time.time()
    return {"status": "ok", "room_id": room_id_str}


# ---------------------------------------------------------------------------
# Signaling — for pure WebRTC mesh if needed (offer/answer/ICE exchange via REST)
# Most deployments use LiveKit SFU and do not need this, but we provide it for
# direct P2P fallback or custom SFU.
# ---------------------------------------------------------------------------

@router.post("/rooms/{room_id}/signal")
async def webrtc_signal(
    room_id: UUID,
    payload: SignalRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    user_id = current_user["id"]

    if payload.sdp and payload.type in ("offer", "answer"):
        webrtc_manager.store_offer(room_id_str, user_id, payload.sdp, payload.type)
        # Notify peers via broadcast (LiveKit + WS fallback)
        await _broadcast(room_id_str, {"type": "webrtc_signal", "signal_type": payload.type, "sdp": payload.sdp, "from": user_id, "target": payload.target_user_id})
        return {"status": "stored", "type": payload.type}

    if payload.candidate:
        webrtc_manager.store_ice(room_id_str, user_id, payload.candidate)
        await _broadcast(room_id_str, {"type": "webrtc_signal", "signal_type": "ice", "candidate": payload.candidate, "from": user_id, "target": payload.target_user_id})
        return {"status": "stored", "type": "ice"}

    raise HTTPException(status_code=400, detail="Invalid signal payload")


@router.get("/rooms/{room_id}/signal")
async def webrtc_signal_poll(
    room_id: UUID,
    user_id: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    # Return all signals for room (client filters by target)
    signals = webrtc_manager._signals.get(room_id_str, {})
    return {"room_id": room_id_str, "signals": signals}


# ---------------------------------------------------------------------------
# LiveKit webhook — optional, for room events (participant joined/left, data)
# Configure livekit.yaml webhook to POST here for server-side presence.
# ---------------------------------------------------------------------------

@router.post("/livekit/webhook")
async def livekit_webhook(request: Request) -> dict:
    try:
        body = await request.body()
        # Verify token if present
        auth = request.headers.get("authorization", "")
        # LiveKit sends Authorization: Bearer <jwt>
        # We just log and ack — full verification optional
        data = json.loads(body) if body else {}
        log.info("LiveKit webhook received", extra={"event": data.get("event"), "room": data.get("room", {}).get("name")})
        # Handle participant_joined / left to sync room_connections presence
        event = data.get("event", "")
        room_name = data.get("room", {}).get("name") or data.get("room_name", "")
        if event in ("participant_joined", "participant_joined", "room_started") or "participant" in data:
            pass  # could update metrics
        return {"status": "ok"}
    except Exception as e:
        log.warning("LiveKit webhook error", exc_info=True)
        return {"status": "error", "detail": str(e)}


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

@router.get("/rooms/{room_id}/webrtc/status")
async def webrtc_status(
    room_id: UUID,
    current_user: dict = Depends(get_current_user),
) -> dict:
    room_id_str = str(room_id)
    from app.api.routers.websocket import room_connections

    ws_count = len(room_connections.get(room_id_str, set()))
    livekit_room = _get_livekit_room_name(room_id_str)
    return {
        "room_id": room_id_str,
        "transport": "webrtc+livekit",
        "livekit_room_name": livekit_room,
        "websocket_fallback_connections": ws_count,
        "processing_speech": list(processing_speech),
        "webrtc_signals": len(webrtc_manager._signals.get(room_id_str, {})),
    }
