"""Workspace-scoped request dependencies shared by HTTP adapters."""

from fastapi import Depends, HTTPException, status

from app.domains.auth.dependencies import get_current_user_and_workspace
from app.domains.workspaces.models import Workspace


async def resolve_active_workspace(
    auth_data=Depends(get_current_user_and_workspace),
) -> Workspace:
    """Return only the authenticated user's active workspace."""
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )
    _user, workspace = auth_data
    return workspace
