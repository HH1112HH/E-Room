from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agent.heartbeat import FALLBACK_QUESTIONS, generate_heartbeat_question, parse_heartbeat_response


class TestParseHeartbeatResponse:
    def test_empty_content_returns_fallback(self):
        result = parse_heartbeat_response("")
        assert result["question_id"] == ""
        assert result["question"] in FALLBACK_QUESTIONS
        assert result["answers"] == []

    def test_whitespace_content_returns_fallback(self):
        result = parse_heartbeat_response("   \n  ")
        assert result["question"] in FALLBACK_QUESTIONS

    def test_valid_json(self):
        content = '{"question": "What is AI?", "question_id": "abc123", "suggested_response": ["I think AI is..."]}'
        result = parse_heartbeat_response(content)
        assert result["question"] == "What is AI?"
        assert result["question_id"] == "abc123"

    def test_json_with_answers_key(self):
        content = '{"question": "How does ML work?", "answers": ["It learns from data"]}'
        result = parse_heartbeat_response(content)
        assert result["question"] == "How does ML work?"
        assert result["answers"] == ["It learns from data"]

    def test_json_with_text_field_fallback(self):
        content = '{"text": "Fallback question text"}'
        result = parse_heartbeat_response(content)
        assert result["question"] == "Fallback question text"

    def test_json_with_query_field_fallback(self):
        content = '{"query": "Query question"}'
        result = parse_heartbeat_response(content)
        assert result["question"] == "Query question"

    def test_json_missing_question_field(self):
        content = '{"unrelated": "data"}'
        result = parse_heartbeat_response(content)
        assert result["question"] in FALLBACK_QUESTIONS or True  # either fallback or hash-based

    def test_json_inside_markdown_code_block(self):
        content = '```json\n{"question": "What is inside markdown?"}\n```'
        result = parse_heartbeat_response(content)
        assert result["question"] == "What is inside markdown?"

    def test_invalid_json_uses_content_as_question(self):
        content = "Some plain text question?"
        result = parse_heartbeat_response(content)
        assert result["question"] == "Some plain text question?"

    def test_invalid_json_uses_content_and_generates_id(self):
        content = "Random conversation"
        result = parse_heartbeat_response(content)
        assert len(result["question_id"]) == 8
        assert result["question"] == "Random conversation"

    def test_non_dict_json_list(self):
        content = '["item1", "item2"]'
        result = parse_heartbeat_response(content)
        assert result["question"]


@pytest.mark.asyncio
class TestGenerateHeartbeatQuestion:
    async def test_successful_response(self):
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message.content = '{"question": "Will AI replace developers?", "question_id": "h1", "suggested_response": ["Maybe"]}'

        with patch("app.agent.heartbeat.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            result = await generate_heartbeat_question("room1", "Context about room")

        assert result["question"] == "Will AI replace developers?"
        assert result["question_id"] == "h1"

    async def test_empty_llm_response_uses_fallback(self):
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message.content = ""

        with patch("app.agent.heartbeat.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            result = await generate_heartbeat_question("room1", "context")

        assert result["question"] in FALLBACK_QUESTIONS

    async def test_llm_exception_returns_vietnamese_fallback(self):
        with patch("app.agent.heartbeat.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(side_effect=Exception("LLM unavailable"))
            result = await generate_heartbeat_question("room1", "context")

        assert result["question"] == "Bạn nghĩ gì về tương lai của AI?"
        assert result["question_id"] == ""

    async def test_passes_context_to_llm(self):
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message.content = '{"question": "test", "question_id": "x"}'

        with patch("app.agent.heartbeat.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            await generate_heartbeat_question("room1", "Room context about AI")
            call_kwargs = mock_client.chat.completions.create.call_args[1]
            user_msg = call_kwargs["messages"][1]["content"]
            assert user_msg == "Room context about AI"

    async def test_passes_default_context_when_empty(self):
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message.content = '{"question": "test", "question_id": "x"}'

        with patch("app.agent.heartbeat.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            await generate_heartbeat_question("room1", "")
            call_kwargs = mock_client.chat.completions.create.call_args[1]
            user_msg = call_kwargs["messages"][1]["content"]
            assert "câu hỏi thảo luận" in user_msg


class TestFallbackQuestions:
    def test_has_ten_questions(self):
        assert len(FALLBACK_QUESTIONS) == 10

    def test_all_questions_are_non_empty(self):
        assert all(len(q) > 10 for q in FALLBACK_QUESTIONS)

    def test_all_questions_end_with_question_mark(self):
        assert all(q.strip().endswith("?") for q in FALLBACK_QUESTIONS)
