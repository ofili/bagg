from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.proxy import get_client_ip
from app.domains.email.service import enqueue_login_code
from app.domains.security.dependencies import require_authenticated_user
from app.domains.security.schemas import (
    RecoveryCodeResponse,
    StepUpRequest,
    StepUpRequestResponse,
)
from app.domains.security.service import SecurityService


router = APIRouter(
    prefix="/security",
    tags=["Security"],
)


@router.post(
    "/step-up/request",
    response_model=StepUpRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_step_up(
    payload: StepUpRequest,
    request: Request,
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data

    service = SecurityService(db)

    challenge, code = await service.create_challenge(
        user_id=user.id,
        workspace_id=workspace.id,
        purpose=payload.purpose,
        payload=payload.payload,
        destination=user.email,
    )

    await enqueue_login_code(
        db,
        challenge_id=challenge.id,
        recipient=user.email,
        code=code,
        expires_in_minutes=service.CHALLENGE_MINUTES,
    )

    await service.write_audit_event(
        event_type="security.step_up_requested",
        outcome="success",
        user_id=user.id,
        workspace_id=workspace.id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={
            "purpose": payload.purpose,
            "operation_id": challenge.operation_id,
        },
    )

    await db.commit()

    return StepUpRequestResponse(
        challenge_id=challenge.id,
        operation_id=challenge.operation_id,
        expires_in_seconds=service.CHALLENGE_MINUTES * 60,
        message="A verification code has been queued for delivery.",
    )


@router.post("/recovery-codes/regenerate", response_model=RecoveryCodeResponse)
async def regenerate_recovery_codes(
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data

    service = SecurityService(db)

    # This endpoint must be protected by a verified step-up operation
    # before it is enabled for production use.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Recovery-code regeneration will be enabled with Package 4C.",
    )
