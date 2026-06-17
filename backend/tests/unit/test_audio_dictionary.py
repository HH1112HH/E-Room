from __future__ import annotations

import pytest

from app.infrastructure.audio_dictionary import CMUDictionary


class TestCMUDictionary:
    @pytest.fixture
    def cmu(self):
        return CMUDictionary()

    def test_lookup_known_word(self, cmu):
        phones = cmu.lookup("hello")
        assert isinstance(phones, list)

    def test_lookup_missing_word_returns_empty(self, cmu):
        phones = cmu.lookup("xyznonexistent12345")
        assert phones == []

    def test_lookup_empty_string(self, cmu):
        phones = cmu.lookup("")
        assert phones == []

    def test_concurrent_instances_share_data(self):
        a = CMUDictionary()
        b = CMUDictionary()
        a.lookup("hello")
        b.lookup("hello")
        assert a.lookup("hello") == b.lookup("hello")
