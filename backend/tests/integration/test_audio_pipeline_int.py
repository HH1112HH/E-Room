from __future__ import annotations

import asyncio

import numpy as np
import pytest

from app.infrastructure.audio_pipeline import PronunciationPipeline


@pytest.mark.slow
class TestPronunciationPipeline:
    @pytest.fixture
    def pipeline(self):
        return PronunciationPipeline()

    def test_assess_returns_expected_keys(self, pipeline):
        audio = np.zeros(16000, dtype=np.float32)
        result = asyncio.run(pipeline.assess(audio))
        assert isinstance(result, dict)
        assert "text" in result
        assert "scores" in result
        assert "timing" in result
        assert "needs_remediation" in result

    def test_assess_with_bytes(self, pipeline):
        result = asyncio.run(pipeline.assess(b"\x00\x00" * 8000))
        assert result is not None

    def test_sine_wave(self, pipeline):
        t = np.linspace(0, 1.0, 16000, endpoint=False)
        audio = (np.sin(2 * np.pi * 440 * t) * 0.3).astype(np.float32)
        result = asyncio.run(pipeline.assess(audio))
        overall = result["scores"].get("overall", 0)
        assert 0 <= overall <= 10

    def test_silence_scores_low(self, pipeline):
        result = asyncio.run(pipeline.assess(np.zeros(16000, dtype=np.float32)))
        assert result["scores"]["overall"] < 5
