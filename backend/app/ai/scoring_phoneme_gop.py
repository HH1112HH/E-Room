"""Phoneme-level GOP thật (theo tư vấn chuyên gia).

Model: facebook/wav2vec2-xlsr-53-espeak-cv-ft (Wav2Vec2ForCTC trên phone espeak).
- KHÔNG dùng tokenizer của transformers (nó đòi binary espeak) — đọc thẳng
  vocab.json trong HF cache, tokenize thủ công.
- user_corrected -> CMUdict (full) -> ARPAbet -> espeak phones.
- 1 pass forced alignment (Viterbi, tái dùng app.ctc_forced_align) trên full audio.
- GOP(phone) = mean log-posterior trên các frame align vào phone đó (Witt & Young).
- Observed phones = greedy decode phone model (free phone recognition, không LM)
  -> align Needleman canonical vs observed -> substitution thật (/th/->/s/).
- Char-level cũ KHÔNG được gọi là GOP nữa — chỉ còn dùng làm fallback khi
  model phoneme chưa tải được (ghi rõ trong warnings).
"""
from __future__ import annotations
import glob
import json
import math
import os
import threading
from pathlib import Path
from typing import Any

def _model_id() -> str:
    try:
        from app.config import settings

        return settings.phoneme_model_id or "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
    except Exception:
        return os.getenv("PHONEME_MODEL_ID", "facebook/wav2vec2-xlsr-53-espeak-cv-ft")


MODEL_ID = _model_id()
FRAME_STRIDE_S = 0.02
BLANK_RATIO_MISALIGNED = 0.70

# ARPAbet (đã strip số stress) -> espeak phone token. Mọi token đều có trong vocab.
ARPA_TO_ESPEAK: dict[str, tuple[str, ...]] = {
    "AA": ("ɑ",), "AE": ("æ",), "AH": ("ʌ",), "AO": ("ɔ",),
    "AW": ("aʊ",), "AY": ("aɪ",),
    "EH": ("ɛ",), "ER": ("ɜ", "ɹ"), "EY": ("eɪ",),
    "IH": ("ɪ",), "IY": ("i",),
    "OW": ("oʊ",), "OY": ("ɔɪ",), "UH": ("ʊ",), "UW": ("u",),
    "P": ("p",), "B": ("b",), "T": ("t",), "D": ("d",),
    "K": ("k",), "G": ("ɡ",),
    "F": ("f",), "V": ("v",), "TH": ("θ",), "DH": ("ð",),
    "S": ("s",), "Z": ("z",), "SH": ("ʃ",), "ZH": ("ʒ",),
    "HH": ("h",), "M": ("m",), "N": ("n",), "NG": ("ŋ",),
    "L": ("l",), "R": ("ɹ",), "W": ("w",), "Y": ("j",),
    "CH": ("tʃ",), "JH": ("dʒ",),
}

_lock = threading.Lock()
_fe = None
_pmodel = None
_vocab: dict[str, int] | None = None
_torch = None


def _load_torch():
    global _torch
    if _torch is None:
        import torch
        _torch = torch
    return _torch


def _load_vocab() -> dict[str, int]:
    global _vocab
    if _vocab is not None:
        return _vocab
    pats = [
        str(Path.home() / ".cache" / "huggingface" / "hub" /
            ("models--" + MODEL_ID.replace("/", "--")) / "snapshots" / "*" / "vocab.json"),
    ]
    found = []
    for p in pats:
        found.extend(glob.glob(p))
    if not found:
        # ép download vocab (nhẹ, vài KB)
        from huggingface_hub import hf_hub_download
        fp = hf_hub_download(MODEL_ID, "vocab.json")
        found = [fp]
    with open(found[0], encoding="utf-8") as f:
        _vocab = json.load(f)
    return _vocab


