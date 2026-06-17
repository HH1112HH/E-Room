from __future__ import annotations


class TestUnicodeEdgeCases:
    def test_vietnamese_display_name(self, client):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"vn{unique}@test.com",
                "password": "Pass123!",
                "first_name": "Nguyễn",
                "last_name": "Văn A",
            },
        )
        assert response.status_code == 201
        assert response.json()["display_name"] == "Nguyễn Văn A"

    def test_vietnamese_topic(self, client, auth_headers):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/rooms",
            json={
                "name": f"room-{unique}",
                "topic": "Tiếng Anh cho người đi làm",
                "language": "en",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)

    def test_emoji_in_name(self, client):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"emoji{unique}@test.com",
                "password": "Pass123!",
                "first_name": "😀🎉🔥",
                "last_name": "User",
            },
        )
        assert response.status_code == 201

    def test_arabic_chinese_mixed(self, client, auth_headers):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/rooms",
            json={
                "name": f"room-{unique}",
                "topic": "Hello 你好 مرحبا",
                "language": "en",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)


class TestInputValidation:
    def test_empty_json_body(self, client):
        response = client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422

    def test_null_values(self, client):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"null{unique}@test.com",
                "password": "Pass123!",
                "first_name": None,
                "last_name": None,
            },
        )
        assert response.status_code == 422

    def test_extra_fields(self, client):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"extra{unique}@test.com",
                "password": "Pass123!",
                "first_name": "Test",
                "last_name": "User",
                "role": "admin",
            },
        )
        assert response.status_code == 201

    def test_xss_in_display_name(self, client):
        import uuid

        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": f"xss{unique}@test.com",
                "password": "Pass123!",
                "first_name": "<script>alert('xss')</script>",
                "last_name": "User",
            },
        )
        assert response.status_code == 201


class TestHttpMethods:
    def test_wrong_content_type(self, client):
        response = client.post("/api/v1/auth/login", content=b"email=test&password=pass", headers={"Content-Type": "application/x-www-form-urlencoded"})
        assert response.status_code == 422

    def test_unsupported_method(self, client):
        response = client.put("/api/v1/auth/login", json={"email": "test@test.com", "password": "longenough"})
        assert response.status_code == 405


class TestConcurrencySimulation:
    def test_rapid_registration_same_email(self, client):
        import uuid

        email = f"rapid{uuid.uuid4().hex[:8]}@test.com"
        payload = {"email": email, "password": "Pass123!", "first_name": "Test", "last_name": "User"}
        r1 = client.post("/api/v1/auth/register", json=payload)
        r2 = client.post("/api/v1/auth/register", json=payload)
        assert r1.status_code == 201
        assert r2.status_code == 409
