import hashlib
import logging
import time
from collections import OrderedDict
from collections.abc import Callable

from fastapi import HTTPException, Request, Response, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.proxy import get_client_ip

logger = logging.getLogger(__name__)

# Development/test fallback only.
# Each entry is: key -> 9request_count, window_expiry_timestamp
_LOCAL_MAX_KEYS = 10_000
_local_windows: OrderedDict[str, tuple[int, float]] = OrderedDict()


_REDIS_FIXED_WINDOW_SCRIPT = """
local count = redis.call("INCR", KEYS[1])

if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end

local ttl = redis.call("TTL", KEYS[1])
return {count, ttl}
"""


def _digest(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _local_increment(key: str, window_seconds: int) -> tuple[int, int]:
    """
    Bounded in-memory fixed-window fallback.

    This is not suitable for multi-process production rate limiting.
    """
    now = time.monotonic()
    current = _local_windows.get(key)

    if current is None or current[1] <= now:
        count = 1
        expires_at = current[1]
    else:
        count = current[0] + 1
        expires_at = current[1]

    _local_windows[key] = (count, expires_at)
    _local_windows.move_to_end(key)

    # Remove expired entries opportunistically.
    expired_keys = [
        stored_key for stored_key, (_, expiry) in _local_windows.items()
        if expiry <= now
    ]

    for stored_key in expired_keys:
        _local_windows.pop(stored_key, None)

    # Enforce a hard memory bound
    while len(_local_windows) > _LOCAL_MAX_KEYS:
        _local_windows.popitem(last=False)

    ttl = max(0, int(expires_at - now + 0.999))

    return count, ttl


async def enforce_rate_limit(
    *,
    action: str,
    identity: str,
    limit: int,
    window_seconds: int,
    response: Response | None = None,
) -> int:
    """
    Enforces a fixed-window rate limit.

    Production:
        Redis is mandatory. Redis failure returns HTTP 503.

    Development:
        A bounded local in-memory fallback is used.

    Returns the current request count.
    """
    if limit < 1 or window_seconds < 1:
        raise ValueError("Rate-limit limit and window must be positive")

    key = f"bagg:ratelimit:{action}:{_digest(identity)}"
    count = 1

    try:
        redis = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            
            result = await redis.eval(
                _REDIS_FIXED_WINDOW_SCRIPT,
                1,
                key,
                window_seconds,
            )

            count = int(result[0])
            ttl = max(0, int(result[1]))

        finally:
            await redis.aclose()

    except Exception as exc:
        if settings.ENVIRONMENT.strip().lower() == "production":
            logger.error("Rate-limit store unavailable in production: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service is temporarily unavailable. Please try again shortly.",
            ) from None

    count, ttl = _local_increment(key, window_seconds)

    remaining = max(0, limit - count)
    if response:
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(ttl)

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait before trying again.",
            headers={
                "Retry-After": str(window_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(window_seconds),
            },
        )

    return count


def rate_limit(
    action: str,
    limit: int,
    window_seconds: int,
    key_func: Callable[[Request], str] | None = None,
):
    """
    FastAPI dependency factory for applying rate limits to routes.
    Default identity is the real client IP.
    """
    async def dependency(request: Request, response: Response):
        if key_func:
            identity = key_func(request)
        else:
            identity = get_client_ip(request)

        await enforce_rate_limit(
            action=action,
            identity=identity,
            limit=limit,
            window_seconds=window_seconds,
            response=response,
        )

    return dependency
