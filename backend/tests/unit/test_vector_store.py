from __future__ import annotations

import pytest

from app.rag.vector_store import NumpyVectorStore


class TestNumpyVectorStore:
    @pytest.fixture
    def store(self):
        return NumpyVectorStore()

    def test_add_and_search(self, store):
        store.store_embeddings(
            [
                {"chunk_id": "c1", "embedding": [0.1, 0.2, 0.3], "text": "doc1"},
                {"chunk_id": "c2", "embedding": [0.4, 0.5, 0.6], "text": "doc2"},
            ]
        )
        results = store.similarity_search([0.1, 0.2, 0.3], top_k=5)
        assert len(results) > 0
        assert results[0]["chunk_id"] == "c1"

    def test_empty_store_search(self, store):
        results = store.similarity_search([0.1, 0.2, 0.3], top_k=5)
        assert len(results) == 0

    def test_delete_by_document(self, store):
        store.store_embeddings(
            [
                {"chunk_id": "c1", "embedding": [0.1], "text": "doc1", "document_id": "doc1"},
            ]
        )
        deleted = store.delete_by_document("doc1")
        assert deleted == 1
        assert store.count() == 0

    def test_count(self, store):
        store.store_embeddings(
            [
                {"chunk_id": "c1", "embedding": [0.1], "text": "a"},
                {"chunk_id": "c2", "embedding": [0.2], "text": "b"},
            ]
        )
        assert store.count() == 2

    def test_search_with_tag_filter(self, store):
        store.store_embeddings(
            [
                {"chunk_id": "c1", "embedding": [1.0, 0.0], "text": "a", "tag_id": "tag1"},
                {"chunk_id": "c2", "embedding": [0.0, 1.0], "text": "b", "tag_id": "tag2"},
            ]
        )
        results = store.similarity_search([1.0, 0.0], top_k=5, tag_id="tag1")
        assert len(results) == 1
        assert results[0]["chunk_id"] == "c1"
