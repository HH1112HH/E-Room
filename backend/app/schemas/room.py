from __future__ import annotations

from pydantic import BaseModel, Field


class RoomCreateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    tag_ids: list[str] = Field(default_factory=list)
    max_participants: int = Field(default=4, ge=2, le=4)
    is_public: bool = True


class RoomJoinRequest(BaseModel):
    pass


class RoomMatchRequest(BaseModel):
    tag_ids: list[str] = Field(default_factory=list)


class RoomResponse(BaseModel):
    id: str
    livekit_room_name: str
    topic: str
    tags: list[str] = Field(default_factory=list)
    agent_level: str = "basic"
    english_level: str = "any"
    status: str = "MATCHING"
    max_participants: int = 4
    current_participants: int = 0
    is_public: bool = True
    session_duration_seconds: int = 900
    enable_heartbeat: bool = True
    enable_pronunciation_correction: bool = True
    enable_voice_recognition: bool = True


class RoomDetailResponse(RoomResponse):
    participants: list[str] = Field(default_factory=list)
    messages: list[dict] = Field(default_factory=list)


class RoomUpdateRequest(BaseModel):
    topic: str | None = None
    english_level: str | None = None
    agent_level: str | None = None
    max_participants: int | None = Field(default=None, ge=2, le=4)
    session_duration_seconds: int | None = Field(default=None, ge=60, le=3600)
    is_public: bool | None = None
    enable_heartbeat: bool | None = None
    enable_pronunciation_correction: bool | None = None
    enable_voice_recognition: bool | None = None


class RoomTokenResponse(BaseModel):
    room_id: str
    room_name: str
    livekit_token: str
    livekit_url: str
