from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.security.dependencies import require_authenticated_user
from app.domains.security.service import (
    SecurityPurpose,
    SecurityService,
)
from app.domains.payments.schemas import (
    PaymentProfileResponse,
    PaymentProfileCreate,
    PaymentProfileUpdate,
    PaymentProfileValidation,
)
from app.domains.payments import service as payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get(
    "/profiles",
    response_model=list[PaymentProfileResponse],
)
async def list_profiles(
    currency: Optional[str] = Query(None),
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth_data
    return await payment_service.list_payment_profiles(
        db,
        workspace.id,
        currency,
    )


@router.post(
    "/profiles",
    response_model=PaymentProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_profile(
    payload: PaymentProfileCreate,
    challenge_id: str = Header(
        ...,
        alias="X-Security-Challenge-ID",
        min_length=1,
        max_length=100,
    ),
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data
    values = payload.model_dump(mode="json")

    security = SecurityService(db)

    await security.require_consumed_step_up(
        user=user,
        workspace=workspace,
        challenge_id=challenge_id,
        purpose=SecurityPurpose.PAYMENT_PROFILE_CREATE,
        payload=values,
    )

    await security.write_audit_event(
        event_type="security.payment_profile_create",
        outcome="success",
        user_id=user.id,
        workspace_id=workspace.id,
        resource_type="payment_profile",
        metadata={"challenge_id": challenge_id},
    )

    # The payment service commits the profile and the spent challenge
    # in the same database transaction.
    return await payment_service.create_payment_profile(
        db,
        workspace.id,
        values,
    )


@router.get(
    "/profiles/validate/{currency}",
    response_model=PaymentProfileValidation,
)
async def validate_profile(
    currency: str,
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth_data

    clean = currency.upper().strip()
    profile = await payment_service.validate_currency_profile(
        db,
        workspace.id,
        clean,
    )

    return PaymentProfileValidation(
        currency=clean,
        has_profile=profile is not None,
        default_profile=profile,
        message=(
            f"Active payout instructions found for {clean}"
            if profile
            else (
                f"No payment instructions saved for {clean}. "
                "Add bank or digital details before sending."
            )
        ),
    )


@router.patch(
    "/profiles/{profile_id}",
    response_model=PaymentProfileResponse,
)
async def update_profile(
    profile_id: str,
    payload: PaymentProfileUpdate,
    challenge_id: str = Header(
        ...,
        alias="X-Security-Challenge-ID",
        min_length=1,
        max_length=100,
    ),
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data
    values = payload.model_dump(
        exclude_unset=True,
        mode="json",
    )

    security = SecurityService(db)

    await security.require_consumed_step_up(
        user=user,
        workspace=workspace,
        challenge_id=challenge_id,
        purpose=SecurityPurpose.PAYMENT_PROFILE_UPDATE,
        payload={
            "profile_id": profile_id,
            "changes": values,
        },
    )

    await security.write_audit_event(
        event_type="security.payment_profile_update",
        outcome="success",
        user_id=user.id,
        workspace_id=workspace.id,
        resource_type="payment_profile",
        resource_id=profile_id,
        metadata={"challenge_id": challenge_id},
    )

    return await payment_service.update_payment_profile(
        db,
        workspace.id,
        profile_id,
        values,
    )


@router.delete(
    "/profiles/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_profile(
    profile_id: str,
    challenge_id: str = Header(
        ...,
        alias="X-Security-Challenge-ID",
        min_length=1,
        max_length=100,
    ),
    auth_data=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data

    security = SecurityService(db)

    await security.require_consumed_step_up(
        user=user,
        workspace=workspace,
        challenge_id=challenge_id,
        purpose=SecurityPurpose.PAYMENT_PROFILE_DELETE,
        payload={"profile_id": profile_id},
    )

    await security.write_audit_event(
        event_type="security.payment_profile_delete",
        outcome="success",
        user_id=user.id,
        workspace_id=workspace.id,
        resource_type="payment_profile",
        resource_id=profile_id,
        metadata={"challenge_id": challenge_id},
    )

    await payment_service.delete_payment_profile(
        db,
        workspace.id,
        profile_id,
    )

    return None


@router.post("/claims", status_code=status.HTTP_410_GONE)
async def retired_payment_claim():
    raise HTTPException(
        status_code=410,
        detail=(
            "This endpoint is retired. Submit payment claims "
            "through the invoice's public sharing link."
        ),
    )
