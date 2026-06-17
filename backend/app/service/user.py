from __future__ import annotations

from uuid import UUID

from sqlmodel import Session, select

from app.model import ModerationAction, ModerationEvent, User
from app.service.base import CRUDRepository


class UserService(CRUDRepository):
    def __init__(self, session: Session) -> None:
        self.session = session
        super().__init__(User)

    def get_by_id(self, id: UUID) -> User | None:
        return self.session.get(self.model, id)

    def get_by_email(self, email: str) -> User | None:
        return self.get_one(self.session, email=email)

    def create_user(self, user: User) -> User:
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def update_profile(self, user: User, update_data: dict) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def check_banned(self, user_id: UUID) -> str | None:
        user = self.get_by_id(user_id)
        if user is None:
            return None
        if user.is_banned:
            return user.ban_reason or "Account banned"
        if user.strikes >= 5:
            user.is_banned = True
            user.ban_reason = "Strike limit exceeded: permanent ban"
            self.session.commit()
            return user.ban_reason
        if user.strikes >= 3:
            from datetime import UTC, datetime, timedelta

            event = self.session.exec(
                select(ModerationEvent)
                .where(
                    ModerationEvent.user_id == user_id,
                    ModerationEvent.action == ModerationAction.BAN_24H,
                )
                .order_by(ModerationEvent.created_at.desc())
                .limit(1)
            ).first()
            if event:
                strike_time = event.created_at
                if strike_time.tzinfo is None:
                    strike_time = strike_time.replace(tzinfo=UTC)
                if datetime.now(UTC) - strike_time < timedelta(hours=24):
                    hours_left = int((timedelta(hours=24) - (datetime.now(UTC) - strike_time)).total_seconds() / 3600) + 1
                    return f"Temporarily banned for 24h due to strikes. ~{hours_left}h remaining."
        return None

    def get_users_batch(self, user_ids: list[UUID]) -> dict[str, str]:
        if not user_ids:
            return {}
        users = self.session.exec(select(User).where(User.id.in_(user_ids))).all()
        return {str(u.id): u.display_name for u in users}
