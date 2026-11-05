
from datetime import timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.router import get_current_user_and_workspace
from app.domains.security.email_change_schemas import (
    EmailChangeStartRequest,
    EmailChangeStartResponse,
    EmailChangeVerifyRequest,
    EmailChangeStatusResponse,
)
from app.domains.security.email_change_service import (
    EmailChangeService,
    EmailChangeError,
)


router = APIRouter(
    prefix="/security/email-change",
    tags=["Account Security"],
)


def _principal(auth_data):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    user, _workspace = auth_data

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    return user


def _client_context(request: Request):
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


def _raise_service_error(exc: EmailChangeError):
    raise HTTPException(
        status_code=exc.status_code,
        detail=exc.message,
    ) from exc


@router.post(
    "",
    response_model=EmailChangeStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_email_change(
    payload: EmailChangeStartRequest,
    request: Request,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)
    context = _client_context(request)

    try:
        change = await EmailChangeService(db).start(
            user_id=user.id,
            proposed_email=str(payload.new_email),
            **context,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    return EmailChangeStartResponse(
        id=change.id,
        message=(
            "A verification code has been sent to your current email address."
        ),
        expires_in_minutes=EmailChangeService.REQUEST_MINUTES,
    )


@router.post("/{request_id}/verify-current")
async def verify_current_email(
    request_id: str,
    payload: EmailChangeVerifyRequest,
    request: Request,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)
    context = _client_context(request)

    try:
        verified = await EmailChangeService(db).verify_current(
            user_id=user.id,
            request_id=request_id,
            code=payload.code,
            **context,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    return {
        "message": (
            "Your current email is verified. "
            "A verification code has been sent to your new email address."
        )
    }


@router.post("/{request_id}/verify-new")
async def verify_new_email(
    request_id: str,
    payload: EmailChangeVerifyRequest,
    request: Request,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)
    context = _client_context(request)

    try:
        verified = await EmailChangeService(db).verify_new(
            user_id=user.id,
            request_id=request_id,
            code=payload.code,
            **context,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    return {
        "message": (
            "Your new email address is verified. "
            "You can now complete the email change."
        )
    }


@router.post("/{request_id}/complete", status_code=status.HTTP_200_OK)
async def complete_email_change(
    request_id: str,
    request: Request,
    response: Response,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)
    context = _client_context(request)

    try:
        await EmailChangeService(db).complete(
            user_id=user.id,
            request_id=request_id,
            **context,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    # The database has revoked all sessions. Clear the browser cookie too.
    response.delete_cookie(
        key="bagg_session",
        path="/",
        httponly=True,
        secure=True,
        samesite="lax",
    )

    return {
        "message": (
            "Your account email has been changed. "
            "Please sign in again using your new email address."
        )
    }


@router.delete("/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_email_change(
    request_id: str,
    request: Request,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)
    context = _client_context(request)

    try:
        await EmailChangeService(db).cancel(
            user_id=user.id,
            request_id=request_id,
            **context,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    return {"message": "Email-change request cancelled."}


@router.get(
    "/{request_id}",
    response_model=EmailChangeStatusResponse,
)
async def get_email_change_status(
    request_id: str,
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user = _principal(auth_data)

    try:
        change = await EmailChangeService(db).get_status(
            user_id=user.id,
            request_id=request_id,
        )
    except EmailChangeError as exc:
        _raise_service_error(exc)

    return EmailChangeStatusResponse(
        id=change.id,
        current_email_verified=(
            change.current_email_verified_at is not None
        ),
        new_email_verified=(
            change.new_email_verified_at is not None
        ),
        expires_at=change.expires_at.isoformat(),
        completed=change.completed_at is not None,
        cancelled=change.cancelled_at is not None,
        message="Email-change request status retrieved.",
    )
