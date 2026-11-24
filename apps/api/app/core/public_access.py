"""Shared security controls for unauthenticated public document endpoints."""

import re

from fastapi import HTTPException, Request, Response, status

from app.core.proxy import get_client_ip
from app.core.rate_limit import enforce_rate_limit
from app.core.security import hash_token

# generate_share_token() currently uses secrets.token_urlsafe(32), which
# produces 43 URL-safe characters. The wider length range preserves
# compatibility with previously issued URL-safe tokens.
_SHARE_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,128}$")


def is_valid_share_token(token: str | None) -> bool:
    return bool(token and _SHARE_TOKEN_PATTERN.fullmatch(token))


async def enforce_public_access(
    *,
    request: Request,
    response: Response,
    token: str,
    action: str,
    ip_limit: int,
    token_limit: int,
    window_seconds: int,
) -> None:
    """
    Apply independent IP and share-token limits before database access.

    The raw token is never used as a rate-limit identity or logged.
    Malformed tokens still consume the IP limit before receiving a
    generic 404 response.
    """

    client_ip = get_client_ip(request)

    await enforce_rate_limit(
        action=f"public:{action}:ip",
        identity=client_ip,
        limit=ip_limit,
        window_seconds=window_seconds,
        response=response,
    )

    if not is_valid_share_token(token):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or invalid link",
        )

    await enforce_rate_limit(
        action=f"public:{action}:token",
        identity=hash_token(token),
        limit=token_limit,
        window_seconds=window_seconds,
        response=response,
    )
