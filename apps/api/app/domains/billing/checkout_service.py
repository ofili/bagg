"""Application workflow for provider-backed billing purchase intents."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domains.billing.catalog import (
    PLAN_PRICING,
    CREDIT_PACK_PRICING,
)
from app.domains.billing.models import BillingCheckout
from app.domains.billing.repository import BillingRepository
from app.domains.billing.schemas import CheckoutResponse
from app.domains.billing.service import (
    CREDIT_REASON_PACK_PURCHASE,
    activate_subscription,
    add_credits,
)
from app.integrations.paystack import PaystackClient


def _paystack_plan_code(plan: str, interval: str) -> str | None:
    setting_name = f"PAYSTACK_PLAN_{plan.upper()}_{interval.upper()}"
    value = getattr(settings, setting_name, None)

    return value.strip() if isinstance(value, str) and value.strip() else None


def _checkout_response(checkout: BillingCheckout) -> CheckoutResponse:
    if not checkout.authorization_url:
        raise HTTPException(
            status_code=409,
            detail="Checkout initialization is not yet complete.",
        )

    return CheckoutResponse(
        checkout_id=checkout.id,
        authorization_url=checkout.authorization_url,
        reference=checkout.provider_reference,
        plan=checkout.plan_code or checkout.pack_code or "",
        billing_interval=checkout.billing_interval,
        amount_minor=checkout.amount_minor,
        currency=checkout.currency,
        status=checkout.status,
    )


async def _find_idempotent_checkout(
        db: AsyncSession,
        workspace_id: str,
        idempotency_key: str,
) -> BillingCheckout | None:
    result = await db.execute(
        select(BillingCheckout).where(
            BillingCheckout.workspace_id == workspace_id,
            BillingCheckout.idempotency_key == idempotency_key,
            )
    )

    return result.scalar_one_or_none()


def _validate_idempotent_reuse(
        existing: BillingCheckout,
        *,
        purchase_type: str,
        plan: str | None,
        billing_interval: str | None,
        amount_minor: int,
        currency: str,
) -> CheckoutResponse:
    if (
            existing.purchase_type != purchase_type
            or existing.plan_code != plan
            or existing.billing_interval != billing_interval
            or existing.amount_minor != amount_minor
            or existing.currency != currency
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This Idempotency-Key was already used for a different purchase."
            ),
        )

    if existing.status == "pending" and existing.authorization_url:
        return _checkout_response(existing)

    if existing.status == "succeeded":
        raise HTTPException(
            status_code=409,
            detail="This checkout has already been completed.",
        )

    raise HTTPException(
        status_code=409,
        detail=(
            "This checkout is already being processed or cannot be resumed. "
            "Check its status before starting another checkout."
        ),
    )


async def create_billing_checkout(
        *,
        workspace,
        db: AsyncSession,
        purchase_type: str,
        currency: str,
        amount_minor: int,
        plan: str | None = None,
        billing_interval: str | None = None,
        pack: str | None = None,
        credits: int | None = None,
        callback_url: str | None = None,
        idempotency_key: str | None = None,
) -> CheckoutResponse:
    repo = BillingRepository(db)

    currency = currency.upper()

    if amount_minor <= 0:
        raise HTTPException(
            status_code=400,
            detail="Checkout amount must be positive.",
        )

    if purchase_type == "subscription":
        if not plan or billing_interval not in {"monthly", "annual"}:
            raise HTTPException(
                status_code=400,
                detail="A valid subscription plan and billing interval are required.",
            )

        if not idempotency_key:
            raise HTTPException(
                status_code=400,
                detail="Idempotency-Key header is required.",
            )

        if len(idempotency_key) > 128:
            raise HTTPException(
                status_code=400,
                detail="Idempotency-Key must not exceed 128 characters.",
            )

        if currency != "NGN":
            raise HTTPException(
                status_code=400,
                detail="Only NGN subscription billing is currently supported.",
            )

        existing = await _find_idempotent_checkout(
            db,
            workspace.id,
            idempotency_key,
        )

        if existing:
            return _validate_idempotent_reuse(
                existing,
                purchase_type=purchase_type,
                plan=plan,
                billing_interval=billing_interval,
                amount_minor=amount_minor,
                currency=currency,
            )

        provider_plan_code = _paystack_plan_code(plan, billing_interval)

        if not provider_plan_code:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Recurring billing is not configured for this plan and interval."
                ),
            )

    elif purchase_type == "credit_pack":
        if not pack or not credits or credits <= 0:
            raise HTTPException(
                status_code=400,
                detail="A valid credit pack is required.",
            )

        if currency != "NGN":
            raise HTTPException(
                status_code=400,
                detail="Only NGN credit purchases are currently supported.",
            )

        provider_plan_code = None

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported billing purchase type.",
        )

    reference = (
        f"bagg_{'sub' if purchase_type == 'subscription' else 'pack'}_"
        f"{uuid.uuid4().hex}"
    )

    checkout = BillingCheckout(
        workspace_id=workspace.id,
        provider="paystack",
        provider_reference=reference,
        purchase_type=purchase_type,
        plan_code=plan,
        processor_plan_code=provider_plan_code,
        billing_interval=billing_interval,
        pack_code=pack,
        credits=credits,
        currency=currency,
        amount_minor=amount_minor,
        idempotency_key=idempotency_key,
        status="initializing",
    )

    await repo.add(checkout)

    try:
        await db.commit()
        await db.refresh(checkout)

    except IntegrityError:
        await db.rollback()

        if idempotency_key:
            existing = await _find_idempotent_checkout(
                db,
                workspace.id,
                idempotency_key,
            )

            if existing:
                return _validate_idempotent_reuse(
                    existing,
                    purchase_type=purchase_type,
                    plan=plan,
                    billing_interval=billing_interval,
                    amount_minor=amount_minor,
                    currency=currency,
                )

        raise HTTPException(
            status_code=409,
            detail="Could not create checkout because of a conflicting request.",
        )

    try:
        owner_email = await repo.get_owner_email(workspace.id)

        if not owner_email:
            raise ValueError("Workspace owner email is unavailable.")

        metadata = {
            "type": "bagg_billing_checkout",
            "billing_checkout_id": checkout.id,
            "workspace_id": workspace.id,
            "purchase_type": purchase_type,
        }

        if plan:
            metadata["plan"] = plan

        if billing_interval:
            metadata["billing_interval"] = billing_interval

        if pack:
            metadata["pack"] = pack

        provider_result = await PaystackClient().initialize_payment(
            amount_minor=amount_minor,
            email=owner_email,
            reference=reference,
            currency=currency,
            callback_url=callback_url,
            metadata=metadata,
            plan_code=provider_plan_code,
        )

        authorization_url = provider_result.get("authorization_url")

        if not authorization_url:
            raise RuntimeError(
                "Payment provider did not return an authorization URL."
            )

        if provider_result.get("reference") != reference:
            raise RuntimeError(
                "Payment provider returned a different checkout reference."
            )

        checkout.authorization_url = authorization_url
        checkout.status = "pending"

        await db.commit()
        await db.refresh(checkout)

        return _checkout_response(checkout)

    except Exception as exc:
        await db.rollback()

        failed = await repo.get_checkout(reference, lock=True)

        if failed and failed.status != "succeeded":
            failed.status = "failed"
            failed.failure_reason = str(exc)[:1000]
            await db.commit()

        raise HTTPException(
            status_code=502,
            detail=(
                "Payment gateway unavailable or unable to initialize checkout."
            ),
        ) from exc


async def apply_verified_checkout_payment(
        *,
        db: AsyncSession,
        checkout: BillingCheckout,
        data: dict,
        require_metadata: bool = False,
) -> BillingCheckout:
    """Apply a successful provider payment to its stored purchase intent.

    The caller must have verified the webhook signature or called the
    provider's transaction verification endpoint. The checkout must be
    loaded with a row lock.
    """

    if checkout.status == "succeeded":
        return checkout

    reference = data.get("reference")

    if reference != checkout.provider_reference:
        raise ValueError("Payment reference does not match the checkout.")

    if str(data.get("status") or "").lower() != "success":
        raise ValueError("Provider transaction is not successful.")

    try:
        paid_amount = int(data.get("amount") or 0)
    except (TypeError, ValueError):
        paid_amount = 0

    paid_currency = str(data.get("currency") or "").upper()

    if (
            paid_amount != checkout.amount_minor
            or paid_currency != checkout.currency.upper()
    ):
        raise ValueError(
            "Verified payment amount or currency does not match the checkout."
        )

    metadata = data.get("metadata") or {}

    if require_metadata:
        if (
                metadata.get("type") != "bagg_billing_checkout"
                or metadata.get("billing_checkout_id") != checkout.id
                or metadata.get("workspace_id") != checkout.workspace_id
                or metadata.get("purchase_type") != checkout.purchase_type
        ):
            raise ValueError(
                "Billing checkout metadata does not match the stored purchase intent."
            )

        if checkout.purchase_type == "subscription":
            if metadata.get("plan") != checkout.plan_code:
                raise ValueError("Subscription plan metadata mismatch.")

            if metadata.get("billing_interval") != checkout.billing_interval:
                raise ValueError("Subscription interval metadata mismatch.")

        if checkout.purchase_type == "credit_pack":
            if metadata.get("pack") != checkout.pack_code:
                raise ValueError("Credit-pack metadata mismatch.")

    if checkout.purchase_type == "credit_pack":
        if not checkout.credits or checkout.credits <= 0:
            raise ValueError("Stored credit-pack purchase intent is invalid.")

        await add_credits(
            checkout.workspace_id,
            checkout.credits,
            CREDIT_REASON_PACK_PURCHASE,
            f"Purchased {checkout.credits} delivery credits",
            checkout.provider_reference,
            db,
            commit=False,
        )

    elif checkout.purchase_type == "subscription":
        if checkout.plan_code not in PLAN_PRICING:
            raise ValueError("Stored subscription plan is invalid.")

        if checkout.billing_interval not in {"monthly", "annual"}:
            raise ValueError("Stored subscription interval is invalid.")

        subscription_data = data.get("subscription") or {}

        customer = data.get("customer") or {}

        subscription_code = (
                data.get("subscription_code")
                or subscription_data.get("subscription_code")
        )

        customer_code = customer.get("customer_code")

        await activate_subscription(
            checkout.workspace_id,
            checkout.plan_code,
            checkout.currency,
            checkout.amount_minor,
            "paystack",
            subscription_code,
            customer_code,
            db,
            billing_interval=checkout.billing_interval,
            processor_plan_code=checkout.processor_plan_code,
            commit=False,
        )

    else:
        raise ValueError("Unsupported billing purchase type.")

    checkout.status = "succeeded"
    checkout.provider_transaction_id = (
        str(data.get("id")) if data.get("id") is not None else None
    )
    checkout.paid_at = datetime.now(timezone.utc)

    await db.flush()

    return checkout