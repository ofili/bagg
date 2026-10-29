from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.domains.auth.schemas import (
    AuthResponse,
    MagicLinkRequest,
    UserResponse,
    VerifyCodeRequest,
)
from app.domains.auth.service import AuthService
from app.domains.workspaces.schemas import WorkspaceResponse
from fastapi import Request
from app.core.proxy import get_client_ip
from app.core.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["Auth"])

SESSION_COOKIE_NAME = "bagg_session"
SESSION_MAX_AGE = 30 * 24 * 60 * 60
COOKIE_SECURE = settings.ENVIRONMENT.strip().lower() == "production"


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


def build_auth_response(user, workspace) -> AuthResponse:
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
        ),
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
            logo_url=workspace.logo_url,
            invoice_prefix=workspace.invoice_prefix,
            onboarding_completed=workspace.onboarding_completed,
        ),
        message="Successfully authenticated",
    )


@router.post("/magic-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    payload: MagicLinkRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Request a one-time sign-in code without returning the code to the client."""

    client_ip = get_client_ip(request)
    email = str(payload.email).lower().strip()

    await enforce_rate_limit(
        action="otp-request-email",
        identity=email,
        limit=3,
        window_seconds=900,
    )
    await enforce_rate_limit(
        action="otp-request-ip",
        identity=client_ip,
        limit=10,
        window_seconds=900,
    )

    service = AuthService(db)

    try:
        await service.request_magic_code(str(payload.email))
    except RuntimeError:
        # Do not disclose the code or provider-specific delivery details.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We could not send your sign-in email. Please try again shortly.",
        ) from None

    return {
        "message": (
            "If this address can be used to sign in, "
            "a verification email will be sent."
        )
    }


@router.post("/verify", response_model=AuthResponse)
async def verify_code(
    payload: VerifyCodeRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)

    client_ip = get_client_ip(request)
    email = str(payload.email).lower().strip()

    await enforce_rate_limit(
        action="otp-verify-email",
        identity=email,
        limit=10,
        window_seconds=900,
    )
    await enforce_rate_limit(
        action="otp-verify-ip",
        identity=client_ip,
        limit=30,
        window_seconds=900,
    )

    user, workspace, session_token = await service.verify_login(
        str(payload.email),
        payload.code,
    )

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        path="/",
    )

    return build_auth_response(user, workspace)


@router.get("/me", response_model=AuthResponse)
async def get_current_user_profile(
    auth_data=Depends(get_current_user_and_workspace),
):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, workspace = auth_data
    return build_auth_response(user, workspace)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = get_session_token(request)

    if token:
        await AuthService(db).revoke_session(token)

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )

    return {"message": "Logged out successfully"}
