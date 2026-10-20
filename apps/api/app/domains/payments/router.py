from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.errors import NotFoundException, BadRequestException
from app.domains.payments.models import PaymentProfile
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.payments.schemas import (
    PaymentProfileResponse,
    PaymentProfileCreate,
    PaymentProfileUpdate,
    PaymentProfileValidation,
    PaymentClaimCreate,
    PaymentClaimResponse,
)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/profiles", response_model=List[PaymentProfileResponse])
async def list_payment_profiles(
    currency: Optional[str] = Query(None, description="Optional currency filter (e.g. NGN, USD)"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Lists saved payment profiles per currency for the active workspace."""
    conditions = [PaymentProfile.workspace_id == workspace.id]
    if currency:
        conditions.append(PaymentProfile.currency == currency.upper())

    stmt = select(PaymentProfile).where(and_(*conditions)).order_by(
        PaymentProfile.currency.asc(),
        PaymentProfile.is_default.desc(),
        PaymentProfile.created_at.desc()
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/profiles", response_model=PaymentProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_profile(
    payload: PaymentProfileCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves a new payment profile for a specific currency (US-PAY-01).
    If marked as default, unsets existing default profile for this currency.
    """
    if payload.is_default:
        # Unset existing defaults for this currency in the workspace
        await db.execute(
            update(PaymentProfile)
            .where(
                and_(
                    PaymentProfile.workspace_id == workspace.id,
                    PaymentProfile.currency == payload.currency,
                    PaymentProfile.is_default.is_(True)
                )
            )
            .values(is_default=False)
        )

    profile = PaymentProfile(
        workspace_id=workspace.id,
        currency=payload.currency,
        bank_name=payload.bank_name,
        account_name=payload.account_name,
        account_number=payload.account_number,
        routing_number=payload.routing_number,
        payment_link=payload.payment_link,
        mobile_money_number=payload.mobile_money_number,
        instructions=payload.instructions,
        is_default=payload.is_default,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/profiles/validate/{currency}", response_model=PaymentProfileValidation)
async def validate_currency_profile(
    currency: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Validates whether the workspace has a saved payment profile for the invoice currency (US-PAY-02).
    Used by frontend invoice drafting to trigger warning/prompt before sending.
    """
    clean_currency = currency.upper().strip()
    stmt = select(PaymentProfile).where(
        and_(
            PaymentProfile.workspace_id == workspace.id,
            PaymentProfile.currency == clean_currency
        )
    ).order_by(PaymentProfile.is_default.desc())

    res = await db.execute(stmt)
    profiles = res.scalars().all()

    if profiles:
        default_p = next((p for p in profiles if p.is_default), profiles[0])
        return PaymentProfileValidation(
            currency=clean_currency,
            has_profile=True,
            default_profile=default_p,
            message=f"Active payout instructions found for {clean_currency}"
        )

    return PaymentProfileValidation(
        currency=clean_currency,
        has_profile=False,
        default_profile=None,
        message=f"No payment instructions saved for {clean_currency}. Add bank or digital details before sending."
    )


@router.patch("/profiles/{profile_id}", response_model=PaymentProfileResponse)
async def update_payment_profile(
    profile_id: str,
    payload: PaymentProfileUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing payment profile."""
    stmt = select(PaymentProfile).where(
        and_(
            PaymentProfile.id == profile_id,
            PaymentProfile.workspace_id == workspace.id
        )
    )
    res = await db.execute(stmt)
    profile = res.scalars().first()

    if not profile:
        raise NotFoundException("Payment profile not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if update_dict.get("is_default") is True:
        # Unset other defaults for this currency
        await db.execute(
            update(PaymentProfile)
            .where(
                and_(
                    PaymentProfile.workspace_id == workspace.id,
                    PaymentProfile.currency == profile.currency,
                    PaymentProfile.id != profile.id,
                    PaymentProfile.is_default.is_(True)
                )
            )
            .values(is_default=False)
        )

    for field, value in update_dict.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_profile(
    profile_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a payment profile."""
    stmt = select(PaymentProfile).where(
        and_(
            PaymentProfile.id == profile_id,
            PaymentProfile.workspace_id == workspace.id
        )
    )
    res = await db.execute(stmt)
    profile = res.scalars().first()

    if not profile:
        raise NotFoundException("Payment profile not found")

    await db.delete(profile)
    await db.commit()
    return None


@router.post("/claims", response_model=PaymentClaimResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment_claim(payload: PaymentClaimCreate):
    """Called when client clicks 'I have paid' to submit proof of payment."""
    return PaymentClaimResponse(
        id="claim_demo_new",
        invoice_id=payload.invoice_id,
        amount_minor=payload.amount_minor,
        payment_date=payload.payment_date,
        reference=payload.reference,
        proof_file_url=payload.proof_file_url,
        status="pending",
        created_at=datetime.now(timezone.utc)
    )
