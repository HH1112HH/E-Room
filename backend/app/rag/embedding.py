from __future__ import annotations

import asyncio
import hashlib
import json

from langchain_openai import OpenAIEmbeddings

from app.config import settings
from app.log import get_logger

logger = get_logger(__name__)

DEFAULT_EMBEDDING_DIM = 768
BATCH_SIZE = 20


def cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:32]


def get_embedding_model(model_name: str = "") -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=model_name or settings.embedding_model,
        api_key=settings.llm_api_key,
        base_url=settings.embedding_base_url or settings.llm_base_url,
    )


class EmbeddingService:
    def __init__(self, model_name: str = "") -> None:
        self.model_name = model_name
        self.cache: dict[str, list[float]] = {}
        self.dim = DEFAULT_EMBEDDING_DIM
        self.emb: OpenAIEmbeddings | None = None

    def get_embeddings(self) -> OpenAIEmbeddings:
        if self.emb is None:
            self.emb = get_embedding_model(self.model_name)
        return self.emb

    def load_from_redis(self, key: str) -> list[float] | None:
        try:
            from app.infrastructure.redis_client import RedisCRUD

            redis = RedisCRUD()
            cached = redis.get(f"emb:{key}")
            if cached:
                return json.loads(cached)
        except Exception:
            pass
        return None

    def save_to_redis(self, key: str, vector: list[float]) -> None:
        try:
            from app.infrastructure.redis_client import RedisCRUD

            redis = RedisCRUD()
            redis.set(f"emb:{key}", json.dumps(vector), ttl=86400)
        except Exception:
            pass

    def zero_vector(self) -> list[float]:
        return [0.0] * self.dim

    async def embed_query(self, text: str) -> list[float]:
        if not text or not text.strip():
            return self.zero_vector()

        key = cache_key(text)

        if key in self.cache:
            return self.cache[key]

        redis_val = self.load_from_redis(key)
        if redis_val is not None:
            self.cache[key] = redis_val
            return redis_val

        try:
            emb = self.get_embeddings()
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, emb.embed_query, text)
        except Exception as e:
            logger.warning("embed_failed", extra={"error": str(e)})
            result = self.zero_vector()

        self.cache[key] = result
        self.save_to_redis(key, result)
        return result

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        results: list[list[float] | None] = [None] * len(texts)
        uncached: list[tuple[int, str]] = []

        for idx, text in enumerate(texts):
            if not text or not text.strip():
                results[idx] = self.zero_vector()
                continue

            key = cache_key(text)

            if key in self.cache:
                results[idx] = self.cache[key]
                continue

            redis_val = self.load_from_redis(key)
            if redis_val is not None:
                self.cache[key] = redis_val
                results[idx] = redis_val
                continue

            uncached.append((idx, text))

        if not uncached:
            return [r for r in results if r is not None]

        emb = self.get_embeddings()
        loop = asyncio.get_running_loop()

        for batch_start in range(0, len(uncached), BATCH_SIZE):
            batch = uncached[batch_start : batch_start + BATCH_SIZE]
            batch_texts = [t for _, t in batch]
            batch_indices = [i for i, _ in batch]

            try:
                vectors = await loop.run_in_executor(None, emb.embed_documents, batch_texts)
            except Exception as e:
                logger.warning("embed_batch_failed", extra={"error": str(e)})
                vectors = [self.zero_vector() for _ in batch_texts]

            for i, vec in zip(batch_indices, vectors):
                results[i] = vec
                key = cache_key(texts[i])
                self.cache[key] = vec
                self.save_to_redis(key, vec)

        final: list[list[float]] = []
        for r in results:
            final.append(r if r is not None else self.zero_vector())
        return final

    async def embed_text(self, text: str) -> list[float]:
        return await self.embed_query(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await self.embed_texts(texts)
