from __future__ import annotations

from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.dependencies import resolve_active_workspace

from app.domains.billing.catalog import (
    CURRENCY,
    PLAN_PRICING,
    COMING_SOON_PLANS,
    CREDIT_PACK_PRICING,
    FREE_TIER_MONTHLY_SENDS_LIMIT,
    get_plan_price,
)
from app.domains.billing.schemas import (
    SubscriptionResponse,
    CreditBalanceResponse,
    CreditLedgerResponse,
    CheckoutRequest,
    CheckoutResponse,
    CheckoutStatusResponse,
    CreditPackPurchaseRequest,
    SubscriptionCancelResponse,
    PlanCatalogueItem,
    PlanCatalogueResponse,
)
from app.domains.billing.service import (
    get_credit_balance,
    get_free_sends_used_this_month,
    get_or_create_subscription,
    get_credit_history,
)
from app.domains.billing.repository import BillingRepository
from app.domains.billing.checkout_service import (
    create_billing_checkout,
    apply_verified_checkout_payment,
)
from app.domains.billing.models import BillingCheckout
from app.integrations.paystack import PaystackClient, PaystackError


router = APIRouter(
    prefix="/billing",
    tags=["Billing & Subscriptions"],
)


@router.get("/plans", response_model=PlanCatalogueResponse)
async def get_plan_catalogue():
    plans = [
        PlanCatalogueItem(
            code="free",
            name="Free",
            available=True,
            billing_intervals=[],
            prices={},
        ),
        PlanCatalogueItem(
            code="creator_pro",
            name="Creator Pro",
            available=True,
            billing_intervals=["monthly", "annual"],
            prices=PLAN_PRICING["creator_pro"],
        ),
        PlanCatalogueItem(
            code="professional",
            name="Professional",
            available=True,
            billing_intervals=["monthly", "annual"],
            prices=PLAN_PRICING["professional"],
        ),
        PlanCatalogueItem(
            code="studio",
            name="Studio",
            available=False,
            availability_status="coming_soon",
            billing_intervals=[],
            prices={},
        ),
    ]

    return PlanCatalogueResponse(
        currency=CURRENCY,
        plans=plans,
    )


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
        history=[
            CreditLedgerResponse.model_validate(item)
            for item in history
        ],
    )


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription_checkout(
        payload: CheckoutRequest,
        idempotency_key: str | None = Header(
            default=None,
            alias="Idempotency-Key",
        ),
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    plan = payload.plan.strip().lower()

    try:
        amount_minor = get_plan_price(
            plan,
            payload.billing_interval,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return await create_billing_checkout(
        workspace=workspace,
        db=db,
        purchase_type="subscription",
        plan=plan,
        billing_interval=payload.billing_interval,
        currency=CURRENCY,
        amount_minor=amount_minor,
        callback_url=payload.callback_url,
        idempotency_key=idempotency_key,
    )


@router.post(
    "/credits/buy",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def buy_credit_pack(
        payload: CreditPackPurchaseRequest,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    pack = payload.pack.strip().lower()
    config = CREDIT_PACK_PRICING.get(pack)

    if not config:
        raise HTTPException(
            status_code=400,
            detail="Invalid credit pack.",
        )

    return await create_billing_checkout(
        workspace=workspace,
        db=db,
        purchase_type="credit_pack",
        pack=pack,
        credits=config["credits"],
        currency=CURRENCY,
        amount_minor=config[CURRENCY],
        callback_url=payload.callback_url,
    )


def _checkout_status_response(
        checkout: BillingCheckout,
) -> CheckoutStatusResponse:
    return CheckoutStatusResponse(
        checkout_id=checkout.id,
        reference=checkout.provider_reference,
        purchase_type=checkout.purchase_type,
        plan=checkout.plan_code,
        pack=checkout.pack_code,
        billing_interval=checkout.billing_interval,
        amount_minor=checkout.amount_minor,
        currency=checkout.currency,
        status=checkout.status,
        authorization_url=checkout.authorization_url,
        paid_at=checkout.paid_at,
        created_at=checkout.created_at,
    )


@router.get(
    "/checkouts/{checkout_id}",
    response_model=CheckoutStatusResponse,
)
async def get_checkout_status(
        checkout_id: str,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    repo = BillingRepository(db)

    checkout = await repo.get_checkout_by_id(
        workspace.id,
        checkout_id,
    )

    if checkout is None:
        raise HTTPException(
            status_code=404,
            detail="Checkout not found.",
        )

    return _checkout_status_response(checkout)


@router.post(
    "/checkouts/{checkout_id}/reconcile",
    response_model=CheckoutStatusResponse,
)
async def reconcile_checkout(
        checkout_id: str,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    repo = BillingRepository(db)

    checkout = await repo.get_checkout_by_id(
        workspace.id,
        checkout_id,
        lock=True,
    )

    if checkout is None:
        raise HTTPException(
            status_code=404,
            detail="Checkout not found.",
        )

    if checkout.status == "succeeded":
        return _checkout_status_response(checkout)

    try:
        provider_data = await PaystackClient().verify_payment(
            checkout.provider_reference
        )
    except PaystackError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not verify the payment with Paystack.",
        ) from exc

    provider_status = str(
        provider_data.get("status") or ""
    ).lower()

    if provider_status == "success":
        try:
            await apply_verified_checkout_payment(
                db=db,
                checkout=checkout,
                data=provider_data,
                require_metadata=False,
            )
            await db.commit()
            await db.refresh(checkout)

        except Exception as exc:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail=(
                    "The payment was verified, but Bagg could not apply "
                    "the purchase. Please contact support."
                ),
            ) from exc

    elif provider_status == "failed":
        checkout.status = "failed"
        checkout.failure_reason = "Paystack verification returned failed."
        await db.commit()
        await db.refresh(checkout)

    # Pending or abandoned provider transactions remain pending.
    return _checkout_status_response(checkout)


@router.post(
    "/subscription/cancel",
    response_model=SubscriptionCancelResponse,
)
async def cancel_subscription(
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    sub = await get_or_create_subscription(workspace, db)

    if not sub.processor_subscription_code:
        raise HTTPException(
            status_code=409,
            detail="There is no linked Paystack subscription to manage.",
        )

    try:
        manage_url = await PaystackClient().get_subscription_manage_link(
            sub.processor_subscription_code
        )
    except PaystackError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not open subscription management. Please try again.",
        ) from exc

    return SubscriptionCancelResponse(
        message=(
            "Complete the cancellation on Paystack. Bagg will update your "
            "subscription after Paystack confirms the change."
        ),
        tier=sub.tier,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        manage_url=manage_url,
    )