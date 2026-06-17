from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.infrastructure.redis_client import RedisCRUD


class TestRedisCRUD:
    @pytest.fixture
    def crud(self, mock_redis):
        mock_redis.get.return_value = "value"
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = 1
        mock_redis.expire.return_value = True
        mock_redis.ttl.return_value = 30
        mock_redis.keys.return_value = ["key1", "key2"]
        return RedisCRUD(mock_redis)

    def test_set_and_get(self, crud):
        crud.set("key", "value")
        assert crud.get("key") == "value"

    def test_delete(self, crud):
        assert crud.delete("key") == 1

    def test_exists(self, crud):
        assert crud.exists("key") > 0

    def test_expire(self, crud):
        assert crud.expire("key", 60) is True

    def test_ttl(self, crud):
        assert crud.ttl("key") == 30

    def test_keys(self, crud):
        assert len(crud.keys("pattern*")) == 2

    def test_set_json_and_get_json(self, crud):
        import json

        crud.client.get.return_value = json.dumps({"a": 1})
        crud.set_json("key", {"a": 1})
        assert crud.get_json("key") == {"a": 1}

    def test_init_without_client_uses_default(self) -> None:
        crud = RedisCRUD()
        assert crud.ping() is not None

    def test_init_with_custom_client(self) -> None:
        client = MagicMock()
        client.ping.return_value = True
        crud = RedisCRUD(client)
        assert crud.ping() is True
