from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone

from app.config import settings

LOGGING_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"

LOG_FILE_MAP: dict[str, str] = {
    "app.api": "log/api.log",
    "app.service": "log/service.log",
    "app.model": "log/model.log",
    "app.agent": "log/agent.log",
    "app.seed": "log/seed.log",
    "app.rag": "log/rag.log",
    "app.infrastructure": "log/infra.log",
    "app.database": "log/database.log",
    "uvicorn": "log/api.log",
}


def resolve_log_path(name: str) -> str:
    matched = "log/app.log"
    for prefix, path in LOG_FILE_MAP.items():
        if name == prefix or name.startswith(prefix + "."):
            matched = path
    return matched


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    log_path = resolve_log_path(name)
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    logger.setLevel(settings.log_level.upper())

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(LOGGING_FORMAT))

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(logging.Formatter(LOGGING_FORMAT))

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.propagate = False
    return logger


def db_log(table: str, method: str, content: str = "") -> None:
    log_path = resolve_log_path("app.database")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    line = f"{ts} | DB | {table} | {method} | {content}\n"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line)

    logger = get_logger("app.database")
    logger.info("DB %s %s %s", table, method, content)
