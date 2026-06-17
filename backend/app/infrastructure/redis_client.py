from __future__ import annotations

import json
import time
from functools import lru_cache
from typing import Any, Optional

import redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.config import settings

POOL_KWARGS = {
    "max_connections": 20,
    "retry_on_timeout": True,
    "socket_connect_timeout": 5,
    "socket_timeout": 5,
    "health_check_interval": 30,
}


@lru_cache(maxsize=1)
def get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        **POOL_KWARGS,
    )


def serialize(value: Any) -> str:
    return value if isinstance(value, str) else json.dumps(value, default=str)


def deserialize(raw: Optional[str]) -> Any:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


RATE_LIMIT_SCRIPT = """
    local key = KEYS[1]
    local max_requests = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local current = redis.call('INCR', key)
    if current == 1 then
        redis.call('EXPIRE', key, window)
    end
    local remaining = max_requests - current
    return {current, remaining}
"""


class RedisCRUD:
    def __init__(self, client: Optional[redis.Redis] = None) -> None:
        self.client = client or get_redis_client()
        self.rate_limit_script = self.client.register_script(RATE_LIMIT_SCRIPT)

    def ping(self) -> bool:
        try:
            return self.client.ping()
        except (RedisConnectionError, RedisTimeoutError):
            return False

    def get(self, key: str) -> Optional[str]:
        return self.client.get(key)

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        return self.client.set(key, value, ex=ttl)

    def setnx(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        acquired = self.client.set(key, value, nx=True, ex=ttl)
        return bool(acquired)

    def delete(self, *keys: str) -> int:
        return self.client.delete(*keys)

    def exists(self, *keys: str) -> int:
        return self.client.exists(*keys)

    def keys(self, pattern: str = "*") -> list[str]:
        return self.client.keys(pattern)

    def expire(self, key: str, ttl: int) -> bool:
        return self.client.expire(key, ttl)

    def ttl(self, key: str) -> int:
        return self.client.ttl(key)

    def incr(self, key: str, amount: int = 1) -> int:
        return self.client.incr(key, amount)

    def decr(self, key: str, amount: int = 1) -> int:
        return self.client.decr(key, amount)

    def get_json(self, key: str) -> Optional[Any]:
        raw = self.client.get(key)
        return deserialize(raw)

    def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        return self.client.set(key, serialize(value), ex=ttl)

    def get_json_multi(self, keys: list[str]) -> dict[str, Any]:
        if not keys:
            return {}
        raw_values = self.client.mget(keys)
        return {k: deserialize(v) for k, v in zip(keys, raw_values) if v is not None}

    def set_json_multi(self, mapping: dict[str, Any], ttl: Optional[int] = None) -> bool:
        pipe = self.client.pipeline()
        for key, value in mapping.items():
            pipe.set(key, serialize(value), ex=ttl)
        pipe.execute()
        return True

    def hget(self, name: str, key: str) -> Optional[str]:
        return self.client.hget(name, key)

    def hset(self, name: str, key: str, value: str) -> int:
        return self.client.hset(name, key, value)

    def hgetall(self, name: str) -> dict[str, str]:
        return self.client.hgetall(name)

    def hmset(self, name: str, mapping: dict[str, str]) -> bool:
        return self.client.hmset(name, mapping)

    def hdel(self, name: str, *keys: str) -> int:
        return self.client.hdel(name, *keys)

    def sadd(self, name: str, *values: str) -> int:
        return self.client.sadd(name, *values)

    def smembers(self, name: str) -> set[str]:
        return self.client.smembers(name)

    def srem(self, name: str, *values: str) -> int:
        return self.client.srem(name, *values)

    def scard(self, name: str) -> int:
        return self.client.scard(name)

    def zadd(self, name: str, mapping: dict[str, float]) -> int:
        return self.client.zadd(name, mapping)

    def zrange(self, name: str, start: int, end: int, withscores: bool = False) -> list:
        return self.client.zrange(name, start, end, withscores=withscores)

    def zrem(self, name: str, *values: str) -> int:
        return self.client.zrem(name, *values)

    def zcard(self, name: str) -> int:
        return self.client.zcard(name)

    def zrank(self, name: str, value: str) -> Optional[int]:
        return self.client.zrank(name, value)

    def publish(self, channel: str, message: Any) -> int:
        return self.client.publish(channel, serialize(message))

    def pubsub(self) -> redis.client.PubSub:
        return self.client.pubsub()

    def acquire_lock(self, lock_name: str, ttl: int = 10) -> bool:
        return self.setnx(f"eroom:lock:{lock_name}", str(time.time()), ttl)

    def release_lock(self, lock_name: str) -> int:
        return self.delete(f"eroom:lock:{lock_name}")

    def rate_limit(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        current, remaining = self.rate_limit_script(keys=[key], args=[max_requests, window_seconds])
        current = int(current)
        remaining = int(remaining)
        return remaining >= 0, max(remaining, 0)


class RateLimiter:
    def __init__(self, client: Optional[redis.Redis] = None) -> None:
        self.crud = RedisCRUD(client)

    def check(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int = 10,
        window_seconds: int = 60,
    ) -> tuple[bool, int]:
        key = f"eroom:ratelimit:{identifier}:{endpoint}"
        return self.crud.rate_limit(key, max_requests, window_seconds)

    def check_login(self, ip_address: str) -> tuple[bool, int]:
        return self.check(ip_address, "login", max_requests=5, window_seconds=900)

    def check_tts(self, user_id: str, session_id: str) -> tuple[bool, int]:
        return self.check(f"{user_id}:{session_id}", "tts", max_requests=10, window_seconds=3600)
