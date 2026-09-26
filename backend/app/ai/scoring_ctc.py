"""Char-level acoustic forced aligner (port từ demo/pronun-app/app.py).

Dùng cho: word spans (nguồn sự thật cho stress/fluency) + fallback acoustic
khi phoneme model chưa tải được. KHÔNG gọi output này là GOP.
Full-audio 1 pass, không chunk, không cắt 30s (CTC tự chèn blank).
"""
from __future__ import annotations

import re
import threading
from typing import Any

FRAME_STRIDE_S = 0.02  # wav2vec2 downsample 320x @16kHz ~= 20ms/frame
BLANK_RATIO_MISALIGNED = 0.70  # blank >70% word span -> misalignment, không phải lỗi phát âm

_model_lock = threading.Lock()
_processor = None
_acoustic_model = None
_torch = None


def _load_torch():
    global _torch
    if _torch is None:
        import torch  # noqa: WPS433

        _torch = torch
    return _torch


def _model_id() -> str:
    try:
        from app.config import settings

        return settings.wav2vec_model_id or "facebook/wav2vec2-base-960h"
    except Exception:
        return "facebook/wav2vec2-base-960h"


def get_acoustic_model():
    """Lazy-load wav2vec2 processor + model (thread-safe, load 1 lần)."""
    global _processor, _acoustic_model
    if _acoustic_model is not None:
        return _processor, _acoustic_model
    with _model_lock:
        if _acoustic_model is not None:
            return _processor, _acoustic_model
        torch = _load_torch()
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

        mid = _model_id()
        _processor = Wav2Vec2Processor.from_pretrained(mid)
        _acoustic_model = Wav2Vec2ForCTC.from_pretrained(mid)
        _acoustic_model.eval()
        if torch.cuda.is_available():
            _acoustic_model.to("cuda")
    return _processor, _acoustic_model


def normalize_reference(text: str, vocab: set[str]) -> str:
    t = (text or "").upper().strip()
    t = re.sub(r"\s+", " ", t)
    t = t.replace("-", " ")
    kept = "".join(ch for ch in t if ch in vocab or ch == " ")
    kept = re.sub(r"\s+", " ", kept).strip()
    return kept


def ctc_forced_align(log_probs, target_ids: list[int], blank_id: int):
    """Viterbi forced alignment CTC (vector hoá theo S).
    Extended: [b, t1, b, t2, b, ..., tL, b]. Ưu tiên stay > +1 > +2 khi hoà."""
    torch = _load_torch()
    T = log_probs.shape[0]
    L = len(target_ids)
    if L == 0 or T == 0:
        return [0] * T, float("-inf")
    ext = [blank_id]
    for tid in target_ids:
        ext.append(int(tid))
        ext.append(blank_id)
    S = len(ext)
    NEG = -1e9
    ext_t = torch.tensor(ext, dtype=torch.long)
    lp = log_probs[:, ext_t]  # [T, S]
    trellis = torch.full((T, S), NEG)
    choice = torch.zeros((T, S), dtype=torch.long)  # 0=stay, 1=+1, 2=+2
    trellis[0, 0] = lp[0, 0]
    if S > 1:
        trellis[0, 1] = lp[0, 1]
    skip_ok = torch.zeros(S, dtype=torch.bool)
    for s in range(2, S):
        if ext[s] != blank_id and ext[s] != ext[s - 2]:
            skip_ok[s] = True
    neg_col = torch.full((S,), NEG)
    for t in range(1, T):
        prev = trellis[t - 1]
        stay = prev
        plus1 = torch.cat([neg_col[:1], prev[:-1]])
        if skip_ok.any():
            plus2 = torch.cat([neg_col[:2], prev[:-2]])
            plus2 = torch.where(skip_ok, plus2, neg_col)
            cand = torch.stack([stay, plus1, plus2], dim=0)
        else:
            cand = torch.stack([stay, plus1], dim=0)
        best, idx = cand.max(dim=0)
        trellis[t] = best + lp[t]
        choice[t] = idx
    last = S - 1
    if S > 1 and trellis[T - 1, S - 2] > trellis[T - 1, S - 1]:
        last = S - 2
    align = [0] * T
    s = last
    for t in range(T - 1, -1, -1):
        align[t] = s
        if t > 0:
            c = int(choice[t, s])
            s = s if c == 0 else (s - 1 if c == 1 else s - 2)
    return align, float(trellis[T - 1, last])


