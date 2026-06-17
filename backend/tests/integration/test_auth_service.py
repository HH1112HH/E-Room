from __future__ import annotations

import pytest
from sqlmodel import Session

from app.service.auth import AuthService


class TestAuthService:
    @pytest.fixture
    def auth_service(self, db_session: Session, mock_redis):
        return AuthService(db_session)

    def test_register_user(self, auth_service, db_session):
        user = auth_service.register_user(
            email="new@test.com",
            password="Secure123!",
            first_name="New",
            last_name="User",
        )
        assert user.email == "new@test.com"
        assert user.display_name == "New User"

    def test_register_duplicate_email_raises_integrity_error(self, auth_service, test_user):
        from sqlalchemy.exc import IntegrityError

        with pytest.raises(IntegrityError):
            auth_service.register_user(
                email=test_user["email"],
                password="Secure123!",
                first_name="Dup",
                last_name="User",
            )

    def test_authenticate_valid(self, auth_service, test_user):
        user = auth_service.authenticate_user(email=test_user["email"], password=test_user["password"])
        assert user is not None
        assert user.email == test_user["email"]

    def test_authenticate_wrong_password(self, auth_service, test_user):
        user = auth_service.authenticate_user(email=test_user["email"], password="wrong")
        assert user is None

    def test_authenticate_nonexistent(self, auth_service):
        user = auth_service.authenticate_user(email="noone@test.com", password="pass")
        assert user is None
