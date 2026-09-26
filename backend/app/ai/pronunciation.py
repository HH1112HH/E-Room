"""Hook chấm điểm phát âm cho E-Room — ruột scorer 4 tiêu chí nằm trong backend.

Thứ tự thử: local pipeline (máy chạy backend gánh compute) -> Pronun service
qua PRONUN_BASE_URL (máy AI) -> heuristic. Interface `score_pronunciation`
không đổi nên caller (speech.py) không phải sửa gì.
"""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.log import get_logger

log = get_logger("app.ai.pronunciation")

# Cổng chấm local: serialize inference wav2vec2/XLSR để máy host web không
# quá tải khi 3-4 người bấm chấm cùng lúc (model đã cache, chỉ inference
# là nặng — xem app/scoring/ctc.py + phoneme_gop.py). Rescore endpoint là
# sync def (chạy trong worker thread) nên threading.Semaphore là đủ, không
# cần Celery cho tới khi tải cao hơn (lúc đó offload qua PRONUN_BASE_URL).
_scoring_gate = threading.Semaphore(max(1, settings.scoring_max_parallel))


def heuristic_score(
    confidence: float = 1.0,
    avg_logprob: float = 0.0,
    duration: float = 0.0,
    words_count: int = 0,
) -> Dict[str, Any]:
    """Chấm tạm 0-100 từ tín hiệu STT sẵn có."""
    conf_part = max(0.0, min(1.0, confidence)) * 60.0
    # avg_logprob thường nằm [-2, 0]; map về 0-25 điểm
    logprob_norm = max(0.0, min(1.0, (avg_logprob + 2.0) / 2.0))
    fluency = 0.0
    if duration > 0 and words_count > 0:
        wpm = (words_count / duration) * 60.0
        # 90-170 wpm là vùng tự nhiên cho speaking practice
        if 90 <= wpm <= 170:
            fluency = 15.0
        elif 60 <= wpm < 90 or 170 < wpm <= 210:
            fluency = 10.0
        else:
            fluency = 5.0
    score = round(conf_part + logprob_norm * 25.0 + fluency, 1)
    return {
        "score": min(100.0, score),
        "method": "heuristic-v1",
        "wav2vec_ready": False,
        "details": {
            "confidence": confidence,
            "avg_logprob": avg_logprob,
            "duration": duration,
            "words_count": words_count,
        },
    }


def _report_to_hook(report: Dict[str, Any], method: str) -> Dict[str, Any]:
    scores = report.get("scores", {})
    return {
        "score": float(scores.get("overall", 0.0)),
        "method": method,
        "wav2vec_ready": True,
        "scorer_version": report.get("scorer_version", ""),
        "gop_model": report.get("gop_model", ""),
        "details": {
            "sounds": scores.get("sounds"),
            "stress": scores.get("stress"),
            "fluency": scores.get("fluency"),
            "completeness": scores.get("completeness"),
            "n_scored": report.get("n_scored"),
            "n_no_evidence": report.get("n_no_evidence"),
            "duration_s": report.get("duration_s"),
            "top_errors": report.get("top_errors", []),
            "warnings": report.get("warnings", []),
        },
        "report": report,
    }


def score_local(
    audio_path: Path | str,
    reference_text: str,
    language: str = "en",
) -> Dict[str, Any]:
    """Chấm bằng ruột scorer trong backend (app/scoring): full-audio 1 pass,
    phoneme GOP + 4 tiêu chí. Raise khi model/audio lỗi.

    Xếp hàng qua _scoring_gate: lượt chấm sau đợi lượt trước xong (tuần tự
    theo SCORING_MAX_PARALLEL) thay vì forward song song gây OOM."""
    from app.ai.scoring_ctc import score_utterance
    from app.ai.scoring_pipeline import score_attempt_v2
    from app.ai.speech_audio import load_wav_16k

    raw = Path(audio_path).read_bytes()
    if len(raw) > 100 * 1024 * 1024:
        raise ValueError("Audio > 100MB.")
    queued_at = time.monotonic()
    with _scoring_gate:
        waited = time.monotonic() - queued_at
        if waited > 1.0:
            log.info("scoring queued %.1fs (nhieu nguoi cham cung luc)", waited)
        wav, sr = load_wav_16k(raw)
        r = score_utterance(wav, int(sr), reference_text)
        if "error" in r and "words" not in r:
            raise RuntimeError(f"local scorer: {r.get('error')}")
        report = score_attempt_v2(
            wav, sr, "", reference_text, "free_speaking", None, "en-US",
            None, r.get("words", []), r.get("greedy_decoded", ""),
        )
    if "error" in report and "scores" not in report:
        raise RuntimeError(f"local scorer: {report.get('error')}")
    return _report_to_hook(report, "local-v2")


