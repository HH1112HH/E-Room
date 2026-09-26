"""Nemotron client — CHỈ nhận ScoringReport, không nhận audio, không tính lại điểm."""
from __future__ import annotations
import os
import httpx

SYSTEM_PROMPT = """You are an English speaking coach.
You receive one JSON object called scoring_report.
The numeric scores were calculated by a deterministic speech-scoring system.
Your job is only to explain the results and provide actionable learning feedback.
Rules:
1. Never change numeric scores.
2. Never recalculate numeric scores.
3. Never invent an error that does not exist in scoring_report.
4. user_corrected is the user's intended text.
5. whisper_raw is ASR evidence, not ground truth.
6. expected_ipa and observed_ipa are the pronunciation evidence.
7. Mention the exact word when a word-level error is available.
8. Mention the exact phoneme when available.
9. Treat low-confidence findings cautiously.
10. Prioritize the 2-3 most important problems.
11. Give practical exercises.
12. Return valid JSON with keys: summary, pronunciation_feedback, stress_feedback, intonation_feedback, fluency_feedback, priority_errors, practice_plan.
"""

# Prompt gọn cho "AI feedbacks" cấp session: chỉ mô tả PHẦN SAI, ngắn gọn.
SESSION_FEEDBACK_PROMPT = """You are an English pronunciation coach.
You receive one JSON object called session_scores: utterances the learner spoke in one session.
Each utterance has deterministic scores (overall, sounds/stress/fluency/completeness), per-word scores with IPA, and phoneme errors (expected -> observed).
Rules:
1. Never change numeric scores. Never invent an error not in the data.
2. Be concise: the whole feedback must fit in ~120 words.
3. ONLY describe errors: (a) words with missing evidence (swallowed endings, marked no_evidence), (b) mispronounced words with the exact phoneme pair expected -> observed.
4. For each of the top 2-3 errors give ONE concrete tip (tongue/lips/breath placement).
5. End with a practice plan of exactly 3 one-line steps.
Return valid JSON with keys: summary, error_words (list of {word, issue, tip}), practice_plan (list of 3 strings).
"""


async def generate_feedback(scoring_report: dict, api_key: str = "", model: str = "",
                            temperature: float = 0.6, max_tokens: int = 1200,
                            system_prompt: str = "", user_label: str = "scoring_report") -> dict:
    try:
        from app.config import settings

        cfg_key = settings.openrouter_api_key
        cfg_model = settings.nemotron_model
        cfg_base = settings.openrouter_base_url
    except Exception:
        cfg_key, cfg_model, cfg_base = "", "", ""
    key = (api_key or "").strip() or cfg_key or os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        return {"error": "Thiếu OpenRouter API key."}
    model = (model or "").strip() or cfg_model or os.getenv("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    base = (cfg_base or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")).rstrip("/")
    import json as _json
    user_msg = f"{user_label}:\n" + _json.dumps(scoring_report, ensure_ascii=False)[:12000]
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [{"role": "system", "content": system_prompt or SYSTEM_PROMPT},
                                               {"role": "user", "content": user_msg}],
                   "temperature": temperature, "max_tokens": max_tokens})
        if r.status_code >= 400:
            return {"error": f"OpenRouter {r.status_code}: {r.text[:500]}"}
        data = r.json()
        return {"feedback_raw": (data.get("choices") or [{}])[0].get("message", {}).get("content", ""),
                "model": model, "usage": data.get("usage", {})}
