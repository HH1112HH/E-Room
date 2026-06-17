from __future__ import annotations

from sqlmodel import Session

from app.seed.admin_seed import seed_admin_user
from app.seed.room_seed import seed_rooms
from app.seed.tag_seed import seed_default_tags


def seed_all(session: Session) -> dict[str, int]:
    return {
        "tags": seed_default_tags(session),
        "rooms": seed_rooms(session),
        "admins": seed_admin_user(session),
    }
