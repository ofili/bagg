import hashlib
import logging
import time
from collections import defaultdict
from typing import Callable, DefaultDict, Optional

from fastapi import HTTPException, Request, Response, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.proxy import get_client_ip

logger = logging.getLogger(__name__)

# In-memory sliding-window fallback for test and local development.
_local_hits: DefaultDict[str, list[float]] = defaultdict(list)


def _digest(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


async def enforce_rate_limit(
    *,
    action: str,
    identity: str,
    limit: int,
    window_seconds: int,
    response: Optional[Response] = None,
) -> int:
    """
    Enforces a fixed-window rate limit using Redis in deployed environments,
    or a local memory fallback in development.
    Sets standard RateLimit headers when response is provided.
    Returns the current request count.
    """
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
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window_seconds)
        finally:
            await redis.aclose()

    except Exception as exc:
        if settings.ENVIRONMENT.strip().lower() == "production":
            logger.error("Rate-limit store unavailable in production: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service is temporarily unavailable. Please try again shortly.",
            ) from None

        # Local development fallback
        now = time.monotonic()
        hits = _local_hits[key]
        hits[:] = [timestamp for timestamp in hits if now - timestamp < window_seconds]
        hits.append(now)
        count = len(hits)

    remaining = max(0, limit - count)
    if response:
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(window_seconds)

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
    key_func: Optional[Callable[[Request], str]] = None,
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
