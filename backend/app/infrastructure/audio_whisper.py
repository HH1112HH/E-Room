from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import numpy as np
from faster_whisper import WhisperModel

from app.log import get_logger

logger = get_logger(__name__)

WEIGHT_DIR = Path(__file__).parent.parent / "weight"
WHISPER_CACHE = WEIGHT_DIR / "whisper"
WHISPER_CACHE.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("XDG_CACHE_HOME", str(WHISPER_CACHE.parent))

whisper_model: object | None = None


def get_whisper_model() -> WhisperModel:
    global whisper_model
    if whisper_model is None:
        use_cuda = os.environ.get("USE_CUDA", "").strip().lower() in ("1", "true", "yes")
        if use_cuda:
            whisper_model = WhisperModel(
                "tiny.en",
                device="cuda",
                compute_type="float16",
                download_root=str(WHISPER_CACHE),
            )
            logger.info("Đã tải model tiny.en float16 trên CUDA")
        else:
            whisper_model = WhisperModel(
                "tiny.en",
                device="cpu",
                compute_type="int8",
                download_root=str(WHISPER_CACHE),
                cpu_threads=2,
                num_workers=1,
            )
            logger.info("Đã tải model tiny.en int8 trên CPU")
    return whisper_model


MIN_AUDIO_BYTES = 8000


def transcribe_whisper(pcm_data: bytes, sample_rate: int) -> tuple[str, list[dict[str, Any]]]:
    if len(pcm_data) < MIN_AUDIO_BYTES:
        return "", []
    audio_array = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0
    model = get_whisper_model()
    segments, info = model.transcribe(
        audio_array,
        language="en",
        beam_size=3,
        best_of=3,
        temperature=0.0,
        vad_filter=False,
        condition_on_previous_text=False,
        no_speech_threshold=0.6,
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        no_repeat_ngram_size=3,
        repetition_penalty=1.5,
    )
    text_parts: list[str] = []
    words: list[dict[str, Any]] = []
    for seg in segments:
        seg_text = (seg.text or "").strip()
        if not seg_text:
            continue
        text_parts.append(seg_text)
        seg_words = seg_text.split()
        seg_confidence = min(max((seg.avg_logprob + 2) / 4, 0.1), 1.0)
        for w in seg_words:
            words.append(
                {
                    "word": w.strip(".,!?;:"),
                    "start": seg.start,
                    "end": seg.end,
                    "probability": seg_confidence,
                }
            )
    text = " ".join(text_parts)
    return text, words
