"""Fluency + Completeness + Overall (MVP, deterministic)."""
from __future__ import annotations
import re


def _tok(t: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", (t or "").lower())


def score_fluency(duration_s: float, words_count: int, pauses: list[tuple[float,float]],
                  whisper_text: str = "") -> dict:
    wpm = (words_count / max(0.1, duration_s)) * 60.0 if duration_s > 0 else 0.0
    pause_dur = sum(e - s for s, e in pauses)
    pause_ratio = pause_dur / max(0.1, duration_s)
    long_pauses = sum(1 for s, e in pauses if e - s >= 0.4)
    low = (whisper_text or "").lower()
    hes = sum(low.count(x) for x in [" uh ", " um ", " er ", " ah "])
    # repetition: từ lặp liền nhau
    toks = _tok(whisper_text)
    rep = sum(1 for i in range(1, len(toks)) if toks[i] == toks[i-1])
    phones = sum(len(w) for w in toks)
    art = phones / max(0.1, duration_s - pause_dur)
    # rubric 0-100
    s = 100.0
    if 130 <= wpm <= 170: s -= 0
    elif 90 <= wpm < 130 or 170 < wpm <= 210: s -= 10
    else: s -= 25
    if pause_ratio > 0.35: s -= 20
    elif pause_ratio > 0.25: s -= 10
    s -= min(20, long_pauses * 5 + hes * 4 + rep * 5)
    return {"wpm": round(wpm,1), "articulation_rate": round(art,2), "pause_ratio": round(pause_ratio,3),
            "long_pause_count": long_pauses, "hesitation_count": hes, "repetition_count": rep,
            "score": round(max(0.0, min(100.0, s)),1)}


def score_completeness(original: str | None, corrected: str, mode: str) -> dict:
    if mode != "read_aloud" or not original:
        return {"mode": mode, "missing_words": [], "extra_words": [], "wer_vs_original": None, "score": 100.0}
    a, b = _tok(original), _tok(corrected)
    sa, sb = set(a), set(b)
    missing = [w for w in a if w not in sb]
    extra = [w for w in b if w not in sa]
    # WER đơn giản
    import difflib
    sm = difflib.SequenceMatcher(None, a, b)
    wer = round(1.0 - sm.ratio(), 3)
    score = round(max(0.0, 100.0 * (1.0 - (len(missing) + len(extra)) / max(1, len(a)))), 1)
    return {"mode": mode, "missing_words": missing[:20], "extra_words": extra[:20],
            "wer_vs_original": wer, "score": score}


def calculate_overall(sounds: float, stress: float, fluency: float, completeness: float) -> float:
    """MVP v2: 0.5*Sounds + 0.25*Stress + 0.15*Fluency + 0.10*Completeness. Intonation v1.1."""
    return round(0.5*sounds + 0.25*stress + 0.15*fluency + 0.10*completeness, 1)
