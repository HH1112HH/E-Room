from __future__ import annotations

import pytest

from app.service.token_store import TokenStore


class TestTokenStore:
    @pytest.fixture
    def store(self, mock_redis):
        store = TokenStore()
        store.redis = mock_redis
        return store

    def test_blacklist_access_token(self, store, mock_redis):
        mock_redis.set.return_value = True
        store.blacklist_access_token("jti-123", ttl_seconds=900)
        mock_redis.set.assert_called_once()

    def test_is_blacklisted(self, store, mock_redis):
        mock_redis.exists.return_value = 1
        assert store.is_blacklisted("jti-123") is True

    def test_generate_secure_token(self, store):
        token = store.generate_secure_token()
        assert len(token) > 20

    def test_hash_refresh_token(self, store):
        hashed = store.hash_refresh_token("my-refresh-token")
        assert hashed != "my-refresh-token"
        assert len(hashed) > 10

    def test_store_and_validate_refresh_token(self, store, mock_redis):
        mock_redis.set.return_value = True
        mock_redis.exists.return_value = 1
        store.store_refresh_token("user-1", "token-val", ttl_seconds=3600)
        assert store.validate_refresh_token("user-1", "token-val") is True

    def test_revoke_refresh_token(self, store, mock_redis):
        mock_redis.delete.return_value = 1
        store.revoke_refresh_token("user-1", "token-hash")
        mock_redis.delete.assert_called_once()
