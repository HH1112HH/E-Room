from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.infrastructure.audio_pipeline import PronunciationPipeline


class TestComputeWordScores:
    def test_single_word(self):
        words = [{"word": "hello", "probability": 0.8, "start": 0, "end": 0.5}]
        scores, total, count = PronunciationPipeline.compute_word_scores(words)
        assert len(scores) == 1
        assert scores[0]["word"] == "hello"
        assert scores[0]["score"] == 80.0
        assert total == 80.0
        assert count == 1

    def test_multiple_words(self):
        words = [
            {"word": "hello", "probability": 0.9, "start": 0, "end": 0.5},
            {"word": "world", "probability": 0.7, "start": 0.5, "end": 1.0},
        ]
        scores, total, count = PronunciationPipeline.compute_word_scores(words)
        assert len(scores) == 2
        assert scores[0]["score"] == 90.0
        assert scores[1]["score"] == 70.0
        assert total == 160.0
        assert count == 2

    def test_score_capped_at_100(self):
        words = [{"word": "perfect", "probability": 0.99, "start": 0, "end": 0.3}]
        scores, total, count = PronunciationPipeline.compute_word_scores(words)
        assert scores[0]["score"] == 99.0  # 0.99 * 100 = 99, <= 100

    def test_score_clips_at_100(self):
        words = [{"word": "over", "probability": 1.5, "start": 0, "end": 0.3}]
        scores, total, count = PronunciationPipeline.compute_word_scores(words)
        assert scores[0]["score"] == 100.0

    def test_default_probability_0_5(self):
        words = [{"word": "guess", "start": 0, "end": 0.3}]
        scores, total, count = PronunciationPipeline.compute_word_scores(words)
        assert scores[0]["score"] == 50.0  # 0.5 * 100 = 50

    def test_word_scores_contain_all_expected_keys(self):
        words = [{"word": "test", "probability": 0.8, "pronunciation": "T EH S T", "phonemes": ["T", "EH", "S", "T"], "start": 0.1, "end": 0.4}]
        scores, _, _ = PronunciationPipeline.compute_word_scores(words)
        s = scores[0]
        assert "word" in s
        assert "score" in s
        assert "pronunciation" in s
        assert "phonemes" in s
        assert "start" in s
        assert "end" in s
        assert "duration" in s
        assert s["duration"] == 0.3

    def test_empty_words_list(self):
        scores, total, count = PronunciationPipeline.compute_word_scores([])
        assert scores == []
        assert total == 0.0
        assert count == 0


@pytest.mark.asyncio
class TestAssess:
    async def test_empty_transcript_returns_zero_scores(self):
        pipeline = PronunciationPipeline()
        with patch.object(pipeline, "executor") as mock_executor:
            mock_executor.submit.return_value = MagicMock()
            with patch("app.infrastructure.audio_pipeline.transcribe_whisper", return_value=("", [])):
                with patch("asyncio.get_running_loop") as mock_loop:
                    mock_loop.return_value.run_in_executor = AsyncMock(return_value=("", []))
                    result = await pipeline.assess(b"\x00\x00" * 8000)
        assert result["text"] == ""
        assert result["scores"]["overall"] == 0
        assert result["needs_remediation"] is False
        assert result["words"] == []

    async def test_calls_transcribe_whisper_with_pcm_data(self):
        pipeline = PronunciationPipeline()
        with patch.object(pipeline, "dictionary") as mock_dict:
            mock_dict.lookup.return_value = ["HH", "AH", "L", "OW"]
            with patch(
                "app.infrastructure.audio_pipeline.transcribe_whisper", return_value=("hello", [{"word": "hello", "probability": 0.8, "start": 0, "end": 0.5}])
            ):
                with patch("asyncio.get_running_loop") as mock_loop:
                    mock_loop.return_value.run_in_executor = AsyncMock(return_value=("hello", [{"word": "hello", "probability": 0.8, "start": 0, "end": 0.5}]))
                    result = await pipeline.assess(b"\x00\x00" * 8000)
        assert result["text"] == "hello"
        assert "overall" in result["scores"]
        assert "words" in result

    async def test_looks_up_phonemes_in_dictionary(self):
        pipeline = PronunciationPipeline()
        mock_dict = MagicMock()
        mock_dict.lookup.return_value = ["D", "IH", "S"]
        pipeline.dictionary = mock_dict
        with patch(
            "app.infrastructure.audio_pipeline.transcribe_whisper", return_value=("this", [{"word": "this", "probability": 0.9, "start": 0, "end": 0.4}])
        ):
            with patch("asyncio.get_running_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(return_value=("this", [{"word": "this", "probability": 0.9, "start": 0, "end": 0.4}]))
                result = await pipeline.assess(b"\x00\x00" * 8000)
        assert result["words"][0]["phonemes"] == ["D", "IH", "S"]
        assert result["words"][0]["pronunciation"] == "D IH S"
        mock_dict.lookup.assert_called_once_with("this")

    async def test_shutdown_stops_executor(self):
        pipeline = PronunciationPipeline()
        with patch.object(pipeline.executor, "shutdown") as mock_shutdown:
            pipeline.shutdown()
            mock_shutdown.assert_called_once_with(wait=True)


class TestPipelineIntegration:
    def test_assess_returns_expected_keys(self):
        pipeline = PronunciationPipeline()
        with patch.object(pipeline, "dictionary") as mock_dict:
            mock_dict.lookup.return_value = ["HH", "AH", "L", "OW"]
            with patch(
                "app.infrastructure.audio_pipeline.transcribe_whisper", return_value=("hello", [{"word": "hello", "probability": 0.85, "start": 0, "end": 0.5}])
            ):
                with patch("asyncio.get_running_loop") as mock_loop:
                    mock_loop.return_value.run_in_executor = AsyncMock(return_value=("hello", [{"word": "hello", "probability": 0.85, "start": 0, "end": 0.5}]))
                    import asyncio

                    result = asyncio.run(pipeline.assess(b"\x00\x00" * 8000))
        assert isinstance(result, dict)
        assert "text" in result
        assert "scores" in result
        assert "needs_remediation" in result
        assert "words" in result
        assert "timing" in result
