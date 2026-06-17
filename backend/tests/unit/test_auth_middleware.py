from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import Request

from app.api.middleware.auth import AuthMiddleware


@pytest.fixture
def middleware():
    return AuthMiddleware(MagicMock())


async def ok_handler(req):
    from starlette.responses import JSONResponse

    return JSONResponse({"ok": True})


def make_request(path: str, token: str = "") -> Request:
    headers = [(b"authorization", f"Bearer {token}".encode())] if token else []
    scope = {
        "type": "http",
        "method": "GET",
        "path": path,
        "headers": headers,
    }
    return Request(scope)


class TestAuthMiddlewarePublicPaths:
    @pytest.mark.parametrize(
        "path",
        [
            "/health",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/docs",
        ],
    )
    @pytest.mark.asyncio
    async def test_public_path_passes_through(self, middleware, path):
        request = make_request(path)
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_ws_path_passes_through(self, middleware):
        request = make_request("/ws/rooms/abc")
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 200


class TestAuthMiddlewareToken:
    @pytest.mark.asyncio
    async def test_no_token_returns_403(self, middleware):
        request = make_request("/api/v1/rooms")
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 403
        body = response.body.decode()
        assert "Not authenticated" in body

    @patch("app.api.middleware.auth.decode_token")
    @pytest.mark.asyncio
    async def test_invalid_token_returns_403(self, mock_decode, middleware):
        mock_decode.return_value = None
        request = make_request("/api/v1/rooms", "invalid-token")
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 403
        assert "Invalid or expired token" in response.body.decode()

    @patch("app.api.middleware.auth.decode_token")
    @patch("app.api.middleware.auth.TokenStore")
    @pytest.mark.asyncio
    async def test_blacklisted_token_returns_403(self, mock_store_cls, mock_decode, middleware):
        mock_decode.return_value = {"jti": "revoked-jti", "sub": "user-1"}
        mock_store = MagicMock()
        mock_store.is_blacklisted.return_value = True
        mock_store_cls.return_value = mock_store
        request = make_request("/api/v1/rooms", "blacklisted-token")
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 403

    @patch("app.api.middleware.auth.decode_token")
    @patch("app.api.middleware.auth.TokenStore")
    @pytest.mark.asyncio
    async def test_valid_token_sets_user_state(self, mock_store_cls, mock_decode, middleware):
        mock_decode.return_value = {"jti": "valid-jti", "sub": "user-123"}
        mock_store = MagicMock()
        mock_store.is_blacklisted.return_value = False
        mock_store_cls.return_value = mock_store
        request = make_request("/api/v1/rooms", "valid-token")
        response = await middleware.dispatch(request, ok_handler)
        assert response.status_code == 200
        assert request.state.user == {"id": "user-123"}
