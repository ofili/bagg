"""Shared pytest setup for the API test suite.

Two pieces of global state leak between tests otherwise:

1. Login codes are no longer returned in HTTP responses, so every test needs
   them captured at the email boundary.
2. All tests share one Redis instance and one client IP, so rate-limit windows
   from one test can exhaust the allowance of the next.
"""
import pytest
import redis as redis_lib

from app.core.config import settings
from app.core.rate_limit import _local_hits
from tests.helpers import install_login_code_capture, reset_captured_login_codes


def _clear_rate_limits() -> None:
    _local_hits.clear()
    try:
        client = redis_lib.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        try:
            keys = list(client.scan_iter(match="bagg:ratelimit:*", count=500))
            if keys:
                client.delete(*keys)
        finally:
            client.close()
    except Exception:
        # Redis is optional locally; the in-memory fallback was cleared above.
        pass


@pytest.fixture(autouse=True)
def isolate_test_state(monkeypatch):
    """Captures login codes and resets rate-limit windows around each test."""
    reset_captured_login_codes()
    install_login_code_capture(monkeypatch)
    _clear_rate_limits()
    yield
    _clear_rate_limits()
