from __future__ import annotations

from unittest.mock import patch

import pytest

from app.rag.embedding import EmbeddingService


class TestEmbeddingService:
    @pytest.fixture
    def service(self):
        return EmbeddingService()

    @pytest.mark.asyncio
    async def test_embed_query_returns_vector(self, service):
        with patch.object(service, "get_embeddings") as mock_emb:
            mock_emb.return_value.embed_query.return_value = [0.1, 0.2, 0.3]
            result = await service.embed_query("hello")
            assert len(result) == 3

    @pytest.mark.asyncio
    async def test_embed_empty_text(self, service):
        result = await service.embed_query("")
        assert len(result) == 768
        assert all(v == 0.0 for v in result)

    @pytest.mark.asyncio
    async def test_embed_batch(self, service):
        with patch.object(service, "get_embeddings") as mock_emb:
            mock_emb.return_value.embed_documents.return_value = [[0.1], [0.2]]
            results = await service.embed_batch(["hello", "world"])
            assert len(results) == 2

    @pytest.mark.asyncio
    async def test_fallback_on_failure(self, service):
        with patch.object(service, "get_embeddings", side_effect=Exception("API down")):
            result = await service.embed_query("test")
            assert len(result) == 768
            assert all(v == 0.0 for v in result)
