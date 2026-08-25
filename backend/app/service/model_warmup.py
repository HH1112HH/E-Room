from __future__ import annotations

from app.log import get_logger

log = get_logger(__name__)


async def warmup_models() -> None:
    log.info("Không cần warmup model local (dùng Groq API)")
