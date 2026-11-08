from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.billing.catalog import (
    PLAN_PRICING,
    CREDIT_PACK_PRICING,
    FREE_TIER_MONTHLY_SENDS_LIMIT,
)
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
    cancel_subscription_renewal,
    get_credit_history,
)
from app.domains.billing.checkout_service import create_billing_checkout

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    sub = await get_or_create_subscription(workspace, db)
    balance = await get_credit_balance(workspace.id, db)
    used = await get_free_sends_used_this_month(workspace.id, db)
    now = datetime.now(timezone.utc)
    in_grace = sub.status == "past_due" and bool(
        sub.grace_period_end and now <= sub.grace_period_end
    )
    return SubscriptionResponse(
        id=sub.id,
        workspace_id=workspace.id,
        tier=sub.tier or "free",
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
        free_sends_used_this_month=used,
        free_sends_limit=FREE_TIER_MONTHLY_SENDS_LIMIT,
        credit_balance=balance,
    )


@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credits(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    balance = await get_credit_balance(workspace.id, db)
    used = await get_free_sends_used_this_month(workspace.id, db)
    history = await get_credit_history(workspace.id, db, 20)
    return CreditBalanceResponse(
        workspace_id=workspace.id,
        balance=balance,
        tier=workspace.tier,
        free_sends_used_this_month=used,
        free_sends_limit=FREE_TIER_MONTHLY_SENDS_LIMIT,
        history=[CreditLedgerResponse.model_validate(item) for item in history],
    )


@router.post(
    "/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED
)
async def create_subscription_checkout(
    payload: CheckoutRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    plan = payload.plan.lower().strip()
    currency = payload.currency.upper().strip()
    if plan not in PLAN_PRICING:
        raise HTTPException(
            status_code=400, detail="Invalid plan. Choose creator_pro or professional."
        )
    if currency not in PLAN_PRICING[plan]:
        raise HTTPException(status_code=400, detail="Unsupported billing currency.")
    return await create_billing_checkout(
        workspace=workspace,
        db=db,
        purchase_type="subscription",
        plan=plan,
        currency=currency,
        amount_minor=PLAN_PRICING[plan][currency],
        callback_url=payload.callback_url,
    )


@router.post(
    "/credits/buy", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED
)
async def buy_credit_pack(
    payload: CreditPackPurchaseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    pack = payload.pack.lower().strip()
    currency = payload.currency.upper().strip()
    if pack not in CREDIT_PACK_PRICING:
        raise HTTPException(status_code=400, detail="Invalid credit pack.")
    if currency not in CREDIT_PACK_PRICING[pack]:
        raise HTTPException(status_code=400, detail="Unsupported billing currency.")
    config = CREDIT_PACK_PRICING[pack]
    return await create_billing_checkout(
        workspace=workspace,
        db=db,
        purchase_type="credit_pack",
        pack=pack,
        credits=config["credits"],
        currency=currency,
        amount_minor=config[currency],
        callback_url=payload.callback_url,
    )


@router.post("/subscription/cancel", response_model=SubscriptionCancelResponse)
async def cancel_subscription(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    sub = await cancel_subscription_renewal(workspace.id, db)
    return SubscriptionCancelResponse(
        message="Subscription auto-renewal canceled. Paid features remain available until the current billing period ends.",
        tier=sub.tier,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=True,
    )