def get_phone_model():
    """Lazy-load feature extractor + phone CTC model (1 lần). Nặng ~1.2GB lần đầu."""
    global _fe, _pmodel
    if _pmodel is not None:
        return _fe, _pmodel
    with _lock:
        if _pmodel is not None:
            return _fe, _pmodel
        torch = _load_torch()
        from transformers import AutoFeatureExtractor, Wav2Vec2ForCTC
        _fe = AutoFeatureExtractor.from_pretrained(MODEL_ID)
        _pmodel = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)
        _pmodel.eval()
        if torch.cuda.is_available():
            _pmodel.to("cuda")
        _load_vocab()
    return _fe, _pmodel


def arpa_to_espeak(arpa: list[str]) -> tuple[list[str], list[int]]:
    """ARPAbet (kèm số stress) -> (espeak tokens, phone->arpa index). Bỏ token lạ."""
    vocab = _load_vocab()
    toks: list[str] = []
    back: list[int] = []
    for i, ph in enumerate(arpa):
        base = ph.rstrip("012")
        for t in ARPA_TO_ESPEAK.get(base, ()):
            if t in vocab:
                toks.append(t)
                back.append(i)
    return toks, back


def _needleman(a: list[str], b: list[str]) -> list[tuple[str, str, str]]:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            c = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c)
    i, j, out = n, m, []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1]:
            out.append((a[i - 1], b[j - 1], "match")); i -= 1; j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            out.append((a[i - 1], b[j - 1], "substitution")); i -= 1; j -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            out.append(("-", b[j - 1], "insertion")); j -= 1
        else:
            out.append((a[i - 1], "-", "deletion")); i -= 1
    return out[::-1]