def score_via_pronun_service(
    audio_path: Path | str,
    reference_text: str,
    language: str = "en",
) -> Dict[str, Any]:
    """Gọi Pronun scorer qua HTTP: POST {PRONUN_BASE_URL}/api/speaking/score.
    Raise khi chưa cấu hình hoặc scorer lỗi."""
    base = (settings.pronun_base_url or "").strip().rstrip("/")
    if not base:
        raise NotImplementedError(
            "PRONUN_BASE_URL chưa cấu hình — chấm local hoặc heuristic."
        )
    audio_bytes = Path(audio_path).read_bytes()
    if len(audio_bytes) > 100 * 1024 * 1024:
        raise ValueError("Audio > 100MB.")
    payload = {
        "whisper_raw": "",
        "user_corrected": reference_text,
        "mode": "free_speaking",
        "accent": "en-US" if (language or "en").lower().startswith("en") else "en-US",
    }
    with httpx.Client(timeout=settings.pronun_timeout) as client:
        resp = client.post(
            f"{base}/api/speaking/score",
            files={"audio": ("rec.wav", audio_bytes, "audio/wav")},
            data={"payload": json.dumps(payload)},
        )
        resp.raise_for_status()
        report = resp.json()
    if "error" in report and "scores" not in report:
        raise RuntimeError(f"pronun scorer: {report.get('error')}")
    return _report_to_hook(report, "pronun-v2")


def score_with_wav2vec2(
    audio_path: Path | str,
    reference_text: str,
    language: str = "en",
) -> Dict[str, Any]:
    """Local trước, remote sau. Raise để caller fallback heuristic."""
    try:
        return score_local(audio_path, reference_text, language)
    except Exception as error:
        log.warning("local scoring failed (%s), thử pronun service", error)
    return score_via_pronun_service(audio_path, reference_text, language)


def request_pronun_feedback(
    scoring_report: Dict[str, Any],
    api_key: str = "",
    model: str = "",
    temperature: float = 0.6,
    max_tokens: int = 1200,
    system_prompt: str = "",
    user_label: str = "scoring_report",
) -> Dict[str, Any]:
    """Xin nhận xét Nemotron: local (app/llm) trước, Pronun service sau.
    Chỉ gửi ScoringReport (không audio, không tự tính điểm — đúng luật đã khóa).
    system_prompt != "" cho phép caller (vd session feedback) dùng prompt gọn
    chuyên biệt thay vì prompt mặc định. Raise khi cả hai đều lỗi."""
    import asyncio

    from app.ai.nemotron_client import generate_feedback

    try:
        out = asyncio.run(generate_feedback(
            scoring_report, api_key, model, temperature, max_tokens, system_prompt, user_label,
        ))
    except Exception as error:
        out = {"error": f"local feedback: {error}"}
    if "error" not in out:
        return out
    local_err = out["error"]
    base = (settings.pronun_base_url or "").strip().rstrip("/")
    if not base:
        raise RuntimeError(local_err)
    with httpx.Client(timeout=settings.pronun_timeout) as client:
        resp = client.post(
            f"{base}/api/speaking/feedback",
            json={
                "scoring_report": scoring_report,
                "api_key": api_key,
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        return resp.json()


def score_pronunciation(
    audio_path: Optional[Path | str] = None,
    reference_text: str = "",
    language: str = "en",
    confidence: float = 1.0,
    avg_logprob: float = 0.0,
    duration: float = 0.0,
    words: Optional[List[Dict[str, Any]]] = None,
    prefer_wav2vec: bool = True,
) -> Dict[str, Any]:
    """Entry-point duy nhất caller cần gọi.

    Thử local scorer -> pronun service (nếu có audio + text), fallback heuristic.
    Không bao giờ raise — luôn trả dict score.
    """
    words = words or []
    if prefer_wav2vec and audio_path and reference_text.strip():
        try:
            path = Path(audio_path)
            if path.exists():
                return score_with_wav2vec2(path, reference_text, language)
        except NotImplementedError:
            pass
        except Exception as error:
            log.warning("wav2vec2 scoring failed, fallback heuristic | err=%s", error)
    return heuristic_score(
        confidence=confidence,
        avg_logprob=avg_logprob,
        duration=duration,
        words_count=len(words),
    )
