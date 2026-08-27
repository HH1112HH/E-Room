from __future__ import annotations

import asyncio
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
        self._pending: dict[str, asyncio.Future] = {}
        self._round_robin_index = 0

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

    async def send_audio(self, wav_data: bytes, language: str, timeout: int = 30) -> tuple[str, list[dict[str, Any]]]:
        import base64

        worker = self._pick_worker()
        if worker is None:
            raise RuntimeError("No whisper worker available")

        task_id = f"{worker.worker_id}:{int(time.time() * 1000)}"
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[task_id] = future
        worker.is_busy = True

        try:
            import json

            msg = json.dumps(
                {
                    "type": "transcribe",
                    "task_id": task_id,
                    "audio_wav": base64.b64encode(wav_data).decode(),
                    "language": language,
                }
            )
            await worker.ws.send_text(msg)
            logger.info("Sent audio to worker %s (%d bytes WAV, task=%s)", worker.worker_id, len(wav_data), task_id)

            result = await asyncio.wait_for(future, timeout=timeout)
            worker.tasks_completed += 1
            text = result.get("text", "")
            words = result.get("words", [])
            logger.info("Worker %s returned: text=%r, words=%d", worker.worker_id, text[:80], len(words))
            return text, words
        except asyncio.TimeoutError:
            logger.warning("Worker %s timed out (task=%s)", worker.worker_id, task_id)
            raise RuntimeError(f"Worker {worker.worker_id} timed out after {timeout}s")
        finally:
            worker.is_busy = False
            self._pending.pop(task_id, None)

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


whisper_manager = WhisperWorkerManager()
