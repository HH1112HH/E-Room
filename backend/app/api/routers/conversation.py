from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.dependencies import get_current_user, get_db_session, get_pagination_params
from app.model import Room, Session as SessionModel
from app.schemas import SessionResponse
from app.service.conversation import SessionService

router = APIRouter()


def serialize_session(item: SessionModel, room_name: str | None = None) -> SessionResponse:
    review = item.ai_review or None
    corrections = list(item.corrections or []) if item.corrections else []
    if review and not corrections and review.get("corrections"):
        corrections = list(review["corrections"])
    expert_responses = list(review.get("expert_responses", [])) if review else []
    return SessionResponse(
        id=str(item.id),
        room_id=str(item.room_id),
        user_id=str(item.user_id),
        topic=item.topic,
        name=item.topic,
        room_name=room_name or item.topic,
        tags=item.tags,
        transcript=item.transcript,
        overall_score=item.overall_score,
        score=item.overall_score,
        duration_seconds=item.duration_seconds,
        duration=item.duration_seconds,
        created_at=item.created_at.isoformat() if item.created_at else None,
        review=review,
        corrections=corrections,
        expert_responses=expert_responses,
    )


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(pagination: tuple[int, int] = Depends(get_pagination_params), session: Session = Depends(get_db_session)) -> list[SessionResponse]:
    session_service = SessionService(session)
    skip, limit = pagination
    sessions = session_service.list_all(skip=skip, limit=limit)
    return [serialize_session(item) for item in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
) -> SessionResponse:
    session_service = SessionService(session)
    item = session_service.get_by_id(session_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    room = session.get(Room, item.room_id) if item.room_id else None
    return serialize_session(item, room_name=room.topic if room else None)


@router.get("/rooms/{room_id}", response_model=list[SessionResponse])
async def list_room_sessions(room_id: UUID, session: Session = Depends(get_db_session)) -> list[SessionResponse]:
    session_service = SessionService(session)
    items = session_service.list_sessions_for_room(room_id)
    return [serialize_session(item) for item in items]