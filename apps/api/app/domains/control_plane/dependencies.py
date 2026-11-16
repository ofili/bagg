from fastapi import Depends, HTTPException, status

from app.core.config import settings
from app.domains.auth.dependencies import get_current_user_and_workspace


def configured_control_plane_admins() -> set[str]:
    """
    Return normalized staff email addresses.

    An empty configuration intentionally grants no access.
    """
    return {
        email.strip().casefold()
        for email in (settings.CONTROL_PLANE_ADMIN_EMAILS or "").split(",")
        if email.strip()
    }


async def require_control_plane_admin(
    auth_data=Depends(get_current_user_and_workspace),
):
    """
    Require an authenticated user explicitly authorized for the control plane.

    The workspace returned by the normal authentication dependency is
    deliberately ignored. Control-plane authorization is account-scoped,
    not workspace-scoped.
    """
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    user, _workspace = auth_data

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    allowed_emails = configured_control_plane_admins()
    user_email = (user.email or "").strip().casefold()

    if not user_email or user_email not in allowed_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Control-plane access is restricted.",
        )

    return user