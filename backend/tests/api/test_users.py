from __future__ import annotations

from fastapi.testclient import TestClient


class TestUserEndpoints:
    def test_get_profile(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert "email" in response.json()

    def test_update_profile_patch(self, client: TestClient, auth_headers):
        response = client.patch(
            "/api/v1/auth/me",
            json={"first_name": "Updated", "last_name": "Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
