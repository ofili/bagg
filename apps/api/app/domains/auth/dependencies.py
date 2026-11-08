"""Authentication dependencies shared by HTTP adapters.

This module deliberately contains no router definitions so one domain's
router never imports another domain's router to obtain authentication.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.service import AuthService

SESSION_COOKIE_NAME = "bagg_session"


def get_session_token(request: Request) -> str | None:
    """Read the session cookie or an explicitly supplied Bearer token."""
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        return token or None
    return request.cookies.get(SESSION_COOKIE_NAME)


async def get_current_user_and_workspace(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    token = get_session_token(request)
    if not token:
        return None
    return await AuthService(db).get_user_from_session(token)


def require_auth(auth_data=Depends(get_current_user_and_workspace)):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )
    return auth_data
