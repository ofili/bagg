"""Shared pytest setup for the API test suite.

Two pieces of global state leak between tests otherwise:

1. Login codes are no longer returned in HTTP responses, so every test needs
   them captured at the email boundary.
2. All tests share one Redis instance and one client IP, so rate-limit windows
   from one test can exhaust the allowance of the next.
"""
import pytest
import redis as redis_lib

import app.models  # noqa: F401  (registers every SQLAlchemy model)
from app.core import rate_limit as rate_limit_module
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from tests.helpers import install_login_code_capture, reset_captured_login_codes


def _clear_rate_limits() -> None:
    rate_limit_module._local_windows.clear()
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


@pytest.fixture
async def db_session():
    """Yields a database session that rolls back on close."""
    async with AsyncSessionLocal() as session:
        yield session
