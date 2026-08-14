from __future__ import annotations

from pydantic import BaseModel, Field


class SessionResponse(BaseModel):
    id: str
    room_id: str
    user_id: str
    topic: str | None = None
    name: str | None = None
    room_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    transcript: str | None = None
    overall_score: float | None = None
    score: float | None = None
    duration_seconds: int = 0
    duration: int = 0
    created_at: str | None = None
    participants: int | None = None
    review: dict | None = None
    corrections: list[dict] = Field(default_factory=list)
    expert_responses: list[dict] = Field(default_factory=list)


class SessionNoteResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    content: str
    tags: list[str] = Field(default_factory=list)
    word_count: int = 0