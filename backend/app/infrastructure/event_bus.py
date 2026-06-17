from __future__ import annotations

import asyncio
from typing import Any, Callable

from app.log import get_logger

logger = get_logger(__name__)


class EventBus:
    def __init__(self) -> None:
        self.crud = None
        self.subscriber = None
        self.listener_task: asyncio.Task | None = None
        self.callbacks: dict[str, list[Callable[[str, dict], Any]]] = {}
        self.connected = False

    def ensure_redis(self) -> bool:
        if self.connected:
            return True
        try:
            from app.infrastructure.redis_client import RedisCRUD, get_redis_client
            redis_client = get_redis_client()
            self.crud = RedisCRUD(redis_client)
            self.subscriber = redis_client.pubsub()
            self.connected = True
        except Exception:
            self.crud = None
            self.subscriber = None
            self.connected = False
        return self.connected

    def publish(self, channel: str, payload: dict[str, Any]) -> int:
        if not self.ensure_redis():
            return 0
        return self.crud.publish(channel, payload)

    def subscribe(self, channel: str, callback: Callable[[str, dict], Any]) -> None:
        self.callbacks.setdefault(channel, []).append(callback)

    def unsubscribe(self, channel: str, callback: Callable[[str, dict], Any]) -> None:
        if channel in self.callbacks:
            self.callbacks[channel] = [cb for cb in self.callbacks[channel] if cb is not callback]

    async def start(self) -> None:
        if not self.callbacks or not self.ensure_redis():
            logger.info("EventBus bo qua (khong co Redis hoac khong co subscriber)")
            return
        logger.info("EventBus da khoi dong")
        for channel in self.callbacks:
            self.subscriber.subscribe(channel)
        self.listener_task = asyncio.create_task(self.listen())

    async def stop(self) -> None:
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                pass
        if self.subscriber:
            try:
                self.subscriber.close()
            except Exception:
                pass
        logger.info("EventBus da dung")

    async def listen(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            try:
                message = await loop.run_in_executor(None, self.subscriber.get_message, True)
                if message is None:
                    continue
                if message["type"] != "message":
                    continue
                channel = message["channel"].decode() if isinstance(message["channel"], bytes) else message["channel"]
                import json
                data = json.loads(message["data"])
                logger.info("Nhan su kien tu Redis",
                    extra={"channel": channel, "room_id": data.get("room_id", "")})
                for cb in self.callbacks.get(channel, []):
                    await cb(channel, data)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Loi EventBus listener", exc_info=exc)


event_bus = EventBus()
