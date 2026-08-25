from __future__ import annotations

import io
import struct
import wave
from typing import Any

from groq import Groq

from app.config import settings
from app.log import get_logger

logger = get_logger(__name__)

MIN_AUDIO_BYTES = 8000

_groq_client: Groq | None = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("Đã khởi tạo Groq client")
    return _groq_client


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
        return "", []

    client = _get_groq_client()
    wav_data = _pcm_to_wav(pcm_data, sample_rate)

    try:
        result = client.audio.transcriptions.create(
            file=("audio.wav", wav_data),
            model=settings.whisper_model,
            response_format="verbose_json",
            language=settings.whisper_language,
            temperature=0.0,
        )
    except Exception:
        logger.exception("Groq transcription failed")
        return "", []

    text = (result.text or "").strip()

    words: list[dict[str, Any]] = []
    raw_words = getattr(result, "words", None) or []
    for w in raw_words:
        words.append(
            {
                "word": (w.get("word") or "").strip(),
                "probability": w.get("probability", 0.5),
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
            }
        )

    if not words and text:
        word_list = text.split()
        total_chars = max(len(text), 1)
        for i, w in enumerate(word_list):
            start = i / max(len(word_list), 1)
            end = (i + 1) / max(len(word_list), 1)
            words.append({"word": w, "probability": 0.5, "start": start, "end": end})

    return text, words
