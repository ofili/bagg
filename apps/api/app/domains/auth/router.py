from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.errors import BadRequestException
from app.domains.auth.schemas import MagicLinkRequest, VerifyCodeRequest, AuthResponse, UserResponse
from app.domains.auth.service import AuthService
from app.domains.workspaces.schemas import WorkspaceResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

SESSION_COOKIE_NAME = "bagg_session"


async def get_current_user_and_workspace(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    # Also support Authorization Bearer token for API / Mobile
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header.replace("Bearer ", "").strip()

    if not session_token:
        # For dev bootstrapping if no session is set, return a demo fallback
        return None

    service = AuthService(db)
    result = await service.get_user_from_session(session_token)
    return result


@router.post("/magic-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    payload: MagicLinkRequest,
    db: AsyncSession = Depends(get_db)
):
    """Sends a 6-digit login code and magic link to the user's email."""
    service = AuthService(db)
    code = await service.request_magic_code(payload.email)
    return {
        "message": f"Login code sent to {payload.email}",
        "dev_code": code  # visible in local dev response for testing convenience
    }


@router.post("/verify", response_model=AuthResponse)
async def verify_code(
    payload: VerifyCodeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Verifies login code, onboards new user + workspace, and sets httpOnly session cookie."""
    service = AuthService(db)
    user, workspace, session_token = await service.verify_login(payload.email, payload.code)

    # Set secure httpOnly cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,  # 30 days
        samesite="lax",
        secure=False  # True in production HTTPS
    )

    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, is_active=user.is_active),
        workspace=WorkspaceResponse(
            id=workspace.id,
            owner_id=workspace.owner_id,
            name=workspace.name,
            business_name=workspace.business_name,
            brand_color=workspace.brand_color,
            country=workspace.country,
            default_currency=workspace.default_currency,
            tax_id=workspace.tax_id,
            address=workspace.address,
        ),
        message="Successfully authenticated"
    )


@router.get("/me", response_model=AuthResponse)
async def get_current_user_profile(
    auth_data = Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Returns profile and active workspace of currently authenticated session."""
    if not auth_data:
        # Demo fallback for dev initial state
        return AuthResponse(
            user=UserResponse(id="usr_demo", email="demo@bagg.app", is_active=True),
            workspace=WorkspaceResponse(
                id="ws_demo",
                owner_id="usr_demo",
                name="Studio Bagg",
                business_name="Studio Bagg Creative Ltd",
                brand_color="#10B981",
                country="NG",
                default_currency="NGN",
                tax_id="TIN-98765432-0001",
                address="12 Adeola Odeku St, Victoria Island, Lagos"
            )
        )

    user, workspace = auth_data
    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, is_active=user.is_active),
        workspace=WorkspaceResponse(
            id=workspace.id,
            owner_id=workspace.owner_id,
            name=workspace.name,
            business_name=workspace.business_name,
            brand_color=workspace.brand_color,
            country=workspace.country,
            default_currency=workspace.default_currency,
            tax_id=workspace.tax_id,
            address=workspace.address,
        )
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """Clears the session cookie."""
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out successfully"}