def score_utterance(waveform_16k, sample_rate: int, reference_text: str) -> dict[str, Any]:
    """Char-level acoustic likelihood + word spans + alignment_status.
    KHÔNG cắt audio (chỉ chặn >10 phút). Từ no_evidence/misaligned loại khỏi overall."""
    torch = _load_torch()
    processor, model = get_acoustic_model()
    device = next(model.parameters()).device

    import numpy as np

    wav = np.asarray(waveform_16k, dtype=np.float32).reshape(-1)
    if sample_rate != 16000:
        try:
            import librosa

            wav = librosa.resample(wav, orig_sr=sample_rate, target_sr=16000).astype(np.float32)
        except Exception:
            ratio = 16000 / float(sample_rate)
            idx = (np.arange(int(len(wav) * ratio)) / ratio).astype(int)
            idx = np.clip(idx, 0, len(wav) - 1)
            wav = wav[idx]
        sample_rate = 16000

    duration_s = len(wav) / 16000.0
    if duration_s > 600:
        return {"error": "Audio dài quá 10 phút — hãy chia thành nhiều lần chấm.", "transcript_norm": ""}

    inputs = processor(wav, sampling_rate=16000, return_tensors="pt", padding=True)
    input_values = inputs.input_values.to(device)
    with torch.no_grad():
        logits = model(input_values).logits[0].cpu()  # [T, V]
    log_probs = torch.log_softmax(logits, dim=-1)
    T, V = log_probs.shape

    vocab = set(processor.tokenizer.get_vocab().keys())
    vocab.discard(processor.tokenizer.pad_token or "<pad>")
    vocab.discard(processor.tokenizer.unk_token or "<unk>")
    ref_norm = normalize_reference(reference_text, vocab | {"|", "'", " "})
    if not ref_norm:
        return {"error": "Câu rỗng hoặc không có ký tự hợp lệ (A-Z).", "transcript_norm": ""}

    ref_ctc = ref_norm.replace(" ", "|")
    target_ids = processor.tokenizer(ref_ctc).input_ids
    blank_id = model.config.pad_token_id if model.config.pad_token_id is not None else 0

    align, path_score = ctc_forced_align(log_probs, list(target_ids), int(blank_id))
    pred_ids: list[int] = torch.argmax(logits, dim=-1).tolist()

    L = len(target_ids)
    char_lp: list[float] = []
    char_span: list[tuple[int, int]] = []
    char_ok: list[bool] = []
    for i, tid in enumerate(target_ids):
        s = 2 * i + 1
        frames = [t for t in range(T) if align[t] == s]
        if frames:
            vals = [float(log_probs[t, int(tid)]) for t in frames]
            char_lp.append(sum(vals) / len(vals))
            char_span.append((frames[0], frames[-1]))
            char_ok.append(True)
        else:
            char_lp.append(-10.0)
            char_span.append((-1, -1))
            char_ok.append(False)

    words_out: list[dict[str, Any]] = []
    chars = list(ref_ctc)
    w, wi = "", []
    per_word_spans: list[list[int]] = []
    word_list: list[str] = []
    for ci, ch in enumerate(chars):
        if ch == "|":
            if w:
                word_list.append(w)
                per_word_spans.append(wi)
                w, wi = "", []
        else:
            w += ch
            wi.append(ci)
    if w:
        word_list.append(w)
        per_word_spans.append(wi)

    import math

    for wstr, idxs in zip(word_list, per_word_spans):
        lps = [char_lp[i] for i in idxs if 0 <= i < len(char_lp)]
        oks = [char_ok[i] for i in idxs if 0 <= i < len(char_ok)]
        starts = [char_span[i][0] for i in idxs if 0 <= i < len(char_span) and char_span[i][0] >= 0]
        ends = [char_span[i][1] for i in idxs if 0 <= i < len(char_span) and char_span[i][1] >= 0]
        if starts and ends:
            f0, f1 = min(starts), max(ends)
            span_frames = list(range(f0, f1 + 1))
            n_blank = sum(1 for t in span_frames if pred_ids[t] == blank_id)
            blank_ratio = n_blank / max(1, len(span_frames))
            start_s = round(f0 * FRAME_STRIDE_S, 2)
            end_s = round((f1 + 1) * FRAME_STRIDE_S, 2)
        else:
            blank_ratio, start_s, end_s = 1.0, 0.0, 0.0
        if not any(oks):
            status = "no_evidence"
        elif blank_ratio > BLANK_RATIO_MISALIGNED:
            status = "misaligned"
        else:
            status = "scored"
        if status == "scored":
            avg = sum(lps) / len(lps) if lps else -10.0
            prob = math.exp(max(avg, -10.0))
            score = round(max(0.0, min(100.0, prob * 100.0)), 1)
        else:
            avg = sum(lps) / len(lps) if lps else -10.0
            score = 0.0
        words_out.append(
            {
                "word": wstr,
                "avg_log_prob": round(avg, 4),
                "score_0_100": score,
                "status": status,
                "blank_ratio": round(blank_ratio, 3),
                "start_s": start_s,
                "end_s": end_s,
            }
        )

    scored = [x for x in words_out if x["status"] == "scored"]
    no_ev = [x for x in words_out if x["status"] != "scored"]
    if scored:
        overall = sum(x["score_0_100"] for x in scored) / len(scored)
        avg_lp_all = sum(x["avg_log_prob"] for x in scored) / len(scored)
    else:
        overall, avg_lp_all = 0.0, -10.0

    try:
        ctc = torch.nn.CTCLoss(blank=int(blank_id), zero_infinity=True)
        input_lengths = torch.tensor([T])
        target_lengths = torch.tensor([L])
        loss = float(ctc(log_probs.unsqueeze(1), torch.tensor([target_ids]), input_lengths, target_lengths))
    except Exception:
        loss = float("nan")

    try:
        vocab_list = [None] * len(processor.tokenizer)
        for tok, i in processor.tokenizer.get_vocab().items():
            if 0 <= i < len(vocab_list):
                vocab_list[i] = tok
        collapsed, prev = [], None
        for pid in pred_ids:
            if pid != prev:
                if pid != blank_id:
                    collapsed.append(vocab_list[pid] if vocab_list[pid] else "")
            prev = pid
        greedy = "".join(collapsed).replace("|", " ").strip()
    except Exception:
        greedy = ""

    level = "Xuat sac" if overall >= 85 else ("Tot" if overall >= 70 else ("Trung binh" if overall >= 50 else "Can luyen them"))

    return {
        "transcript_norm": ref_norm,
        "greedy_decoded": greedy,
        "overall_0_100": round(overall, 1),
        "overall_0_10": round(overall / 10.0, 2),
        "level": level,
        "avg_log_prob": round(float(avg_lp_all), 4),
        "ctc_loss": loss,
        "num_frames": T,
        "duration_s": round(duration_s, 2),
        "model": _model_id(),
        "n_scored": len(scored),
        "n_no_evidence": len(no_ev),
        "words": words_out,
    }
