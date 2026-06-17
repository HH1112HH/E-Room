from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.api.dependencies import get_db_session
from app.api.routers.infra import rate_limit_login
from app.main import app
from app.security import hash_password

TEST_DATABASE_URL = "sqlite:///./test_eroom.db"
WEIGHT_DIR = Path(__file__).parent.parent / "app" / "weight"


def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: End-to-end tests requiring all services")
    config.addinivalue_line("markers", "slow: Tests taking >30s (model loads)")
    config.addinivalue_line("markers", "requires_llm: Tests calling external LLM API")
    config.addinivalue_line("markers", "requires_redis: Tests requiring Redis")
    config.addinivalue_line("markers", "requires_db: Tests requiring database")


@pytest.fixture(scope="session", autouse=True)
def setup_env():
    os.environ.setdefault("SUPERTONIC_CACHE_DIR", str(WEIGHT_DIR / "supertonic"))


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
    SQLModel.metadata.create_all(engine)
    yield engine
    try:
        os.remove("./test_eroom.db")
    except OSError:
        pass


@pytest.fixture(scope="function")
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def override_get_session():
        yield db_session

    async def override_rate_limit(request=None):
        pass

    app.dependency_overrides[get_db_session] = override_get_session
    app.dependency_overrides[rate_limit_login] = override_rate_limit
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    from app.model.user import User

    user = User(
        email="test@example.com",
        password_hash=hash_password("password123"),
        first_name="Test",
        last_name="User",
        display_name="Test User",
        english_level="B1",
        learning_goal="Improve speaking",
        profile_completed=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return {"id": str(user.id), "email": user.email, "password": "password123", "display_name": user.display_name}


@pytest.fixture
def auth_headers(client, test_user):
    response = client.post("/api/v1/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {"Authorization": "Bearer fake-token"}


@pytest.fixture
def mock_redis():
    with patch("app.infrastructure.redis_client.RedisCRUD") as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_livekit():
    with patch("app.infrastructure.livekit.LiveKitService") as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance
        yield mock_instance
