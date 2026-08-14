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

def _get_client() -> AsyncOpenAI | None:
    if not settings.llm_api_key:
        return None
    return AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url, timeout=300)

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

FALLBACK_QUESTIONS_VI = {
    "What is one AI tool you use regularly and how does it help you?": "Bạn thường dùng một công cụ AI nào và nó giúp bạn ra sao?",
    "Do you think AI will replace human jobs or create new ones? Why or why not?": "Bạn nghĩ AI sẽ thay thế việc làm của con người hay tạo ra công việc mới? Vì sao?",
    "What is the most impressive thing you have seen AI do recently?": "Điều ấn tượng nhất mà bạn thấy AI làm được gần đây là gì?",
    "How do you think AI will change education in the next 5 years?": "Bạn nghĩ AI sẽ thay đổi giáo dục thế nào trong 5 năm tới?",
    "What ethical concerns do you have about AI development?": "Bạn có lo ngại về đạo đức nào đối với sự phát triển của AI không?",
    "If you could build an AI to solve one problem, what would it be?": "Nếu có thể xây một AI để giải quyết một vấn đề, bạn sẽ chọn vấn đề gì?",
    "How do large language models like GPT actually work in simple terms?": "Các mô hình ngôn ngữ lớn như GPT thực sự hoạt động thế nào một cách đơn giản?",
    "What is your opinion on using AI for creative work like art or music?": "Quan điểm của bạn về việc dùng AI cho công việc sáng tạo như nghệ thuật hay âm nhạc?",
    "Should AI systems be required to explain their decisions? Why or why not?": "Hệ thống AI có nên bị yêu cầu giải thích quyết định của mình không? Vì sao?",
    "What is the difference between machine learning and traditional programming?": "Sự khác biệt giữa máy học và lập trình truyền thống là gì?",
}


async def generate_heartbeat_question(room_id: str, context: str) -> dict[str, Any]:
    t0 = time.monotonic()
    logger.info("Nhịp tim - bắt đầu tạo câu hỏi", extra={"room_id": room_id})

    try:
        client = _get_client()
        if client is None:
            raise RuntimeError("LLM chưa được cấu hình (LLM_API_KEY trống)")
        resp = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": HEARTBEAT_SYSTEM_TEMPLATE},
                {"role": "user", "content": context or "Hãy tạo một câu hỏi thảo luận về AI."},
            ],
            temperature=0.7,
            max_tokens=128,
            timeout=300,
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
        return {
            "question_id": "",
            "question": random.choice(FALLBACK_QUESTIONS),
            "answers": [],
        }

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
