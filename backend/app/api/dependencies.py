from __future__ import annotations

from collections.abc import Generator

from fastapi import HTTPException, Query, Request
from sqlmodel import Session

from app.database import get_session


def get_pagination_params(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)) -> tuple[int, int]:
    return skip, limit


def get_current_user(request: Request) -> dict[str, str]:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(
            status_code=403,
            detail="Not authenticated",
        )
    return user


def get_db_session() -> Generator[Session, None, None]:
    yield from get_session()
