from __future__ import annotations

import io
import struct
import wave

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.infrastructure.audio_whisper import transcribe_whisper
from app.log import get_logger

router = APIRouter()
log = get_logger(__name__)


@router.get("/audio/test-transcribe")
async def test_transcribe():
    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY chưa được cấu hình trên Render")

    sample_rate = 16000
    duration_s = 1
    n_samples = sample_rate * duration_s
    pcm_data = b"\x00\x00" * n_samples

    log.info("Test transcribe: gửi %d bytes PCM đến Groq", len(pcm_data))
    text, words = transcribe_whisper(pcm_data, sample_rate)
    log.info("Test transcribe kết quả: text=%r, words=%d", text, len(words))

    return {
        "groq_configured": bool(settings.groq_api_key),
        "model": settings.whisper_model,
        "language": settings.whisper_language,
        "text": text,
        "words_count": len(words),
    }
