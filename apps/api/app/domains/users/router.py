from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.dependencies import get_current_user_and_workspace
from app.domains.auth.router import build_auth_response
from app.domains.users.schemas import ProfileUpdate
from app.domains.users.service import UserService

router = APIRouter(prefix="/users", tags=["User"])


@router.get("/me")
async def get_current_user_profile(
    response: Response,
    auth_data=Depends(get_current_user_and_workspace),
):
    response.headers["Cache-Control"] = "no-store"

    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, workspace = auth_data
    return build_auth_response(user, workspace)


@router.patch("/me")
async def patch_me(
    response: Response,
    payload: ProfileUpdate,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, workspace = auth_data

    updated_user = await UserService(db).update_me(
        user.id,
        payload,
    )

    response.headers["Cache-Control"] = "no-store"

    return build_auth_response(updated_user, workspace)