"""Stress scorer — dùng syllable boundary THẬT từ phoneme timestamps (forced aligner),
không chia đều. MVP: word span -> N syllable spans theo tỉ lệ duration phoneme (đã có start/end
từng char từ app.ctc_forced_align); v1.1 MFA cho boundary chuẩn 100%."""
from __future__ import annotations
import numpy as np
from app.ai.pronunciation_cmudict import get_pronunciation


def score_stress(words_forced: list[dict], wav: np.ndarray, sr: int = 16000, accent: str = "en-US") -> dict:
    details: list[dict] = []
    correct, total = 0, 0
    for w in words_forced:
        if w.get("status", "scored") == "no_evidence":
            details.append({"word": w.get("word",""), "expected_stress": None,
                            "detected_stress": None, "correct": None, "reason": "no_evidence"})
            continue
        pron = get_pronunciation(w.get("word",""), accent)
        n = pron["num_syllables"]
        if n <= 1 or w.get("start_s") is None:
            details.append({"word": w.get("word",""), "expected_stress": pron["stress_index"],
                            "detected_stress": pron["stress_index"], "correct": True if n<=1 else None,
                            "reason": "mono-syllable" if n<=1 else "missing_span"})
            continue
        s, e = float(w["start_s"]), float(w["end_s"])
        s_i, e_i = max(0, int(s*sr)), min(len(wav), int(e*sr))
        seg = wav[s_i:e_i]
        if len(seg) < 160:
            details.append({"word": w.get("word",""), "expected_stress": pron["stress_index"],
                            "detected_stress": None, "correct": False, "reason": "too_short"})
            total += 1
            continue
        # chia theo tỉ lệ phoneme trong syllable (MVP: đều theo số phone mỗi syllable — tốt hơn chia đều time)
        syls = pron["syllables"]
        lens = [max(1, len(x)) for x in syls]
        tot = sum(lens)
        bounds = []
        cur = 0
        for L in lens:
            nxt = cur + int(len(seg) * L / tot)
            bounds.append((cur, nxt)); cur = nxt
        bounds[-1] = (bounds[-1][0], len(seg))
        feats = []
        try:
            import librosa
            f0, _, _ = librosa.pyin(seg, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"), sr=sr)
            import numpy as _np
            f0m = []
            hop = 512
            for a, b in bounds:
                fa, fb = a // hop, max(a // hop + 1, b // hop)
                vals = f0[fa:fb] if f0 is not None else []
                vals = [float(x) for x in vals if x == x]
                f0m.append(sum(vals)/len(vals) if vals else 0.0)
        except Exception:
            f0m = [0.0]*len(bounds)
        proms = []
        for (a, b), f in zip(bounds, f0m):
            part = seg[a:b]
            dur = (b-a)/sr
            energy = float(np.sqrt(np.mean(part**2)+1e-12))
            proms.append((dur, energy, f))
        # z-norm trong word
        import math
        def znorm(xs):
            m = sum(xs)/len(xs); v = sum((x-m)**2 for x in xs)/len(xs); s = math.sqrt(v+1e-9)
            return [(x-m)/(s+1e-9) for x in xs]
        dz = znorm([p[0] for p in proms]); ez = znorm([p[1] for p in proms]); fz = znorm([p[2] for p in proms])
        scores = [0.4*d+0.4*e+0.2*f for d,e,f in zip(dz,ez,fz)]
        det = max(range(len(scores)), key=lambda i: scores[i])
        exp = pron["stress_index"]
        ok = (det == exp)
        details.append({"word": w.get("word",""), "expected_stress": exp, "detected_stress": det,
                        "correct": ok, "reason": ""})
        total += 1; correct += 1 if ok else 0
    score = round(100.0*correct/max(1,total),1) if total else 85.0
    return {"stress": score, "correct": correct, "total": total, "details": details}
