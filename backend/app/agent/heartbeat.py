from __future__ import annotations

import json
import random
import time
from typing import Any

from openai import AsyncOpenAI

from app.agent.prompt import HEARTBEAT_SYSTEM_TEMPLATE
from app.config import settings
from app.log import get_logger

logger = get_logger(__name__)
client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url, timeout=120)

FALLBACK_QUESTIONS = [
    "What is one AI tool you use regularly and how does it help you?",
    "Do you think AI will replace human jobs or create new ones? Why or why not?",
    "What is the most impressive thing you have seen AI do recently?",
    "How do you think AI will change education in the next 5 years?",
    "What ethical concerns do you have about AI development?",
    "If you could build an AI to solve one problem, what would it be?",
    "How do large language models like GPT actually work in simple terms?",
    "What is your opinion on using AI for creative work like art or music?",
    "Should AI systems be required to explain their decisions? Why or why not?",
    "What is the difference between machine learning and traditional programming?",
]


async def generate_heartbeat_question(room_id: str, context: str) -> dict[str, Any]:
    t0 = time.monotonic()
    logger.info("Nhịp tim - bắt đầu tạo câu hỏi", extra={"room_id": room_id})

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": HEARTBEAT_SYSTEM_TEMPLATE},
                {"role": "user", "content": context or "Hãy tạo một câu hỏi thảo luận về AI."},
            ],
            temperature=0.7,
            max_tokens=128,
            timeout=60,
        )
        content = resp.choices[0].message.content or ""
        data = parse_heartbeat_response(content)

        logger.info(
            "Nhịp tim - tạo câu hỏi hoàn tất",
            extra={"room_id": room_id, "question": data.get("question", "")[:50], "elapsed_s": round(time.monotonic() - t0, 2)},
        )
        return data
    except Exception as e:
        logger.error("Nhịp tim - tạo câu hỏi thất bại", exc_info=True, extra={"room_id": room_id, "error": str(e)})
        return {}


def parse_heartbeat_response(content: str) -> dict[str, Any]:
    if not content or not content.strip():
        return {
            "question_id": "",
            "question": random.choice(FALLBACK_QUESTIONS),
            "answers": [],
        }

    cleaned = content.strip()
    if cleaned.startswith("```"):
        brace = cleaned.find("{")
        if brace >= 0:
            cleaned = cleaned[brace:]
        end = cleaned.rfind("}")
        if end >= 0:
            cleaned = cleaned[: end + 1]

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            question = parsed.get("question") or parsed.get("text") or parsed.get("query", "")
            if question:
                return {
                    "question_id": parsed.get("question_id", str(hash(question))[:8]),
                    "question": question,
                    "answers": parsed.get("answers", parsed.get("suggested_response", [])),
                }
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "question_id": str(hash(content))[:8],
        "question": content.strip() or random.choice(FALLBACK_QUESTIONS),
        "answers": [],
    }


generate_heartbeat = generate_heartbeat_question
