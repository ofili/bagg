import hashlib
import logging
import time
from collections import defaultdict
from typing import DefaultDict

from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Local fallback is for development only.
_local_hits: DefaultDict[str, list[float]] = defaultdict(list)


def _digest(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


async def enforce_rate_limit(
    *,
    action: str,
    identity: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Enforce a fixed-window rate limit using Redis in deployed environments."""
    key = f"bagg:ratelimit:{action}:{_digest(identity)}"

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
            logger.error("Rate-limit store unavailable: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication is temporarily unavailable. Please try again.",
            ) from None

        # Development fallback only; this is not distributed across workers.
        now = time.monotonic()
        hits = _local_hits[key]
        hits[:] = [timestamp for timestamp in hits if now - timestamp < window_seconds]
        hits.append(now)
        count = len(hits)

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait before trying again.",
            headers={"Retry-After": str(window_seconds)},
        )
