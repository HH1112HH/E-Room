from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, text

from app.api import api_router
from app.api.middleware import AuthMiddleware, LoggingMiddleware
from app.api.routers.websocket import handle_audio_ws, handle_room_ws, handle_whisper_worker
from app.config import settings
from app.database import create_db_and_tables, engine
from app.infrastructure.event_bus import event_bus
from app.log import get_logger
from app.seed import seed_all
from app.service.heartbeat import heartbeat_loop
from app.service.model_warmup import warmup_models

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        counts = seed_all(session)
        log.info("Đã tạo %s thẻ tag mặc định", counts.get("tags", 0))
        log.info("Đã tạo %s phòng mẫu", counts.get("rooms", 0))
        log.info("Đã tạo %s tài khoản admin", counts.get("admins", 0))
        session.exec(text("DELETE FROM room_participants"))
        session.commit()
        log.info("Đã xoá dữ liệu người tham gia cũ")
    await warmup_models()
    await event_bus.start()
    hb_task = asyncio.create_task(heartbeat_loop())
    log.info("%s đã khởi động", settings.app_name)
    yield
    hb_task.cancel()
    await event_bus.stop()
    log.info("%s đã tắt", settings.app_name)


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    description=settings.app_description,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(AuthMiddleware)

app.include_router(api_router, prefix="/api/v1")

app.add_api_websocket_route("/ws/rooms/{room_id}", handle_room_ws)
app.add_api_websocket_route("/ws/audio/{room_id}", handle_audio_ws)
app.add_api_websocket_route("/ws/whisper-worker", handle_whisper_worker)


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {"message": f"Chào mừng đến với {settings.app_name}"}


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
