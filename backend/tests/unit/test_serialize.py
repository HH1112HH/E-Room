from __future__ import annotations

import json

from app.infrastructure.redis_client import deserialize, serialize


class TestSerialize:
    def test_serialize_string_returns_same(self) -> None:
        result = serialize("hello world")
        assert result == "hello world"

    def test_serialize_dict_returns_json(self) -> None:
        result = serialize({"key": "value", "num": 42})
        parsed = json.loads(result)
        assert parsed == {"key": "value", "num": 42}

    def test_serialize_list_returns_json(self) -> None:
        result = serialize([1, 2, 3])
        parsed = json.loads(result)
        assert parsed == [1, 2, 3]

    def test_serialize_none_returns_null_string(self) -> None:
        result = serialize(None)
        assert result == "null"

    def test_serialize_int_returns_string(self) -> None:
        result = serialize(42)
        assert result == "42"

    def test_serialize_bool_returns_string(self) -> None:
        result = serialize(True)
        assert result == "true"


class TestDeserialize:
    def test_deserialize_none_returns_none(self) -> None:
        result = deserialize(None)
        assert result is None

    def test_deserialize_json_object(self) -> None:
        result = deserialize('{"a": 1, "b": 2}')
        assert result == {"a": 1, "b": 2}

    def test_deserialize_json_array(self) -> None:
        result = deserialize("[1, 2, 3]")
        assert result == [1, 2, 3]

    def test_deserialize_json_null(self) -> None:
        result = deserialize("null")
        assert result is None

    def test_deserialize_plain_string_returns_as_is(self) -> None:
        result = deserialize("not-json-at-all")
        assert result == "not-json-at-all"

    def test_deserialize_empty_string_returns_as_is(self) -> None:
        result = deserialize("")
        assert result == ""

    def test_deserialize_json_number_returns_number(self) -> None:
        result = deserialize("42")
        assert result == 42

    def test_serialize_deserialize_roundtrip(self) -> None:
        original = {"user_id": 1, "name": "test", "tags": ["a", "b"]}
        serialized = serialize(original)
        deserialized = deserialize(serialized)
        assert deserialized == original
