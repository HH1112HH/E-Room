from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
class TestGenerateAudioBase64:
    async def test_returns_base64_string_on_success(self):
        mock_buf = MagicMock()
        mock_buf.read.return_value = b"fake_mp3_data"

        with patch("app.infrastructure.pronunciation_audio.gTTS") as mock_gtts:
            mock_gtts.return_value = MagicMock()
            mock_gtts.return_value.write_to_fp = MagicMock()

            with patch("app.infrastructure.pronunciation_audio.io.BytesIO", return_value=mock_buf):
                with patch("app.infrastructure.pronunciation_audio.base64.b64encode", return_value=b"ZmFrZV9tcDNfZGF0YQ=="):
                    with patch("asyncio.get_running_loop") as mock_loop:
                        mock_loop.return_value.run_in_executor = AsyncMock(return_value=None)

                        from app.infrastructure.pronunciation_audio import generate_audio_base64

                        result = await generate_audio_base64("hello")

        assert result == "ZmFrZV9tcDNfZGF0YQ=="

    async def test_uses_slow_true_for_learners(self):
        gtts_instance = MagicMock()
        gtts_instance.write_to_fp = MagicMock()

        with patch("app.infrastructure.pronunciation_audio.gTTS", return_value=gtts_instance) as mock_gtts:
            with patch("app.infrastructure.pronunciation_audio.io.BytesIO") as mock_buf:
                mock_buf.return_value.read.return_value = b"data"
                with patch("app.infrastructure.pronunciation_audio.base64.b64encode", return_value=b"ZGF0YQ=="):
                    with patch("asyncio.get_running_loop") as mock_loop:

                        async def run_in_executor(executor, func, *args, **kwargs):
                            if callable(func):
                                return func(*args, **kwargs)
                            return None

                        mock_loop.return_value.run_in_executor = run_in_executor

                        from app.infrastructure.pronunciation_audio import generate_audio_base64

                        result = await generate_audio_base64("hello")

        mock_gtts.assert_called_once_with(text="hello", lang="en", slow=True)
        assert result == "ZGF0YQ=="

    async def test_returns_none_on_error(self):
        with patch("app.infrastructure.pronunciation_audio.gTTS", side_effect=Exception("TTS failed")):
            with patch("asyncio.get_running_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(side_effect=Exception("TTS failed"))

                from app.infrastructure.pronunciation_audio import generate_audio_base64

                result = await generate_audio_base64("hello")

        assert result is None


@pytest.mark.asyncio
class TestGeneratePronunciationAudio:
    async def test_generates_audio_for_each_error(self):
        errors = [
            {"original": "tink", "corrected": "think"},
            {"original": "sink", "corrected": "sing"},
        ]

        with patch("app.infrastructure.pronunciation_audio.generate_audio_base64", AsyncMock(return_value="base64data")):
            from app.infrastructure.pronunciation_audio import generate_pronunciation_audio

            result = await generate_pronunciation_audio(errors)

        assert len(result) == 2
        assert result[0]["word"] == "think"
        assert result[0]["mime"] == "audio/mpeg"
        assert result[1]["word"] == "sing"

    async def test_skips_errors_without_corrected(self):
        errors = [
            {"original": "tink"},
            {"original": "sink", "corrected": ""},
            {"original": "sing", "corrected": "sing"},
        ]

        with patch("app.infrastructure.pronunciation_audio.generate_audio_base64", AsyncMock(return_value="data")):
            from app.infrastructure.pronunciation_audio import generate_pronunciation_audio

            result = await generate_pronunciation_audio(errors)

        assert len(result) == 1

    async def test_skips_when_audio_generation_fails(self):
        errors = [
            {"original": "tink", "corrected": "think"},
            {"original": "sing", "corrected": "sing"},
        ]

        async def mock_generate(word: str) -> str | None:
            return "base64data" if word == "think" else None

        with patch("app.infrastructure.pronunciation_audio.generate_audio_base64", side_effect=mock_generate):
            from app.infrastructure.pronunciation_audio import generate_pronunciation_audio

            result = await generate_pronunciation_audio(errors)

        assert len(result) == 1
        assert result[0]["word"] == "think"

    async def test_empty_errors_returns_empty_list(self):
        with patch("app.infrastructure.pronunciation_audio.generate_audio_base64", AsyncMock()):
            from app.infrastructure.pronunciation_audio import generate_pronunciation_audio

            result = await generate_pronunciation_audio([])
        assert result == []
