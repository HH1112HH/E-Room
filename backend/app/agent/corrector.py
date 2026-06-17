from __future__ import annotations

import json
import time
from typing import Any

from openai import AsyncOpenAI

from app.agent.prompt import CORRECTOR_SYSTEM_TEMPLATE
from app.config import settings
from app.infrastructure.pronunciation_audio import generate_pronunciation_audio
from app.log import get_logger

logger = get_logger(__name__)
client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url, timeout=300)


async def correct_text(text: str, user_id: str, pipeline_result: dict[str, Any]) -> dict[str, Any]:
    t0 = time.monotonic()
    logger.info("Bắt đầu sửa lỗi phát âm", extra={"user_id": user_id, "text": text, "text_len": len(text)})

    words = pipeline_result.get("words", [])
    word_context = build_word_phoneme_context(pipeline_result.get("text", ""), words)
    scores_context_str = f"Overall: {pipeline_result['scores']['overall']}/100, needs_remediation: {pipeline_result['needs_remediation']}"
    word_context_str = json.dumps(word_context, ensure_ascii=False, indent=2)
    system_prompt = CORRECTOR_SYSTEM_TEMPLATE.format(
        scores_context=scores_context_str,
        word_phoneme_context=word_context_str,
    )

    user_message = (
        f'Người dùng nói: "{text}"\n\n'
        f"Phân tích từng từ (điểm, phát âm):\n{word_context_str}\n\n"
        f"Điểm tổng thể: {pipeline_result['scores']['overall']}/100\n"
        f"Cần sửa lỗi: {pipeline_result['needs_remediation']}\n\n"
        "Hãy đưa ra phản hồi phát âm chi tiết."
    )

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=256,
            timeout=300,
        )
        llm_time = round(time.monotonic() - t0, 2)
        content = resp.choices[0].message.content or ""

        result = parse_correction_response(content, text)
        result["pronunciation_audio"] = await generate_pronunciation_audio(result.get("errors", []))
        logger.info(
            "Sửa lỗi phát âm hoàn tất",
            extra={
                "user_id": user_id,
                "text": text,
                "llm_s": llm_time,
                "errors_count": len(result.get("errors", [])),
                "has_feedback": bool(result.get("pronunciation_feedback")),
            },
        )
        return result
    except Exception as e:
        logger.error("Sửa lỗi phát âm thất bại", exc_info=True, extra={"user_id": user_id, "error": str(e)})
        return {
            "corrected": text,
            "explanation": "Không thể phân tích phát âm ngay lúc này.",
            "pronunciation_feedback": "",
            "errors": [],
            "pronunciation_audio": [],
            "tts_text": text,
        }


def build_word_phoneme_context(text: str, words: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for w in words:
        result.append(
            {
                "word": w.get("word", ""),
                "score": w.get("score", 0),
                "pronunciation": w.get("pronunciation", ""),
                "phonemes": w.get("phonemes", []),
                "confidence": w.get("probability", w.get("confidence", 0)),
                "duration": w.get("duration", 0),
            }
        )
    return result


def parse_correction_response(content: str, original: str) -> dict[str, Any]:
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return {
                "corrected": parsed.get("corrected", original),
                "explanation": parsed.get("explanation", ""),
                "pronunciation_feedback": parsed.get("pronunciation_feedback", ""),
                "errors": parsed.get("errors", []),
                "pronunciation_audio": [],
                "tts_text": parsed.get("tts_text", parsed.get("corrected", original)),
            }
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "corrected": original,
        "explanation": content,
        "pronunciation_feedback": "",
        "errors": [],
        "pronunciation_audio": [],
        "tts_text": original,
    }
