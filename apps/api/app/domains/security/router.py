from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import BadRequestException
from app.core.proxy import get_client_ip
from app.domains.email.service import enqueue_security_step_up
from app.domains.security.dependencies import require_authenticated_user
from app.domains.security.schemas import (
    RecoveryCodeResponse,
    StepUpRequest,
    StepUpRequestResponse,
    StepUpVerifyRequest,
    StepUpVerifyResponse,
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

    enqueue_security_step_up(
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
        message="A security verification code has been queued for delivery.",
    )


@router.post(
    "/step-up/verify",
    response_model=StepUpVerifyResponse,
)
async def verify_step_up(
    payload: StepUpVerifyRequest,
    request: Request,
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data
    service = SecurityService(db)

    try:
        challenge = await service.verify_challenge_code(
            challenge_id=payload.challenge_id,
            user_id=user.id,
            workspace_id=workspace.id,
            code=payload.code,
        )
    except BadRequestException:
        # Persist failed-attempt increments. The service deliberately
        # leaves transaction ownership to the router/use case.
        await service.write_audit_event(
            event_type="security.step_up_verification",
            outcome="failure",
            user_id=user.id,
            workspace_id=workspace.id,
            resource_type="security_challenge",
            resource_id=payload.challenge_id,
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
        await db.commit()
        raise

    await service.write_audit_event(
        event_type="security.step_up_verified",
        outcome="success",
        user_id=user.id,
        workspace_id=workspace.id,
        resource_type="security_challenge",
        resource_id=challenge.id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={
            "purpose": challenge.purpose,
            "operation_id": challenge.operation_id,
        },
    )

    await db.commit()

    return StepUpVerifyResponse(
        verified=True,
        challenge_id=challenge.id,
        operation_id=challenge.operation_id,
        message="Security verification successful.",
    )


@router.post(
    "/recovery-codes/regenerate",
    response_model=RecoveryCodeResponse,
)
async def regenerate_recovery_codes(
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Recovery-code regeneration is not enabled yet.",
    )
