from fastapi import APIRouter

from app.api.routers import (
    audio,
    auth,
    conversation,
    health,
    infra,
    leaderboard,
    message,
    notes,
    notification,
    room,
    series,
    subscription,
    tag,
    user,
)

api_router = APIRouter()
api_router.include_router(health, tags=["health"])
api_router.include_router(auth, prefix="/auth", tags=["auth"])
api_router.include_router(user, prefix="/users", tags=["users"])
api_router.include_router(tag, prefix="/tags", tags=["tags"])
api_router.include_router(room, prefix="/rooms", tags=["rooms"])
api_router.include_router(conversation, prefix="/sessions", tags=["sessions"])
api_router.include_router(message, prefix="/messages", tags=["messages"])
api_router.include_router(notes, prefix="/notes", tags=["notes"])
api_router.include_router(series, prefix="/series", tags=["series"])
api_router.include_router(leaderboard, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(notification, prefix="/notifications", tags=["notifications"])
api_router.include_router(audio, prefix="", tags=["audio"])
api_router.include_router(infra, prefix="/infra", tags=["infra"])
api_router.include_router(subscription, prefix="/subscriptions", tags=["subscriptions"])
