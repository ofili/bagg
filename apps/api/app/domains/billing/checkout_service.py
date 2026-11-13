
"""Application workflow for provider-backed billing purchase intents."""

from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domains.billing.models import BillingCheckout
from app.domains.billing.repository import BillingRepository
from app.domains.billing.schemas import CheckoutResponse
from app.integrations.paystack import PaystackClient


def _paystack_plan_code(plan: str, interval: str) -> str | None:
    setting_name = (
        f"PAYSTACK_PLAN_{plan.upper()}_{interval.upper()}"
    )
    value = getattr(settings, setting_name, None)
    return value.strip() if isinstance(value, str) and value.strip() else None


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

    if purchase_type == "subscription":
        if not plan or billing_interval not in {"monthly", "annual"}:
            raise HTTPException(
                status_code=400,
                detail="A valid subscription plan and billing interval are required.",
            )

        if not idempotency_key:
            raise HTTPException(
                status_code=400,
                detail="Idempotency-Key header is required for subscription checkout.",
            )

        existing_result = await db.execute(
            select(BillingCheckout).where(
                BillingCheckout.workspace_id == workspace.id,
                BillingCheckout.idempotency_key == idempotency_key,
                )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            if (
                    existing.purchase_type != purchase_type
                    or existing.plan_code != plan
                    or existing.billing_interval != billing_interval
                    or existing.amount_minor != amount_minor
                    or existing.currency != currency
            ):
                raise HTTPException(
                    status_code=409,
                    detail="This Idempotency-Key was already used for a different purchase.",
                )

            if existing.status == "pending" and existing.authorization_url:
                return CheckoutResponse(
                    authorization_url=existing.authorization_url,
                    reference=existing.provider_reference,
                    plan=existing.plan_code or "",
                    billing_interval=existing.billing_interval,
                    amount_minor=existing.amount_minor,
                    currency=existing.currency,
                )

            if existing.status == "succeeded":
                raise HTTPException(
                    status_code=409,
                    detail="This checkout has already been completed.",
                )

            raise HTTPException(
                status_code=409,
                detail="This checkout cannot be resumed. Start a new checkout with a new Idempotency-Key.",
            )

    provider_plan_code = None

    if purchase_type == "subscription":
        provider_plan_code = _paystack_plan_code(plan, billing_interval)
        if not provider_plan_code:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Recurring billing is not configured for this plan and interval. "
                    "Please contact support."
                ),
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
        billing_interval=billing_interval,
        pack_code=pack,
        credits=credits,
        currency=currency,
        amount_minor=amount_minor,
        idempotency_key=idempotency_key,
        status="initializing",
    )

    await repo.add(checkout)
    await db.commit()
    await db.refresh(checkout)

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
            amount_minor=None if provider_plan_code else amount_minor,
            email=owner_email,
            reference=reference,
            currency=currency,
            callback_url=callback_url,
            metadata=metadata,
            plan_code=provider_plan_code,
        )

        url = provider_result.get("authorization_url")
        if not url:
            raise RuntimeError(
                "Payment provider did not return an authorization URL."
            )

        if provider_result.get("reference") != reference:
            raise RuntimeError(
                "Payment provider returned a different checkout reference."
            )

        checkout.authorization_url = url
        checkout.status = "pending"
        await db.commit()

        return CheckoutResponse(
            authorization_url=url,
            reference=reference,
            plan=plan or pack or "",
            billing_interval=billing_interval,
            amount_minor=amount_minor,
            currency=currency,
        )

    except Exception as exc:
        await db.rollback()

        failed = await repo.get_checkout(reference, lock=True)
        if failed:
            failed.status = "failed"
            failed.failure_reason = str(exc)[:1000]
            await db.commit()

        raise HTTPException(
            status_code=502,
            detail="Payment gateway unavailable or unable to initialize checkout.",
        ) from exc
