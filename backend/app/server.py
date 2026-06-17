from __future__ import annotations

import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env in {"development", "test"},
        reload_excludes=["*.log", "log/*", "*.pyc", "__pycache__/*"],
        log_level=settings.log_level.lower(),
    )
