from __future__ import annotations

from app.infrastructure.audio_whisper import get_whisper_model
from app.log import get_logger

log = get_logger(__name__)


async def warmup_models() -> None:
    log.info("Đang tải mô hình Whisper small.en...")
    try:
        get_whisper_model()
        log.info("Tải mô hình Whisper hoàn tất")
    except Exception:
        log.warning("Tải mô hình Whisper thất bại", exc_info=True)
