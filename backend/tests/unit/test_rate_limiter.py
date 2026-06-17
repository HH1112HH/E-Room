from __future__ import annotations

import pytest

from app.infrastructure.redis_client import RateLimiter


class TestRateLimiter:
    @pytest.fixture
    def limiter(self, mock_redis):
        limiter = RateLimiter(mock_redis)
        return limiter

    def test_check_allows_first_request(self, limiter, mock_redis):
        mock_redis.rate_limit.return_value = (True, 4)
        allowed, remaining = limiter.check("test-key", "endpoint", max_requests=5, window_seconds=60)
        assert allowed is True

    def test_check_blocks_exceeded(self, limiter, mock_redis):
        mock_redis.rate_limit.return_value = (False, 0)
        allowed, remaining = limiter.check("test-key", "endpoint", max_requests=5)
        assert allowed is False

    def test_check_login_default(self, limiter, mock_redis):
        mock_redis.rate_limit.return_value = (True, 4)
        allowed, _ = limiter.check_login("127.0.0.1")
        assert allowed is True

    def test_check_tts_default(self, limiter, mock_redis):
        mock_redis.rate_limit.return_value = (True, 9)
        allowed, _ = limiter.check_tts("user-1", "session-1")
        assert allowed is True
