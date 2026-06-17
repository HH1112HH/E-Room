from __future__ import annotations

import pytest

from app.infrastructure.redis_client import RateLimiter, RedisCRUD


def redis_available() -> bool:
    try:
        import redis

        r = redis.Redis.from_url("redis://localhost:6379/0")
        return r.ping()
    except Exception:
        return False


@pytest.mark.skipif(not redis_available(), reason="Requires Redis server")
class TestRedisCRUDIntegration:
    def test_set_and_get_roundtrip(self) -> None:
        crud = RedisCRUD()
        crud.set("test_key", "test_value", ttl=60)
        result = crud.get("test_key")
        assert result == "test_value"
        crud.delete("test_key")

    def test_exists_returns_true_for_existing_key(self) -> None:
        crud = RedisCRUD()
        crud.set("test_exists", "1", ttl=60)
        assert crud.exists("test_exists") > 0
        crud.delete("test_exists")

    def test_exists_returns_zero_for_missing_key(self) -> None:
        crud = RedisCRUD()
        assert crud.exists("nonexistent_key_xyz") == 0

    def test_delete_removes_key(self) -> None:
        crud = RedisCRUD()
        crud.set("test_delete", "value", ttl=60)
        crud.delete("test_delete")
        assert crud.exists("test_delete") == 0

    def test_setnx_acquires_lock_once(self) -> None:
        crud = RedisCRUD()
        key = "test_setnx_lock"
        assert crud.setnx(key, "1", ttl=5) is True
        assert crud.setnx(key, "1", ttl=5) is False
        crud.delete(key)

    def test_incr_and_decr(self) -> None:
        crud = RedisCRUD()
        key = "test_counter"
        crud.delete(key)
        assert crud.incr(key) == 1
        assert crud.incr(key, 5) == 6
        assert crud.decr(key, 3) == 3
        crud.delete(key)

    def test_get_json_and_set_json_roundtrip(self) -> None:
        crud = RedisCRUD()
        data = {"name": "user", "count": 5}
        crud.set_json("test_json", data, ttl=60)
        result = crud.get_json("test_json")
        assert result == data
        crud.delete("test_json")

    def test_publish_and_subscribe(self) -> None:
        crud = RedisCRUD()
        pubsub = crud.pubsub()
        pubsub.subscribe("test_channel")
        crud.publish("test_channel", {"msg": "hello"})
        pubsub.close()

    def test_hset_and_hget(self) -> None:
        crud = RedisCRUD()
        crud.hset("test_hash", "field1", "value1")
        assert crud.hget("test_hash", "field1") == "value1"
        crud.delete("test_hash")

    def test_sadd_and_smembers(self) -> None:
        crud = RedisCRUD()
        crud.sadd("test_set", "a", "b", "c")
        members = crud.smembers("test_set")
        assert members == {"a", "b", "c"}
        crud.delete("test_set")

    def test_zadd_and_zrange(self) -> None:
        crud = RedisCRUD()
        crud.zadd("test_zset", {"a": 1.0, "b": 2.0, "c": 3.0})
        result = crud.zrange("test_zset", 0, -1, withscores=True)
        assert len(result) == 3
        crud.delete("test_zset")

    def test_rate_limit_allows_within_window(self) -> None:
        crud = RedisCRUD()
        key = "test_ratelimit"
        crud.delete(key)
        allowed, remaining = crud.rate_limit(key, max_requests=3, window_seconds=10)
        assert allowed is True
        assert remaining == 2
        crud.delete(key)

    def test_rate_limit_blocks_after_max(self) -> None:
        crud = RedisCRUD()
        key = "test_ratelimit_block"
        crud.delete(key)
        crud.rate_limit(key, max_requests=2, window_seconds=10)
        crud.rate_limit(key, max_requests=2, window_seconds=10)
        allowed, remaining = crud.rate_limit(key, max_requests=2, window_seconds=10)
        assert allowed is False
        assert remaining == 0
        crud.delete(key)


@pytest.mark.skipif(not redis_available(), reason="Requires Redis server")
class TestRateLimiterIntegration:
    def test_check_returns_allowed_and_remaining(self) -> None:
        limiter = RateLimiter()
        allowed, remaining = limiter.check("test_user", "endpoint", max_requests=5)
        assert isinstance(allowed, bool)
        assert isinstance(remaining, int)

    def test_check_login_uses_login_endpoint(self) -> None:
        limiter = RateLimiter()
        allowed, remaining = limiter.check_login("192.168.1.1")
        assert isinstance(allowed, bool)
        assert isinstance(remaining, int)

    def test_check_tts_uses_user_session(self) -> None:
        limiter = RateLimiter()
        allowed, remaining = limiter.check_tts("user123", "session456")
        assert isinstance(allowed, bool)
        assert isinstance(remaining, int)
