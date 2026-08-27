#!/usr/bin/env python3
"""Local Whisper Worker — kết nối WebSocket đến Render API, chạy faster-whisper large-v3.

Usage:
    cd E-Room
    python scripts/whisper_worker.py
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import signal
import sys
import time
import wave
from pathlib import Path
from urllib.parse import urlencode

from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env.worker"
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded env from {env_path}")
else:
    print(f"No .env.worker found at {env_path}, using system env vars")

RECONNECT_DELAYS = [1, 2, 4, 8, 16, 32, 60]

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("faster-whisper not installed. Run: pip install faster-whisper")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("websockets not installed. Run: pip install websockets")
    sys.exit(1)


class WhisperWorker:
    def __init__(self) -> None:
        self.server_url = os.environ.get("WHISPER_SERVER_URL", "ws://localhost:8000/ws/whisper-worker")
        self.secret = os.environ.get("WHISPER_WORKER_SECRET", "")
        self.model_name = os.environ.get("WHISPER_MODEL", "large-v3")
        self.language = os.environ.get("WHISPER_LANGUAGE", "en")
        self.device = os.environ.get("WHISPER_DEVICE", "cuda")
        self.compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
        self.heartbeat_interval = int(os.environ.get("WHISPER_HEARTBEAT_INTERVAL", "30"))
        self.reconnect_index = 0
        self.model: WhisperModel | None = None
        self.running = True

    def load_model(self) -> None:
        print(f"Loading whisper model: {self.model_name} (device={self.device}, compute={self.compute_type})")
        self.model = WhisperModel(
            self.model_name,
            device=self.device,
            compute_type=self.compute_type,
        )
        print("Model loaded successfully")

    def wav_to_text(self, wav_b64: str, language: str) -> tuple[str, list[dict]]:
        wav_bytes = base64.b64decode(wav_b64)
        buf = io.BytesIO(wav_bytes)
        with wave.open(buf, "rb") as wf:
            sample_rate = wf.getframerate()
            pcm_bytes = wf.readframes(wf.getnframes())

        import numpy as np
        audio_array = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        segments, info = self.model.transcribe(
            audio_array,
            language=language,
            beam_size=1,
            best_of=1,
            temperature=0.0,
            vad_filter=False,
            condition_on_previous_text=False,
        )

        text_parts: list[str] = []
        words: list[dict] = []
        for seg in segments:
            seg_text = (seg.text or "").strip()
            if not seg_text:
                continue
            text_parts.append(seg_text)
            seg_words = seg_text.split()
            seg_confidence = min(max((seg.avg_logprob + 2) / 4, 0.1), 1.0)
            for w in seg_words:
                words.append(
                    {
                        "word": w.strip(".,!?;:"),
                        "probability": seg_confidence,
                        "start": seg.start,
                        "end": seg.end,
                    }
                )

        return " ".join(text_parts), words

    async def heartbeat_loop(self, ws) -> None:
        while self.running:
            await asyncio.sleep(self.heartbeat_interval)
            try:
                await ws.send(json.dumps({"type": "heartbeat"}))
            except Exception:
                break

    async def connect(self) -> None:
        if not self.secret:
            print("ERROR: WHISPER_WORKER_SECRET not set")
            sys.exit(1)

        self.load_model()
        reconnect_delay = RECONNECT_DELAYS[0]
        reconnect_idx = 0

        while self.running:
            query = urlencode({"secret": self.secret})
            url = f"{self.server_url}?{query}"
            print(f"Connecting to {self.server_url}")

            try:
                async with websockets.connect(url, ping_interval=None) as ws:
                    print("Connected to server")
                    reconnect_delay = RECONNECT_DELAYS[0]
                    reconnect_idx = 0

                    heartbeat_task = asyncio.create_task(self.heartbeat_loop(ws))

                    try:
                        async for raw in ws:
                            data = json.loads(raw)
                            msg_type = data.get("type", "")

                            if msg_type == "transcribe":
                                task_id = data.get("task_id", "")
                                wav_b64 = data.get("audio_wav", "")
                                lang = data.get("language", self.language)

                                if not wav_b64:
                                    continue

                                try:
                                    loop = asyncio.get_event_loop()
                                    text, words = await loop.run_in_executor(None, self.wav_to_text, wav_b64, lang)
                                    await ws.send(
                                        json.dumps(
                                            {
                                                "type": "transcribe_result",
                                                "task_id": task_id,
                                                "text": text,
                                                "words": words,
                                            }
                                        )
                                    )
                                    print(f"Task {task_id}: text={text!r}")
                                except Exception as e:
                                    print(f"Task {task_id} failed: {e}")
                                    await ws.send(
                                        json.dumps(
                                            {
                                                "type": "transcribe_result",
                                                "task_id": task_id,
                                                "text": "",
                                                "words": [],
                                                "error": str(e),
                                            }
                                        )
                                    )
                    finally:
                        heartbeat_task.cancel()
            except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError, OSError) as e:
                print(f"Connection lost: {e}")
            except Exception as e:
                print(f"Unexpected error: {e}")

            if not self.running:
                break

            print(f"Reconnecting in {reconnect_delay}s...")
            await asyncio.sleep(reconnect_delay)
            reconnect_idx = min(reconnect_idx + 1, len(RECONNECT_DELAYS) - 1)
            reconnect_delay = RECONNECT_DELAYS[reconnect_idx]

    def stop(self) -> None:
        self.running = False


def main() -> None:
    worker = WhisperWorker()

    def handle_signal(sig, frame):
        print("\nShutting down...")
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    asyncio.run(worker.connect())


if __name__ == "__main__":
    main()
