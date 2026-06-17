from __future__ import annotations

import base64
import struct

import pytest

from app.infrastructure.audio import AudioBuffer, AudioBufferManager


def make_chunk(value: int, num_samples: int = 320) -> bytes:
    fmt = f"<{num_samples}h"
    return struct.pack(fmt, *([value] * num_samples))


def make_b64_chunk(value: int, num_samples: int = 320) -> str:
    return base64.b64encode(make_chunk(value, num_samples)).decode()


class TestAudioBuffer:
    @pytest.fixture
    def buf(self):
        return AudioBuffer("test-user")

    def test_push_and_finalize(self, buf):
        buf.push(1, make_b64_chunk(8000))
        pcm = buf.finalize()
        assert pcm is not None
        assert len(pcm) == 640

    def test_finalize_empty_returns_none(self, buf):
        assert buf.finalize() is None

    def test_feed_chunk_loud_returns_speech_start(self, buf):
        result = buf.feed_chunk(1, make_chunk(8000))
        assert result == "speech_start" or result == ""

    def test_feed_chunk_silent_returns_empty(self, buf):
        assert buf.feed_chunk(1, make_chunk(0)) == ""

    def test_reset_clears_state(self, buf):
        buf.feed_chunk(1, make_chunk(8000))
        buf.reset()
        assert len(buf.speech_segments) == 0
        assert buf.speech_active is False

    def test_duplicate_seq_ignored_in_push(self, buf):
        buf.push(1, make_b64_chunk(8000))
        buf.push(1, make_b64_chunk(8000))
        pcm = buf.finalize()
        assert pcm is not None
        assert len(pcm) == 640

    def test_get_sentence_returns_finalized(self, buf):
        buf.feed_chunk(1, make_chunk(8000))
        assert len(buf.get_sentence()) == 640

    def test_get_sentence_empty_after_finalize(self, buf):
        buf.feed_chunk(1, make_chunk(8000))
        buf.get_sentence()
        assert buf.get_sentence() == b""

    def test_check_vad_returns_none_idle(self, buf):
        assert buf.check_vad() is None

    def test_push_appends_to_speech_segments(self, buf):
        buf.push(1, make_b64_chunk(8000))
        assert len(buf.speech_segments) == 1


class TestAudioBufferManager:
    def test_get_or_create_returns_same(self):
        mgr = AudioBufferManager()
        assert mgr.get_or_create("user-1") is mgr.get_or_create("user-1")

    def test_get_or_create_different_users(self):
        mgr = AudioBufferManager()
        assert mgr.get_or_create("user-1") is not mgr.get_or_create("user-2")

    def test_remove_deletes_buffer(self):
        mgr = AudioBufferManager()
        mgr.get_or_create("user-1")
        mgr.remove("user-1")
        assert "user-1" not in mgr.buffers

    def test_remove_nonexistent_is_safe(self):
        AudioBufferManager().remove("ghost-user")
