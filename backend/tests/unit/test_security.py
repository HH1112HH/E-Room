from __future__ import annotations

from datetime import timedelta

from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

RAW_PW = "MySecretPass123!"
HASHED = hash_password(RAW_PW)


class TestPassword:
    def test_hash_and_verify(self):
        assert verify_password(RAW_PW, HASHED) is True

    def test_verify_wrong_password(self):
        assert verify_password("wrong", HASHED) is False

    def test_verify_no_hash(self):
        assert verify_password("pass", None) is False

    def test_hash_token(self):
        h = hash_token("my-token")
        assert h != "my-token"
        assert len(h) == 64


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(subject="user-123")
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"

    def test_expired_token_returns_none(self):
        token = create_access_token(subject="user", expires_delta=timedelta(seconds=-1))
        payload = decode_token(token)
        assert payload is None

    def test_refresh_token(self):
        token = create_refresh_token(subject="user-1")
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_token_has_claims(self):
        token = create_access_token(subject="user-1")
        payload = decode_token(token)
        assert "jti" in payload
        assert "exp" in payload
        assert "iat" in payload
