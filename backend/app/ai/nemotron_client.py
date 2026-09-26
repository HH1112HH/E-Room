"""Nemotron client — CHỈ nhận ScoringReport, không nhận audio, không tính lại điểm.

Prompt nhận xét nằm ở app/ai/prompts/*.md (tận dụng loader load_prompt):
- feedback-pronunciation.md: nhận xét từng câu (POST .../speech-logs/{id}/feedback)
- feedback-session.md: "AI feedbacks" cấp session (POST /sessions/{id}/feedback)
Sửa prompt chỉ cần sửa file .md, không đụng code (lru_cache: restart API để nạp).
"""
from __future__ import annotations
import os
import httpx

from app.ai.prompt import load_prompt
from app.log import get_logger

log = get_logger("app.ai.nemotron")


def _load_feedback_prompt(name: str) -> str:
    text = load_prompt(name)
    if not text:
        log.warning("prompt feedback .md bi thieu/trong — Nemotron se chay prompt rong", name)
    return text


SYSTEM_PROMPT = _load_feedback_prompt("feedback-pronunciation")

# Prompt gọn cho "AI feedbacks" cấp session: chỉ mô tả PHẦN SAI, ngắn gọn.
SESSION_FEEDBACK_PROMPT = _load_feedback_prompt("feedback-session")


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
