import time

import pytest
from fastapi import HTTPException

from app.core import rate_limit as limiter


@pytest.fixture(autouse=True)
def reset_local_windows():
    limiter._local_windows.clear()
    yield
    limiter._local_windows.clear()


def test_local_increment_counts_requests():
    key = "test-key"

    count1, _ = limiter._local_increment(key, 60)
    count2, _ = limiter._local_increment(key, 60)

    assert count1 == 1
    assert count2 == 2


def test_local_increment_expires_window(monkeypatch):
    current_time = [100.0]

    monkeypatch.setattr(
        limiter.time,
        "monotonic",
        lambda: current_time[0],
    )

    key = "test-key"

    count1, _ = limiter._local_increment(key, 10)

    current_time[0] = 111.0

    count2, _ = limiter._local_increment(key, 10)

    assert count1 == 1
    assert count2 == 1


def test_local_store_is_bounded():
    limiter._LOCAL_MAX_KEYS = 5

    for index in range(10):
        limiter._local_increment(f"key-{index}", 60)

    assert len(limiter._local_windows) <= 5


@pytest.mark.asyncio
async def test_rate_limit_rejects_request_over_limit(monkeypatch):
    async def fake_local_backend():
        return None

    monkeypatch.setattr(
        limiter,
        "_local_increment",
        lambda key, window: (4, 30),
    )

    monkeypatch.setattr(
        limiter.settings,
        "ENVIRONMENT",
        "development",
    )

    with pytest.raises(HTTPException) as exc:
        await limiter.enforce_rate_limit(
            action="test",
            identity="user@example.com",
            limit=3,
            window_seconds=60,
        )

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "30"
