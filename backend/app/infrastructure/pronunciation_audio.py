from __future__ import annotations

import asyncio
import base64
from typing import Any
from uuid import uuid4

from app.infrastructure.minio import MinioCRUD
from app.log import get_logger

logger = get_logger(__name__)


def _synthesize(text: str, lang: str = "en") -> bytes:
    try:
        from io import BytesIO

        from gtts import gTTS

        buf = BytesIO()
        gTTS(text=text, lang=lang).write_to_fp(buf)
        return buf.getvalue()
    except Exception:
        logger.warning("TTS that bai cho '%s'", text[:30], exc_info=True)
        return b""


async def generate_audio_base64(text: str, lang: str = "en") -> str | None:
    try:
        wav_bytes = await asyncio.get_running_loop().run_in_executor(None, _synthesize, text, lang)
        if not wav_bytes:
            return None
        encoded = base64.b64encode(wav_bytes).decode("ascii")
        logger.info("Da tao audio phat am cho '%s' (%d bytes)", text[:30], len(encoded))
        return encoded
    except Exception:
        logger.warning("Khong the tao audio phat am cho '%s'", text[:30], exc_info=True)
        return None


async def generate_pronunciation_audio(errors: list[dict[str, Any]]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for err in errors:
        corrected = err.get("corrected", "").strip()
        if not corrected:
            continue
        audio_b64 = await generate_audio_base64(corrected)
        if audio_b64:
            result.append({"word": corrected, "audio_base64": audio_b64, "mime": "audio/mpeg"})
    return result


async def save_audio_to_minio(wav_bytes: bytes, room_id: str) -> str | None:
    try:
        key = f"audio/tts/{room_id}/{uuid4()}.mp3"
        crud = MinioCRUD()
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, crud.ensure_bucket)
        await loop.run_in_executor(None, crud.put_object, key, wav_bytes, "audio/mpeg")
        logger.info("Da upload TTS audio len MinIO: %s", key)
        return key
    except Exception:
        logger.warning("Upload TTS len MinIO that bai", exc_info=True)
        return None


async def generate_tts_with_storage(text: str, room_id: str, lang: str = "en") -> tuple[str | None, str | None]:
    wav_bytes = await asyncio.get_running_loop().run_in_executor(None, _synthesize, text, lang)
    if not wav_bytes:
        return None, None
    audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
    minio_key = await save_audio_to_minio(wav_bytes, room_id)
    return audio_b64, minio_key
