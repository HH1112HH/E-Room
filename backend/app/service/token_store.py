from __future__ import annotations

import hashlib
import secrets

from app.infrastructure.redis_client import RedisCRUD, get_redis_client


class TokenStore:
    PREFIX_BLACKLIST = "engconnect:blacklist:token"
    PREFIX_REFRESH = "engconnect:refresh"

    def __init__(self) -> None:
        self.redis = RedisCRUD(get_redis_client())

    def blacklist_access_token(self, jti: str, ttl_seconds: int) -> None:
        self.redis.set(f"{self.PREFIX_BLACKLIST}:{jti}", "1", ttl=ttl_seconds)

    def is_blacklisted(self, jti: str) -> bool:
        return self.redis.exists(f"{self.PREFIX_BLACKLIST}:{jti}") > 0

    def hash_refresh_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def store_refresh_token(self, user_id: str, token: str, ttl_seconds: int) -> str:
        token_hash = self.hash_refresh_token(token)
        key = f"{self.PREFIX_REFRESH}:{user_id}:{token_hash}"
        self.redis.set(key, "1", ttl=ttl_seconds)
        return token_hash

    def validate_refresh_token(self, user_id: str, token: str) -> bool:
        token_hash = self.hash_refresh_token(token)
        key = f"{self.PREFIX_REFRESH}:{user_id}:{token_hash}"
        return self.redis.exists(key) > 0

    def revoke_refresh_token(self, user_id: str, token_hash: str) -> None:
        self.redis.delete(f"{self.PREFIX_REFRESH}:{user_id}:{token_hash}")

    def revoke_all_user_tokens(self, user_id: str) -> None:
        keys = self.redis.keys(f"{self.PREFIX_REFRESH}:{user_id}:*")
        if keys:
            self.redis.delete(*keys)

    def generate_secure_token(self, byte_length: int = 32) -> str:
        return secrets.token_urlsafe(byte_length)
