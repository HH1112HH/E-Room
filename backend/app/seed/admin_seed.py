from __future__ import annotations

from sqlmodel import Session, select

from app.model.user import User
from app.security import hash_password


def seed_admin_user(session: Session) -> int:
    existing = session.exec(select(User).where(User.email == "admin@gmail.com")).first()
    if existing is not None:
        return 0

    admin = User(
        email="admin@gmail.com",
        password_hash=hash_password("123456789"),
        first_name="Admin",
        last_name="Admin",
        display_name="Admin",
        is_admin=True,
        is_superuser=True,
        is_active=True,
        profile_completed=True,
        email_verified=True,
    )
    session.add(admin)
    session.commit()
    return 1
