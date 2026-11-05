from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.models import User
from app.domains.auth.router import get_current_user_and_workspace, build_auth_response
from app.domains.auth.schemas import UserResponse, AuthResponse
from app.domains.users.schemas import ProfileUpdate
from app.domains.users.service import UserService

router = APIRouter(prefix="/users", tags=["User"])


@router.get("/me", response_model=AuthResponse)
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


@router.patch("/me", response_model=AuthResponse)
async def patch_me(
    response: Response,
    payload: ProfileUpdate,
    auth_data=Depends(get_current_user_and_workspace),
    service=UserService(Depends(get_db)),
):
    user, workspace = auth_data

    updated_user = await service.update_me(user.id, payload)

    if not updated_user.scalar():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
        )

    response.headers["Cache-Control"] = "no-store"

    return build_auth_response(updated_user, workspace)

