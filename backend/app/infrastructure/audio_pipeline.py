from __future__ import annotations

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.infrastructure.audio_dictionary import CMUDictionary
from app.infrastructure.audio_whisper import transcribe_whisper
from app.log import get_logger

logger = get_logger(__name__)


class PronunciationPipeline:
    def __init__(self) -> None:
        self.dictionary = CMUDictionary()
        self.executor = ThreadPoolExecutor(max_workers=2)

    def shutdown(self) -> None:
        self.executor.shutdown(wait=True)

    @staticmethod
    def transcribe(pcm_data: bytes, sample_rate: int) -> str:
        text, _ = transcribe_whisper(pcm_data, sample_rate)
        return text

    @staticmethod
    def compute_word_scores(words_meta: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], float, int]:
        word_scores: list[dict[str, Any]] = []
        total_confidence = 0.0
        word_count = 0
        for w in words_meta:
            score = min(w.get("probability", 0.5) * 100, 100)
            total_confidence += score
            word_count += 1
            word_scores.append(
                {
                    "word": w["word"],
                    "score": round(score, 1),
                    "pronunciation": w.get("pronunciation", ""),
                    "phonemes": w.get("phonemes", []),
                    "start": w.get("start", 0),
                    "end": w.get("end", 0),
                    "duration": round(w.get("end", 0) - w.get("start", 0), 3),
                }
            )
        return word_scores, total_confidence, word_count

    async def assess(self, pcm_data: bytes, sample_rate: int = 16000, text: str | None = None) -> dict[str, Any]:
        t0 = time.monotonic()
        logger.info("Bắt đầu pipeline đánh giá phát âm", extra={"pcm_bytes": len(pcm_data)})

        loop = asyncio.get_running_loop()
        if text is None:
            text, words_meta = await loop.run_in_executor(self.executor, transcribe_whisper, pcm_data, sample_rate)
        else:
            _, words_meta = await loop.run_in_executor(self.executor, transcribe_whisper, pcm_data, sample_rate)

        elapsed = round(time.monotonic() - t0, 2)
        logger.info("Whisper hoàn tất", extra={"text_len": len(text), "elapsed_s": elapsed})

        if not text:
            return {
                "text": "",
                "scores": {"overall": 0},
                "needs_remediation": False,
                "words": [],
                "aligned_phonemes": [],
                "timing": {"transcribe_s": elapsed, "total_s": elapsed},
            }

        for w in words_meta:
            word_lower = w["word"].lower().strip(".,!?;:")
            phones = self.dictionary.lookup(word_lower)
            w["phonemes"] = phones
            w["pronunciation"] = " ".join(phones) if phones else ""

        word_scores, total_confidence, word_count = self.compute_word_scores(words_meta)
        overall = round(total_confidence / max(word_count, 1), 1)
        needs_remediation = overall < 70
        total_elapsed = round(time.monotonic() - t0, 2)
        logger.info(
            "Kết thúc pipeline đánh giá phát âm",
            extra={
                "overall_score": overall,
                "needs_remediation": needs_remediation,
                "words_assessed": word_count,
                "total_s": total_elapsed,
                "transcribe_s": elapsed,
            },
        )

        return {
            "text": text,
            "scores": {"overall": overall},
            "needs_remediation": needs_remediation,
            "words": word_scores,
            "aligned_phonemes": [],
            "timing": {
                "transcribe_s": elapsed,
                "total_s": total_elapsed,
            },
        }
