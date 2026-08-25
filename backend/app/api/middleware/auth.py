from __future__ import annotations

from uuid import UUID

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.log import get_logger
from app.security import decode_token
from app.service.token_store import TokenStore

log = get_logger(__name__)

PUBLIC_PATHS = {
    "/",
    "/health",
    "/api/v1/health",
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout",
    "/api/v1/infra/status",
    "/api/v1/infra/health",
    "/api/v1/infra/health/live",
    "/api/v1/audio/test-transcribe",

    "/docs",
    "/openapi.json",
    "/redoc",
}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if request.method == "OPTIONS":
            return await call_next(request)

        if path in PUBLIC_PATHS or path.startswith("/ws/"):
            return await call_next(request)

        if request.method == "GET" and (path == "/api/v1/rooms" or path.startswith("/api/v1/rooms/")):
            return await call_next(request)

        token = request.cookies.get("access_token") or request.headers.get("authorization", "").replace("Bearer ", "")

        if not token:
            return JSONResponse(
                status_code=403,
                content={"detail": "Not authenticated"},
            )

        payload = decode_token(token)
        if payload is None:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or expired token"},
            )

        jti = payload.get("jti")
        if jti:
            try:
                token_store = TokenStore()
                if token_store.is_blacklisted(jti):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Token has been revoked"},
                    )
            except Exception:
                log.warning("Kiem tra token bi thu hoi that bai")

        user_id = payload.get("sub")
        if not user_id:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid token payload"},
            )

        try:
            from sqlmodel import Session

            from app.database import engine
            from app.service.user import UserService

            with Session(engine) as session:
                reason = UserService(session).check_banned(UUID(user_id))
                if reason:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": reason},
                    )
        except Exception:
            log.warning("Kiem tra trang thai cam that bai", exc_info=True)

        request.state.user = {"id": user_id}

        return await call_next(request)
