from __future__ import annotations

from fastapi.testclient import TestClient


class TestAuthEndpoints:
    def test_login_success(self, client: TestClient, test_user):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "wrong@test.com", "password": "longenoughpassword"},
        )
        assert response.status_code == 401

    def test_login_short_password_returns_422(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "wrong@test.com", "password": "short"},
        )
        assert response.status_code == 422

    def test_register(self, client: TestClient):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"new{unique}@test.com",
                "password": "Secure123!",
                "first_name": "New",
                "last_name": "User",
            },
        )
        assert response.status_code == 201

    def test_logout(self, client: TestClient, auth_headers, test_user):
        login = client.post(
            "/api/v1/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        refresh_token = login.json()["refresh_token"]
        response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers=auth_headers,
        )
        assert response.status_code == 200
