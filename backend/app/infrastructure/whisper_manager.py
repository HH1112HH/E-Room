from __future__ import annotations

import asyncio
import base64
import concurrent.futures
import time
from typing import Any

from fastapi import WebSocket

from app.log import get_logger

logger = get_logger(__name__)


class WhisperWorker:
    def __init__(self, worker_id: str, ws: WebSocket) -> None:
        self.worker_id = worker_id
        self.ws = ws
        self.is_busy = False
        self.last_heartbeat = time.time()
        self.tasks_completed = 0


class WhisperWorkerManager:
    def __init__(self) -> None:
        self.workers: dict[str, WhisperWorker] = {}
        self._pending: dict[str, concurrent.futures.Future] = {}
        self._round_robin_index = 0
        self._request_queue: asyncio.Queue | None = None
        self._queue_initialized = False

    def _ensure_queue(self) -> asyncio.Queue:
        if self._request_queue is None:
            self._request_queue = asyncio.Queue()
        return self._request_queue

    def register(self, worker_id: str, ws: WebSocket) -> None:
        self.workers[worker_id] = WhisperWorker(worker_id, ws)
        logger.info("Whisper worker connected: %s (total=%d)", worker_id, len(self.workers))

    def unregister(self, worker_id: str) -> None:
        self.workers.pop(worker_id, None)
        logger.info("Whisper worker disconnected: %s (total=%d)", worker_id, len(self.workers))

    def heartbeat(self, worker_id: str) -> None:
        if worker_id in self.workers:
            self.workers[worker_id].last_heartbeat = time.time()

    def _pick_worker(self) -> WhisperWorker | None:
        available = [w for w in self.workers.values() if not w.is_busy]
        if not available:
            return None
        self._round_robin_index = self._round_robin_index % len(available)
        worker = available[self._round_robin_index]
        self._round_robin_index += 1
        return worker

    def send_audio_sync(self, wav_data: bytes, language: str, timeout: int = 30) -> tuple[str, list[dict[str, Any]]]:
        queue = self._ensure_queue()
        future: concurrent.futures.Future = concurrent.futures.Future()
        task_id = f"req:{int(time.time() * 1000)}:{id(future)}"

        loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(queue.put_nowait, (task_id, wav_data, language, future))

        try:
            result = future.result(timeout=timeout + 5)
            text = result.get("text", "")
            words = result.get("words", [])
            return text, words
        except concurrent.futures.TimeoutError:
            raise RuntimeError(f"Whisper worker timed out after {timeout}s")

    async def process_queue(self) -> None:
        queue = self._ensure_queue()
        while True:
            task_id, wav_data, language, future = await queue.get()
            try:
                worker = self._pick_worker()
                if worker is None:
                    future.set_result({"text": "", "words": []})
                    logger.warning("No whisper worker available for task %s", task_id)
                    continue

                worker.is_busy = True
                try:
                    msg = {
                        "type": "transcribe",
                        "task_id": task_id,
                        "audio_wav": base64.b64encode(wav_data).decode(),
                        "language": language,
                    }
                    await worker.ws.send_text(json.dumps(msg))
                    logger.info("Sent audio to worker %s (task=%s)", worker.worker_id, task_id)

                    result = await asyncio.wait_for(
                        self._wait_for_result(task_id), timeout=30
                    )
                    future.set_result(result)
                    worker.tasks_completed += 1
                except asyncio.TimeoutError:
                    future.set_result({"text": "", "words": []})
                    logger.warning("Worker %s timed out (task=%s)", worker.worker_id, task_id)
                finally:
                    worker.is_busy = False
                    self._pending.pop(task_id, None)
            except Exception as e:
                if not future.done():
                    future.set_exception(e)
                logger.error("Error processing whisper task %s: %s", task_id, e)

    async def _wait_for_result(self, task_id: str) -> dict:
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[task_id] = future
        return await future

    def complete_task(self, task_id: str, result: dict) -> None:
        future = self._pending.get(task_id)
        if future and not future.done():
            future.set_result(result)

    @property
    def worker_count(self) -> int:
        return len(self.workers)

    @property
    def available_count(self) -> int:
        return sum(1 for w in self.workers.values() if not w.is_busy)


import json

whisper_manager = WhisperWorkerManager()
