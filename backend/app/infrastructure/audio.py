from __future__ import annotations

import base64
import math
import struct
import time
from collections import OrderedDict

from app.log import get_logger

logger = get_logger(__name__)


class AudioConfig:
    sample_rate: int = 16000
    sample_width: int = 2
    channels: int = 1
    silence_threshold_ms: int = 2000
    rms_threshold: float = 0.08
    rms_silence: float = 0.04
    max_buffer_duration: int = 30


class AudioBuffer:
    def __init__(self, user_id: str, config: AudioConfig | None = None) -> None:
        self.user_id = user_id
        self.config = config or AudioConfig()
        self.pending: OrderedDict[int, bytes] = OrderedDict()
        self.last_seq: int = 0
        self.finalized: bool = False
        self.speech_segments: list[bytes] = []
        self.speech_active: bool = False
        self.last_audio_time: float = 0.0
        self.speech_start_time: float = 0.0

    def is_voice(self, pcm_bytes: bytes) -> bool:
        samples = struct.unpack(f"<{len(pcm_bytes) // 2}h", pcm_bytes)
        if not samples:
            return False
        rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768.0
        return rms >= self.config.rms_threshold

    def push(self, seq: int, data_b64: str) -> None:
        if seq <= self.last_seq:
            logger.debug("audio_buffer_seq_trùng", extra={"user_id": self.user_id, "seq": seq})
            return
        pcm = base64.b64decode(data_b64)
        if not self.speech_segments:
            self.speech_start_time = time.time()
        self.pending[seq] = pcm
        self.last_seq = seq
        self.speech_segments.append(pcm)
        if self.is_voice(pcm):
            self.last_audio_time = time.time()
            self.speech_active = True
        elif self.speech_active and self.last_audio_time > 0:
            # keep VAD alive during quieter speech (between rms_silence and rms_threshold)
            samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
            if samples:
                rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768.0
                if rms >= self.config.rms_silence:
                    self.last_audio_time = time.time()
        logger.debug("audio_buffer_chunk_đã_xếp_hàng", extra={"user_id": self.user_id, "seq": seq, "size": len(pcm), "pending": len(self.pending)})

    def check_vad(self) -> str | None:
        if not self.speech_active:
            return None

        if not self.speech_segments:
            return None

        latest = self.speech_segments[-1]

        samples = struct.unpack(f"<{len(latest) // 2}h", latest)
        if not samples:
            return None

        rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768.0

        if self.last_audio_time == 0:
            if self.buffer_duration_s() > 30.0:
                self.speech_segments.clear()
                logger.debug("Xoá bộ đệm chưa có giọng nói sau 30s", extra={"user_id": self.user_id})
            return None

        silence_ms = (time.time() - self.last_audio_time) * 1000

        if rms < self.config.rms_silence and silence_ms > self.config.silence_threshold_ms:
            logger.debug("Phát hiện im lặng - kết thúc giọng nói", extra={"user_id": self.user_id, "rms": round(rms, 4), "silence_ms": round(silence_ms, 0)})
            return "speech_end"

        buf_duration = self.buffer_duration_s()
        if buf_duration > 15.0:
            logger.warning("VAD không phát hiện im lặng sau %.1fs - buộc kết thúc", buf_duration, extra={"user_id": self.user_id})
            return "speech_end"

        if rms >= self.config.rms_threshold:
            logger.debug("Phát hiện giọng nói", extra={"user_id": self.user_id, "rms": round(rms, 4)})
            return "speech_start"

        return None

    def finalize(self) -> bytes | None:
        self.speech_active = False
        if not self.speech_segments:
            return None
        pcm = b"".join(self.speech_segments)
        self.speech_segments.clear()
        logger.debug("Kết thúc thu âm", extra={"user_id": self.user_id, "pcm_bytes": len(pcm)})
        return pcm

    def has_voice(self) -> bool:
        return self.speech_active and bool(self.speech_segments)

    def buffer_duration_s(self) -> float:
        if not self.speech_segments:
            return 0.0
        total_bytes = sum(len(s) for s in self.speech_segments)
        return total_bytes / (self.config.sample_rate * self.config.sample_width)

    def feed_chunk(self, seq: int, pcm_bytes: bytes) -> str:
        self.pending[seq] = pcm_bytes
        self.speech_segments.append(pcm_bytes)
        self.speech_active = True
        self.last_audio_time = time.time()
        if len(self.speech_segments) > 1:
            return self.check_vad() or ""
        return ""

    def get_sentence(self) -> bytes:
        return self.finalize() or b""

    def reset(self) -> None:
        self.pending.clear()
        self.speech_segments.clear()
        self.speech_active = False
        self.finalized = False


class AudioBufferManager:
    def __init__(self) -> None:
        self.buffers: dict[str, AudioBuffer] = {}

    def get_or_create(self, user_id: str, config: AudioConfig | None = None) -> AudioBuffer:
        if user_id not in self.buffers:
            self.buffers[user_id] = AudioBuffer(user_id, config)
        return self.buffers[user_id]

    def remove(self, user_id: str) -> None:
        self.buffers.pop(user_id, None)
