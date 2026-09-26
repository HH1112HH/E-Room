"""Pipeline v2: audio + whisper_raw + user_corrected + accent -> ScoringReport.
Trái tim scorer. Deterministic. Nemotron KHÔNG được gọi ở đây."""
from __future__ import annotations
import time
from typing import Any
import numpy as np


def score_attempt_v2(wav: np.ndarray, sr: int, whisper_raw: str, user_corrected: str,
                     mode: str = "free_speaking", original_text: str | None = None,
                     accent: str = "en-US", whisper_segments: list[dict] | None = None,
                     char_words: list[dict] | None = None, greedy_text: str = "") -> dict:
    """char_words: output words từ app.score_utterance (forced aligner char-level, nguồn span thật).
    Nếu None, pipeline tự chạy? MVP: caller (app.py) truyền vào để tái dùng model đã load."""
    from app.ai.speaking_alignment import align_transcripts, apply_forced_spans
    from app.ai.scoring_sounds import score_sounds
    from app.ai.scoring_stress import score_stress
    from app.ai.scoring_metrics import score_fluency, score_completeness, calculate_overall
    from app.ai.speech_audio import vad_segments, extract_f0

    t0 = time.time()
    warnings: list[str] = []
    if not (user_corrected or "").strip():
        return {"error": "user_corrected rỗng — hãy sửa transcript trước khi chấm."}
    aligned = align_transcripts(whisper_raw, user_corrected, whisper_segments)
    if char_words:
        aligned = apply_forced_spans(aligned, char_words)
    else:
        warnings.append("missing forced aligner spans — stress/sounds dùng whisper hint, độ tin cậy thấp")

    snd = None
    gop_model = None
    try:
        from app.ai.scoring_phoneme_gop import score_phones
        ph = score_phones(wav, sr, user_corrected, accent)
        if "error" not in ph:
            snd = {"sounds": ph["sounds"], "word_details": ph["word_details"],
                   "phonemes": ph["phonemes"], "top_errors": ph["top_errors"]}
            gop_model = ph.get("model")
    except Exception as e:
        warnings.append(f"phoneme GOP failed ({str(e)[:120]}), fallback char-level acoustic")
    if snd is None:
        # Fallback char-level: KHÔNG gọi là GOP, chỉ là acoustic likelihood.
        snd = score_sounds(char_words or [], greedy_text=greedy_text or whisper_raw, accent=accent)
        warnings.append("diem Sounds hien tai la char-level acoustic likelihood, KHONG phai GOP chuan")
    st = score_stress(snd.get("word_details") or char_words or [], wav, sr, accent)
    segs, pauses = vad_segments(wav, sr)
    fl = score_fluency(len(wav)/sr, len([w for w in aligned if w["alignment"] != "deletion"]),
                       pauses, whisper_raw)
    cp = score_completeness(original_text, user_corrected, mode)
    f0 = extract_f0(wav, sr)
    monotone = f0["std_f0"] < 15 and f0["voiced_ratio"] > 0.1
    overall = calculate_overall(snd["sounds"], st["stress"], fl["score"], cp["score"])
    _details = snd["word_details"]
    _no_ev = sum(1 for d in _details if d.get("status") == "no_evidence")
    return {
        "scores": {"sounds": snd["sounds"], "stress": st["stress"], "fluency": fl["score"],
                   "completeness": cp["score"], "intonation": None, "overall": overall},
        "texts": {"original": original_text, "whisper_raw": whisper_raw, "user_corrected": user_corrected},
        "reference": {"accent": accent, "voice_id": "af_heart"},
        "word_details": snd["word_details"], "phonemes": snd["phonemes"],
        "stress_detail": st["details"],
        "intonation": {"median_f0": f0["median_f0"], "std_f0": f0["std_f0"], "range_f0": f0["range_f0"],
                       "final_slope": f0["final_slope"], "monotone": monotone,
                       "note": "MVP: monotone detection only, DTW vs Kokoro deferred to v1.1"},
        "fluency": {**fl}, "completeness": cp, "top_errors": snd["top_errors"],
        "alignment": aligned, "speech_segments": segs,
        "scorer_version": "scorer-v2-mvp",
        "gop_model": gop_model,
        "n_scored": len(_details) - _no_ev,
        "n_no_evidence": _no_ev,
        "warnings": warnings,
        "compute_s": round(time.time() - t0, 2),
    }
