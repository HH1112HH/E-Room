from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import Request
from starlette.responses import JSONResponse

from app.api.middleware.logging import LoggingMiddleware


@pytest.fixture
def middleware():
    return LoggingMiddleware(MagicMock())


@pytest.mark.anyio
@patch("app.api.middleware.logging.log")
async def test_logging_middleware_logs_method_path_status(mock_log, middleware):
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": [],
    }
    request = Request(scope)

    async def call_next(req):
        return JSONResponse({"ok": True}, status_code=200)

    response = await middleware.dispatch(request, call_next)
    assert response.status_code == 200
    mock_log.info.assert_called_once()
    args, _ = mock_log.info.call_args
    assert args[1] == "POST"
    assert args[2] == "/api/v1/auth/login"
