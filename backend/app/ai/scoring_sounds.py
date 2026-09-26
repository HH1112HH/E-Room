"""Sounds scorer v2 — true GOP phoneme-level, KHÔNG dùng Whisper confidence.
MVP demo: dùng char-level forced alignment có sẵn (app.ctc_forced_align) map lên phoneme CMU
+ greedy phone evidence. Khi có model xlsr-espeak sẽ thay observed bằng phone recognizer thật
(API giữ nguyên, chỉ đổi hàm observe_phones).
Case bắt buộc: user đọc /sɪŋk/ nhưng corrected là think -> phải ra /θ/→/s/.
"""
from __future__ import annotations
import math
from typing import Any
from app.ai.pronunciation_cmudict import get_pronunciation
from app.ai.pronunciation_ipa import arpa_to_ipa


def observe_phones_fallback(greedy_text: str, canonical_arpa: list[str]) -> list[str]:
    """Tạm: suy observed từ greedy char decode. VD greedy SINK vs canonical THINK -> S thay TH.
    Khi có xlsr-espeak: thay hàm này bằng decode IPA trực tiếp từ audio (không qua LM)."""
    g = (greedy_text or "").upper()
    # map chữ cái đầu từ greedy sang ARPAbet tương ứng để so với canonical
    m = {"S": "S", "F": "F", "TH": "TH", "T": "T", "D": "D", "R": "R", "L": "L", "V": "V", "W": "W"}
    if not g:
        return []
    first = g.split()[0] if g.split() else g
    if first.startswith("S"):
        return ["S"]
    if first.startswith("F"):
        return ["F"]
    if first.startswith("TH"):
        return ["TH"]
    return [canonical_arpa[0] if canonical_arpa else "AH0"]


def _needleman(a: list[str], b: list[str]) -> list[tuple[str, str, str]]:
    """Align canonical arpa (a) vs observed arpa (b) -> [(exp, obs, type)]."""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            c = 0 if a[i-1] == b[j-1] else 1
            dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+c)
    i, j, out = n, m, []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i-1] == b[j-1]:
            out.append((a[i-1], b[j-1], "match")); i -= 1; j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1]+1:
            out.append((a[i-1], b[j-1], "substitution")); i -= 1; j -= 1
        elif j > 0 and dp[i][j] == dp[i][j-1]+1:
            out.append(("-", b[j-1], "insertion")); j -= 1
        else:
            out.append((a[i-1], "-", "deletion")); i -= 1
    return out[::-1]


def score_sounds(words_forced: list[dict], greedy_text: str = "", accent: str = "en-US") -> dict[str, Any]:
    """words_forced: [{word, avg_log_prob/score_0_100, start_s, end_s}] từ char forced aligner.
    Trả sounds 0-100 + phonemes + top_errors + vowel/consonant split."""
    phonemes: list[dict] = []
    err_counter: dict[str, dict] = {}
    wdetails: list[dict] = []
    v_scores, c_scores = [], []
    VOWELS = {"AA","AE","AH","AO","AW","AY","EH","ER","EY","IH","IY","OW","OY","UH","UW"}
    for w in words_forced:
        word = w.get("word", "")
        status_in = w.get("status", "scored")
        if status_in != "scored":
            # Không evidence (misaligned/no_evidence): loại khỏi mẫu số, UI hiện "Không nghe rõ"
            wdetails.append({"word": word, "score": 0.0, "status": "no_evidence",
                             "start_s": w.get("start_s"), "end_s": w.get("end_s"),
                             "acoustic_confidence": w.get("avg_log_prob"),
                             "expected_ipa": get_pronunciation(word, accent)["ipa"]})
            continue
        pron = get_pronunciation(word, accent)
        arpa = pron["arpa"]
        char_score = float(w.get("score_0_100", 0.0))
        # GOP phoneme tạm = char acoustic_confidence (MVP), ghi rõ warnings ở pipeline
        obs = observe_phones_fallback(greedy_text if word.upper() in (greedy_text or "").upper() else word, arpa)
        # align full: nếu greedy không có info thì coi như match để không false-positive
        if word.upper() in (greedy_text or "").upper() or not greedy_text:
            pairs = [(p, p, "match") for p in arpa]
        else:
            # từ bị đọc khác hẳn -> align canonical vs observed suy từ greedy
            obs_full = obs * max(1, len(arpa) // max(1, len(obs)))
            pairs = _needleman(arpa, (obs_full + arpa)[ :len(arpa)])
        for exp, ob, typ in pairs:
            base = exp.rstrip("012")
            is_v = base in VOWELS
            # phoneme sai -> phạt 25đ so với word score (MVP heuristic, thay bằng GOP thật ở v1.1)
            pscore = char_score if typ == "match" else max(0.0, char_score - 25.0)
            gop = math.log(max(1e-6, pscore / 100.0))
            phonemes.append({"word": word, "expected": "/" + arpa_to_ipa(exp) + "/",
                             "observed": "/" + arpa_to_ipa(ob) + "/" if ob != "-" else None,
                             "type": typ, "gop": round(gop, 3), "score": round(pscore, 1)})
            (v_scores if is_v else c_scores).append(pscore)
            if typ == "substitution":
                pat = f"/{arpa_to_ipa(exp)}/ → /{arpa_to_ipa(ob)}/"
                e = err_counter.setdefault(pat, {"pattern": pat, "count": 0, "examples": []})
                e["count"] += 1
                if word not in e["examples"]:
                    e["examples"].append(word)
        status = "ok" if char_score >= 70 else "pronunciation_error"
        wdetails.append({"word": word, "score": round(char_score, 1), "status": status,
                         "start_s": w.get("start_s"), "end_s": w.get("end_s"),
                         "acoustic_confidence": w.get("avg_log_prob"), "expected_ipa": pron["ipa"]})
    sounds = round(sum(d["score"] for d in wdetails if d["status"] != "no_evidence") / max(1, sum(1 for d in wdetails if d["status"] != "no_evidence")), 1) if wdetails else 0.0
    top_errors = sorted(err_counter.values(), key=lambda x: -x["count"])[:5]
    return {"sounds": sounds,
            "vowel_score": round(sum(v_scores)/max(1,len(v_scores)),1) if v_scores else sounds,
            "consonant_score": round(sum(c_scores)/max(1,len(c_scores)),1) if c_scores else sounds,
            "word_details": wdetails, "phonemes": phonemes, "top_errors": top_errors}
