from fastapi import Depends, HTTPException, status

from app.domains.auth.router import get_current_user_and_workspace


async def require_authenticated_user(
    auth_data=Depends(get_current_user_and_workspace),
):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, workspace = auth_data

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive",
        )

    return user, workspace
