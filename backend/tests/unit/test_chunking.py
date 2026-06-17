from __future__ import annotations

import pytest

from app.rag.chunking import ChunkResult, TextChunker, split_text


class TestTextChunker:
    @pytest.fixture
    def chunker(self):
        return TextChunker(chunk_size=100, chunk_overlap=10)

    def test_chunk_short_text(self, chunker):
        chunks = chunker.chunk_text("Hello world")
        assert len(chunks) == 1
        assert chunks[0] == "Hello world"

    def test_chunk_long_text(self, chunker):
        text = "word " * 200
        chunks = chunker.chunk_text(text)
        assert len(chunks) > 1

    def test_chunk_empty_text(self, chunker):
        assert chunker.chunk_text("") == []

    def test_chunk_whitespace_only(self, chunker):
        assert chunker.chunk_text("   ") == []

    def test_split_text_function(self):
        chunks = split_text("hello world")
        assert len(chunks) == 1

    def test_chunk_documents(self, chunker):
        docs = [{"text": "hello world"}, {"text": "foo bar baz"}]
        results = chunker.chunk_documents(docs)
        assert len(results) == 2
        assert isinstance(results[0], ChunkResult)
