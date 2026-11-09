from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.payments.schemas import (
    PaymentProfileResponse,
    PaymentProfileCreate,
    PaymentProfileUpdate,
    PaymentProfileValidation,
)
from app.domains.payments import service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/profiles", response_model=list[PaymentProfileResponse])
async def list_profiles(
    currency: Optional[str] = Query(None),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_payment_profiles(db, workspace.id, currency)


@router.post(
    "/profiles",
    response_model=PaymentProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_profile(
    payload: PaymentProfileCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_payment_profile(db, workspace.id, payload.model_dump())


@router.get("/profiles/validate/{currency}", response_model=PaymentProfileValidation)
async def validate_profile(
    currency: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    clean = currency.upper().strip()
    profile = await service.validate_currency_profile(db, workspace.id, clean)
    return PaymentProfileValidation(
        currency=clean,
        has_profile=profile is not None,
        default_profile=profile,
        message=(
            f"Active payout instructions found for {clean}"
            if profile
            else f"No payment instructions saved for {clean}. Add bank or digital details before sending."
        ),
    )


@router.patch("/profiles/{profile_id}", response_model=PaymentProfileResponse)
async def update_profile(
    profile_id: str,
    payload: PaymentProfileUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_payment_profile(
        db, workspace.id, profile_id, payload.model_dump(exclude_unset=True)
    )


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_payment_profile(db, workspace.id, profile_id)
    return None


@router.post("/claims", status_code=status.HTTP_410_GONE)
async def retired_payment_claim():
    raise HTTPException(
        status_code=410,
        detail="This endpoint is retired. Submit payment claims through the invoice's public sharing link.",
    )
