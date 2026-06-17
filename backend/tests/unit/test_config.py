from __future__ import annotations

from app.config import settings


class TestSettings:
    def test_default_app_name(self):
        assert settings.app_name == "E-Room API"

    def test_default_app_env(self):
        assert settings.app_env == "development"

    def test_default_secret_key_exists(self):
        assert hasattr(settings, "secret_key")

    def test_llm_base_url_from_env(self):
        assert settings.llm_base_url == "http://localhost:8012/v1"

    def test_default_algorithm(self):
        assert settings.algorithm == "HS256"