def score_phones(wav, sr: int, text: str, accent: str = "en-US") -> dict[str, Any]:
    """Full pipeline phoneme GOP. Trả word_details/phonemes/top_errors/sounds cùng schema sounds.py."""
    import re
    import numpy as np
    from app.ai.pronunciation_cmudict import get_pronunciation
    from app.ai.scoring_ctc import ctc_forced_align

    torch = _load_torch()
    fe, model = get_phone_model()
    vocab = _load_vocab()
    device = next(model.parameters()).device
    blank_id = 0  # <pad>

    words = [w for w in re.findall(r"[A-Za-z']+", text)]
    if not words:
        return {"error": "Text rỗng."}

    # canonical phone sequence + word ranges
    seq: list[str] = []
    wranges: list[tuple[int, int, str, list[str]]] = []  # (p_start, p_end, word, arpa)
    skipped_words: list[str] = []
    for w in words:
        pron = get_pronunciation(w, accent)
        toks, _ = arpa_to_espeak(pron["arpa"])
        if not toks:
            skipped_words.append(w)
            continue
        s0 = len(seq)
        seq.extend(toks)
        wranges.append((s0, len(seq), w, pron["arpa"]))
    if not seq:
        return {"error": "Không map được phoneme nào."}
    target_ids = [vocab[t] for t in seq]

    warr = np.asarray(wav, dtype=np.float32).reshape(-1)
    inputs = fe(warr, sampling_rate=16000, return_tensors="pt", padding=True)
    with torch.no_grad():
        logits = model(inputs.input_values.to(device)).logits[0].cpu()
    log_probs = torch.log_softmax(logits, dim=-1)
    T = log_probs.shape[0]
    pred_ids: list[int] = torch.argmax(logits, dim=-1).tolist()

    align, _ = ctc_forced_align(log_probs, target_ids, blank_id)

    # per-phone GOP
    L = len(target_ids)
    phone_lp: list[float] = []
    phone_span: list[tuple[int, int]] = []
    phone_ok: list[bool] = []
    for i, tid in enumerate(target_ids):
        s = 2 * i + 1
        frames = [t for t in range(T) if align[t] == s]
        if frames:
            vals = [float(log_probs[t, tid]) for t in frames]
            phone_lp.append(sum(vals) / len(vals))
            phone_span.append((frames[0], frames[-1]))
            phone_ok.append(True)
        else:
            phone_lp.append(float("-inf"))
            phone_span.append((-1, -1))
            phone_ok.append(False)

    # observed phones: free recognition (greedy collapse, không LM)
    id2tok = {i: t for t, i in vocab.items()}
    collapsed, prev = [], None
    for pid in pred_ids:
        if pid != prev:
            if pid != blank_id:
                collapsed.append(id2tok.get(pid, ""))
        prev = pid
    observed = [t for t in collapsed if t]

    phonemes: list[dict] = []
    wdetails: list[dict] = []
    err_counter: dict[str, dict] = {}
    for (p0, p1, w, arpa) in wranges:
        canon = seq[p0:p1]
        # observed evidence: align needleman toàn câu quá nặng -> so trong vùng từ:
        # xấp xỉ bằng greedy phones gần span thời gian của từ (MVP trung thực)
        f0 = phone_span[p0][0] if phone_ok[p0] else -1
        f1 = phone_span[p1 - 1][1] if phone_ok[p1 - 1] else -1
        if f0 >= 0:
            span_pred = [id2tok.get(p, "") for p in pred_ids[f0:f1 + 1] if p != blank_id]
            # collapse
            obs_w, pv = [], None
            for t in span_pred:
                if t != pv:
                    obs_w.append(t)
                pv = t
        else:
            obs_w = []
        pairs = _needleman(canon, obs_w)
        # blank density trên word span
        if f0 >= 0:
            tot = f1 - f0 + 1
            n_blank = sum(1 for t in range(f0, f1 + 1) if pred_ids[t] == blank_id)
            blank_ratio = n_blank / max(1, tot)
        else:
            blank_ratio = 1.0
        has_frames = any(phone_ok[p0:p1])
        if not has_frames:
            status = "no_evidence"
        elif blank_ratio > BLANK_RATIO_MISALIGNED:
            status = "misaligned"
        else:
            status = "scored"
        pscores: list[float] = []
        for (exp, ob, typ), pi in zip(pairs, range(p0, p1)):
            # GOP: mean log-posterior; no_evidence -> -inf
            g = phone_lp[pi] if phone_ok[pi] else float("-inf")
            s100 = round(max(0.0, min(100.0, math.exp(max(g, -10.0)) * 100.0)), 1) if math.isfinite(g) else 0.0
            if status == "scored":
                pscores.append(s100)
            disp_ob = ob if ob != "-" else None
            phonemes.append({"word": w, "expected": exp, "observed": disp_ob,
                             "type": typ, "gop": round(g, 3) if math.isfinite(g) else None,
                             "score": s100 if status == "scored" else 0.0})
            if typ == "substitution" and status == "scored":
                pat = f"/{exp}/ -> /{ob}/"
                e = err_counter.setdefault(pat, {"pattern": pat, "count": 0, "examples": []})
                e["count"] += 1
                if w not in e["examples"]:
                    e["examples"].append(w)
        wscore = round(sum(pscores) / len(pscores), 1) if pscores else 0.0
        pron = get_pronunciation(w, accent)
        wdetails.append({"word": w, "score": wscore,
                         "status": "ok" if status == "scored" else "no_evidence",
                         "start_s": round(f0 * FRAME_STRIDE_S, 2) if f0 >= 0 else 0.0,
                         "end_s": round((f1 + 1) * FRAME_STRIDE_S, 2) if f1 >= 0 else 0.0,
                         "acoustic_confidence": None, "expected_ipa": pron["ipa"],
                         "blank_ratio": round(blank_ratio, 3)})
    for w in skipped_words:
        wdetails.append({"word": w, "score": 0.0, "status": "no_evidence",
                         "start_s": 0.0, "end_s": 0.0, "acoustic_confidence": None,
                         "expected_ipa": "", "blank_ratio": 1.0})
    ok_w = [d for d in wdetails if d["status"] == "ok"]
    sounds = round(sum(d["score"] for d in ok_w) / len(ok_w), 1) if ok_w else 0.0
    # vowel/consonant split theo ARPAbet gốc
    return {"sounds": sounds, "word_details": wdetails, "phonemes": phonemes,
            "top_errors": sorted(err_counter.values(), key=lambda x: -x["count"])[:5],
            "model": MODEL_ID, "n_scored": len(ok_w),
            "n_no_evidence": len(wdetails) - len(ok_w)}
