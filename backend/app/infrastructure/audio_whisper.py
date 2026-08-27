from __future__ import annotations

import io
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
        api_key = settings.groq_api_key
        if not api_key:
            logger.warning("GROQ_API_KEY chua duoc cau hinh! Groq STT se khong hoat dong.")
            raise ValueError("GROQ_API_KEY is not set")
        _groq_client = Groq(api_key=api_key)
        logger.info("Da khoi tao Groq client (model=%s, language=%s)", settings.whisper_model, settings.whisper_language)
    return _groq_client


def _pcm_to_wav(pcm_data: bytes, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


def _transcribe_local(wav_data: bytes) -> tuple[str, list[dict[str, Any]]]:
    from app.infrastructure.whisper_manager import whisper_manager

    if whisper_manager.worker_count == 0:
        raise RuntimeError("No whisper worker available")

    import asyncio

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        future = asyncio.ensure_future(whisper_manager.send_audio(wav_data, settings.whisper_language, timeout=settings.whisper_local_timeout))
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = pool.submit(asyncio.run, future).result()
    else:
        result = asyncio.run(whisper_manager.send_audio(wav_data, settings.whisper_language, timeout=settings.whisper_local_timeout))

    text = result.get("text", "")
    words = result.get("words", [])
    return text, words


def _transcribe_groq(wav_data: bytes) -> tuple[str, list[dict[str, Any]]]:
    client = _get_groq_client()
    logger.info("Gui audio den Groq (%d bytes WAV, model=%s)", len(wav_data), settings.whisper_model)

    result = client.audio.transcriptions.create(
        file=("audio.wav", wav_data),
        model=settings.whisper_model,
        response_format="verbose_json",
        language=settings.whisper_language,
        temperature=0.0,
    )
    logger.info("Groq tra ve: text=%r", (result.text or "")[:100])

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
        for i, w in enumerate(word_list):
            start = i / max(len(word_list), 1)
            end = (i + 1) / max(len(word_list), 1)
            words.append({"word": w, "probability": 0.5, "start": start, "end": end})

    return text, words


def transcribe_whisper(pcm_data: bytes, sample_rate: int) -> tuple[str, list[dict[str, Any]]]:
    if len(pcm_data) < MIN_AUDIO_BYTES:
        logger.debug("Audio qua ngan (%d bytes), bo qua", len(pcm_data))
        return "", []

    wav_data = _pcm_to_wav(pcm_data, sample_rate)
    mode = settings.whisper_mode

    if mode == "local":
        try:
            logger.info("Transcribe mode=LOCAL (timeout=%ds)", settings.whisper_local_timeout)
            text, words = _transcribe_local(wav_data)
            return text, words
        except Exception as e:
            if settings.whisper_fallback_groq:
                logger.warning("Local whisper that bai (%s), fallback Groq", e)
                try:
                    return _transcribe_groq(wav_data)
                except Exception:
                    logger.exception("Groq fallback also failed")
                    return "", []
            logger.exception("Local whisper failed and no fallback")
            return "", []
    else:
        try:
            logger.info("Transcribe mode=GROQ")
            return _transcribe_groq(wav_data)
        except Exception:
            logger.exception("Groq transcription failed")
            return "", []
