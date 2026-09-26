"""Feedback LLM — nhận xét phát âm bằng LLM LOCAL (get_llm: llama.cpp server),
KHÔNG dùng Nemotron/OpenRouter nữa.

Prompt nằm ở app/ai/prompts/feedback.md (1 file duy nhất, 2 mục):
- ## utterance: nhận xét từng câu (POST .../speech-logs/{id}/feedback)
- ## session: "AI feedbacks" cấp session (POST /sessions/{id}/feedback)
Sửa prompt chỉ cần sửa file .md, không đụng code (lru_cache: restart API để nạp).

Luật giữ nguyên: CHỈ nhận điểm đã tính, không nhận audio, không tính lại điểm.
"""
from __future__ import annotations

import json as _json
from typing import Any, Dict

from app.ai.prompt import load_prompt
from app.log import get_logger

log = get_logger("app.ai.feedback_llm")


def _load_feedback_prompts() -> Dict[str, str]:
    """Cắt feedback.md theo dòng ## utterance / ## session."""
    out = {"utterance": "", "session": ""}
    text = load_prompt("feedback")
    if not text:
        log.warning("prompt feedback.md thieu/trong — feedback se chay prompt rong")
        return out
    current = None
    buf: list[str] = []
    for line in text.splitlines():
        head = line.strip().lower()
        if head == "## utterance":
            if current:
                out[current] = "\n".join(buf).strip()
            current, buf = "utterance", []
        elif head == "## session":
            if current:
                out[current] = "\n".join(buf).strip()
            current, buf = "session", []
        elif current:
            buf.append(line)
    if current:
        out[current] = "\n".join(buf).strip()
    if not out["utterance"] or not out["session"]:
        log.warning("feedback.md thieu muc ## utterance/## session")
    return out


_PROMPTS = _load_feedback_prompts()
SYSTEM_PROMPT = _PROMPTS["utterance"]
SESSION_FEEDBACK_PROMPT = _PROMPTS["session"]


def _extract_json(content: str) -> Dict[str, Any] | None:
    """LLM local tra JSON (co the kem text). Boc tach object JSON dau tien."""
    text = (content or "").strip()
    if not text:
        return None
    try:
        parsed = _json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except (TypeError, ValueError):
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = _json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except (TypeError, ValueError):
            return None
    return None


async def generate_feedback(scoring_report: dict, model: str = "",
                            temperature: float = 0.6, max_tokens: int = 1200,
                            system_prompt: str = "", user_label: str = "scoring_report") -> dict:
    """Gọi LLM local (llama.cpp qua get_llm). api_key giữ lại cho tương thích
    nhưng không dùng (local không cần key). Trả dict JSON nếu parse được,
    không thì {"feedback_raw": ...} — frontend render được cả hai."""
    from langchain_openai import ChatOpenAI

    from app.ai import reasoning_body
    from app.config import settings

    base_url = settings.llm_base_url
    user_msg = f"{user_label}:\n" + _json.dumps(scoring_report, ensure_ascii=False)[:12000]
    try:
        llm = ChatOpenAI(
            base_url=base_url,
            model=(model or "").strip() or settings.llm_model,
            api_key=settings.llm_api_key or "not-needed",
            timeout=settings.llm_call_timeout_seconds,
            temperature=temperature,
            max_tokens=max_tokens,
            extra_body=reasoning_body(base_url),
        )
        msg = await llm.ainvoke([
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ])
    except Exception as error:
        return {"error": f"LLM local lỗi ({base_url}): {error}"}
    content = getattr(msg, "content", "") or ""
    parsed = _extract_json(content if isinstance(content, str) else str(content))
    if parsed:
        parsed.setdefault("model", (model or "").strip() or settings.llm_model)
        return parsed
    return {"feedback_raw": content, "model": (model or "").strip() or settings.llm_model, "usage": {}}
