from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agent.corrector import (
    build_word_phoneme_context,
    correct_text,
    parse_correction_response,
)


class TestBuildWordPhonemeContext:
    def test_empty_words(self):
        result = build_word_phoneme_context("hello world", [])
        assert result == []

    def test_single_word(self):
        words = [{"word": "hello", "score": 80, "pronunciation": "HH AH L OW", "phonemes": ["HH", "AH", "L", "OW"], "probability": 0.9, "duration": 0.5}]
        result = build_word_phoneme_context("hello", words)
        assert len(result) == 1
        assert result[0]["word"] == "hello"
        assert result[0]["score"] == 80
        assert result[0]["pronunciation"] == "HH AH L OW"
        assert result[0]["phonemes"] == ["HH", "AH", "L", "OW"]
        assert result[0]["confidence"] == 0.9
        assert result[0]["duration"] == 0.5

    def test_missing_keys(self):
        words = [{"word": "test"}]
        result = build_word_phoneme_context("test", words)
        assert result[0]["score"] == 0
        assert result[0]["confidence"] == 0
        assert result[0]["duration"] == 0
        assert result[0]["pronunciation"] == ""


class TestParseCorrectionResponse:
    def test_valid_json(self):
        content = (
            '{"corrected": "I think so", "explanation": "Good", '
            '"pronunciation_feedback": "Great", '
            '"errors": [{"original": "tink", "corrected": "think"}], '
            '"tts_text": "I think so"}'
        )
        result = parse_correction_response(content, "I tink so")
        assert result["corrected"] == "I think so"
        assert result["explanation"] == "Good"
        assert result["pronunciation_feedback"] == "Great"
        assert len(result["errors"]) == 1
        assert result["errors"][0]["original"] == "tink"
        assert result["tts_text"] == "I think so"

    def test_valid_json_missing_tts_text(self):
        content = '{"corrected": "hello world", "errors": []}'
        result = parse_correction_response(content, "hello world")
        assert result["corrected"] == "hello world"
        assert result["tts_text"] == "hello world"

    def test_invalid_json(self):
        content = "Some plain text explanation"
        result = parse_correction_response(content, "original text")
        assert result["corrected"] == "original text"
        assert result["explanation"] == "Some plain text explanation"
        assert result["errors"] == []

    def test_empty_content(self):
        result = parse_correction_response("", "original")
        assert result["corrected"] == "original"
        assert result["explanation"] == ""

    def test_malformed_json_with_extra_text(self):
        content = 'Here is the result: {"corrected": "hello", "errors": []}'
        result = parse_correction_response(content, "original")
        assert result["corrected"] == "original"

    def test_pronunciation_audio_always_empty(self):
        content = '{"corrected": "test", "errors": []}'
        result = parse_correction_response(content, "test")
        assert result["pronunciation_audio"] == []


@pytest.mark.asyncio
class TestCorrectText:
    async def test_success(self):
        pipeline_result = {
            "text": "hello world",
            "scores": {"overall": 65},
            "needs_remediation": True,
            "words": [
                {"word": "hello", "score": 70, "pronunciation": "HH AH L OW", "phonemes": ["HH", "AH", "L", "OW"], "probability": 0.8, "start": 0, "end": 0.5}
            ],
        }
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[
            0
        ].message.content = '{"corrected": "hello world", "errors": [], "score": 6, "pronunciation_feedback": "Good", "tts_text": "hello world"}'

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("app.agent.corrector._get_client", return_value=mock_client):
            with patch("app.agent.corrector.generate_pronunciation_audio", AsyncMock(return_value=[])):
                result = await correct_text("hello world", "user1", pipeline_result)

        assert result["corrected"] == "hello world"
        assert result["pronunciation_feedback"] == "Good"

    async def test_llm_error_returns_fallback(self):
        pipeline_result = {
            "text": "hello",
            "scores": {"overall": 50},
            "needs_remediation": True,
            "words": [],
        }
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("LLM down"))
        with patch("app.agent.corrector._get_client", return_value=mock_client):
            result = await correct_text("hello", "user1", pipeline_result)

        assert result["corrected"] == "hello"
        assert "thể" in result["explanation"]
        assert result["errors"] == []

    async def test_builds_word_context_from_pipeline_words(self):
        pipeline_result = {
            "text": "think this",
            "scores": {"overall": 45},
            "needs_remediation": True,
            "words": [
                {"word": "think", "score": 30, "pronunciation": "T IH NG K", "phonemes": ["T", "IH", "NG", "K"], "probability": 0.5, "start": 0, "end": 0.3},
                {"word": "this", "score": 40, "pronunciation": "D IH S", "phonemes": ["D", "IH", "S"], "probability": 0.6, "start": 0.3, "end": 0.6},
            ],
        }
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message.content = (
            '{"corrected": "think this", '
            '"errors": [{"original": "tink", "corrected": "think"}], '
            '"score": 4, "pronunciation_feedback": "Work on /θ/", '
            '"tts_text": "think this"}'
        )

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("app.agent.corrector._get_client", return_value=mock_client):
            with patch("app.agent.corrector.generate_pronunciation_audio", AsyncMock(return_value=[])):
                result = await correct_text("think this", "user1", pipeline_result)

        assert len(result["errors"]) == 1
        assert result["pronunciation_feedback"] == "Work on /θ/"
