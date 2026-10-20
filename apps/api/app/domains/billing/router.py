from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.billing.models import Subscription, CreditLedgerEntry
from app.domains.billing.schemas import (
    SubscriptionResponse,
    CreditBalanceResponse,
    CreditLedgerResponse,
    CheckoutRequest,
    CheckoutResponse,
    CreditPackPurchaseRequest,
    SubscriptionCancelResponse,
)
from app.domains.billing.service import (
    get_credit_balance,
    get_free_sends_used_this_month,
    get_or_create_subscription,
    add_credits,
    activate_subscription,
    FREE_TIER_MONTHLY_SENDS_LIMIT,
)
from app.integrations.paystack import PaystackClient

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])

PLAN_PRICING = {
    "creator_pro": {
        "NGN": 1400000,  # ₦14,000
        "USD": 1400,     # $14.00
    },
    "professional": {
        "NGN": 2800000,  # ₦28,000
        "USD": 2800,     # $28.00
    },
}

CREDIT_PACK_PRICING = {
    "200_credits": {
        "NGN": 200000,   # ₦2,000
        "USD": 200,      # $2.00
        "credits": 200,
    }
}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns active subscription details, renewal date, and delivery quota stats (US-SUB-01, US-SUB-05).
    """
    sub = await get_or_create_subscription(workspace, db)
    credit_bal = await get_credit_balance(workspace.id, db)
    free_used = await get_free_sends_used_this_month(workspace.id, db)

    now = datetime.now(timezone.utc)
    in_grace = False
    if sub.status == "past_due" and sub.grace_period_end and now <= sub.grace_period_end:
        in_grace = True

    return SubscriptionResponse(
        id=sub.id,
        workspace_id=workspace.id,
        tier=workspace.tier or sub.tier or "free",
        status=sub.status,
        currency=sub.currency,
        amount_minor=sub.amount_minor,
        billing_interval=sub.billing_interval,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        grace_period_end=sub.grace_period_end,
        in_grace_period=in_grace,
        dunning_attempts=sub.dunning_attempts,
        free_sends_used_this_month=free_used,
        free_sends_limit=FREE_TIER_MONTHLY_SENDS_LIMIT,
        credit_balance=credit_bal,
    )


@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credits(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns current credit ledger balance, free tier usage, and audit history (US-SUB-06)."""
    bal = await get_credit_balance(workspace.id, db)
    used = await get_free_sends_used_this_month(workspace.id, db)

    stmt = (
        select(CreditLedgerEntry)
        .where(CreditLedgerEntry.workspace_id == workspace.id)
        .order_by(CreditLedgerEntry.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return CreditBalanceResponse(
        workspace_id=workspace.id,
        balance=bal,
        tier=workspace.tier,
        free_sends_used_this_month=used,
        free_sends_limit=FREE_TIER_MONTHLY_SENDS_LIMIT,
        history=[CreditLedgerResponse.model_validate(e) for e in entries],
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_subscription_checkout(
    payload: CheckoutRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Initializes annual subscription checkout via Paystack (NGN) or MoR (USD) (US-SUB-02).
    """
    plan = payload.plan.lower().strip()
    currency = payload.currency.upper().strip()

    if plan not in PLAN_PRICING:
        raise HTTPException(status_code=400, detail=f"Invalid plan '{payload.plan}'. Must be creator_pro or professional.")
    if currency not in PLAN_PRICING[plan]:
        currency = "NGN"

    amount_minor = PLAN_PRICING[plan][currency]
    reference = f"sub_{workspace.id[:8]}_{uuid.uuid4().hex[:8]}"

    paystack = PaystackClient()
    owner_email = workspace.owner.email if workspace.owner else "creator@bagg.africa"
    auth_data = await paystack.initialize_payment(
        amount_minor=amount_minor,
        email=owner_email,
        reference=reference,
    )

    return CheckoutResponse(
        authorization_url=auth_data["authorization_url"],
        reference=reference,
        plan=plan,
        amount_minor=amount_minor,
        currency=currency,
    )


@router.post("/credits/buy", response_model=CheckoutResponse)
async def buy_credit_pack(
    payload: CreditPackPurchaseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Purchases a 200-credit top-up pack for ₦2,000 / $2 USD (US-SUB-06).
    """
    pack = payload.pack.lower().strip()
    currency = payload.currency.upper().strip()

    if pack not in CREDIT_PACK_PRICING:
        raise HTTPException(status_code=400, detail="Invalid pack. Currently available: 200_credits")
    if currency not in CREDIT_PACK_PRICING[pack]:
        currency = "NGN"

    amount_minor = CREDIT_PACK_PRICING[pack][currency]
    reference = f"pack_{workspace.id[:8]}_{uuid.uuid4().hex[:8]}"

    paystack = PaystackClient()
    owner_email = workspace.owner.email if workspace.owner else "creator@bagg.africa"
    auth_data = await paystack.initialize_payment(
        amount_minor=amount_minor,
        email=owner_email,
        reference=reference,
    )

    return CheckoutResponse(
        authorization_url=auth_data["authorization_url"],
        reference=reference,
        plan="200_credits",
        amount_minor=amount_minor,
        currency=currency,
    )


@router.post("/subscription/cancel", response_model=SubscriptionCancelResponse)
async def cancel_subscription_renewal(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancels subscription auto-renewal (US-SUB-05).
    Retains paid Pro benefits until the end of the paid billing cycle (current_period_end).
    """
    stmt = select(Subscription).where(Subscription.workspace_id == workspace.id)
    sub = (await db.execute(stmt)).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub.cancel_at_period_end = True
    sub.status = "canceled"
    await db.commit()
    await db.refresh(sub)

    return SubscriptionCancelResponse(
        message="Subscription auto-renewal canceled. You will retain Pro features until your billing cycle ends.",
        tier=sub.tier,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=True,
    )
