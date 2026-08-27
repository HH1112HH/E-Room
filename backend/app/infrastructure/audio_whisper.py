from __future__ import annotations

import io
import wave
from typing import Any

from app.config import settings
from app.log import get_logger

logger = get_logger(__name__)

MIN_AUDIO_BYTES = 8000


def _pcm_to_wav(pcm_data: bytes, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


def transcribe_whisper(pcm_data: bytes, sample_rate: int) -> tuple[str, list[dict[str, Any]]]:
    if len(pcm_data) < MIN_AUDIO_BYTES:
        logger.debug("Audio qua ngan (%d bytes), bo qua", len(pcm_data))
        return "", []

    from app.infrastructure.whisper_manager import whisper_manager

    if whisper_manager.worker_count == 0:
        logger.warning("Khong co whisper worker nao ket noi")
        return "", []

    wav_data = _pcm_to_wav(pcm_data, sample_rate)
    logger.info("Gui audio den local worker (%d bytes WAV)", len(wav_data))

    try:
        import asyncio

        loop = asyncio.get_running_loop()
        future = asyncio.ensure_future(whisper_manager.send_audio(wav_data, settings.whisper_language, timeout=settings.whisper_local_timeout))

        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = pool.submit(asyncio.run, future).result()
    except RuntimeError:
        result = asyncio.run(whisper_manager.send_audio(wav_data, settings.whisper_language, timeout=settings.whisper_local_timeout))

    text = result.get("text", "")
    words = result.get("words", [])
    logger.info("Worker tra ve: text=%r, words=%d", text[:80], len(words))
    return text, words
