from __future__ import annotations

from fastapi.testclient import TestClient


class TestRoomEndpoints:
    def test_list_rooms(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/rooms", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_room_by_id(self, client: TestClient, auth_headers):
        import uuid

        response = client.get(f"/api/v1/rooms/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_create_room(self, client: TestClient, auth_headers):
        import uuid

        response = client.post(
            "/api/v1/rooms",
            json={"topic": f"test-room-{uuid.uuid4().hex[:8]}"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "topic" in data

    def test_create_room_with_extra_fields(self, client: TestClient, auth_headers):
        response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "topic": "testing", "language": "en"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 422)
