"""Paystack billing-webhook application workflow with durable idempotency."""

from __future__ import annotations
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.billing.models import WebhookEvent
from app.domains.billing.repository import BillingRepository
from app.domains.billing.catalog import PLAN_PRICING, CREDIT_PACK_PRICING
from app.domains.billing.service import (
    CREDIT_REASON_PACK_PURCHASE,
    add_credits,
    activate_subscription,
    handle_failed_payment,
)

logger = logging.getLogger(__name__)


def _safe_payload(payload: dict) -> dict:
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {}
    customer = data.get("customer") or {}
    return {
        "event": payload.get("event"),
        "data": {
            "id": data.get("id"),
            "reference": data.get("reference"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "status": data.get("status"),
            "metadata": {
                k: metadata.get(k)
                for k in (
                    "type",
                    "billing_checkout_id",
                    "workspace_id",
                    "purchase_type",
                    "plan",
                    "pack",
                )
                if metadata.get(k) is not None
            },
            "subscription_code": data.get("subscription_code"),
            "customer_code": customer.get("customer_code"),
        },
    }


async def _get_or_create_event(
    db: AsyncSession, key: str, event_type: str, payload: dict
) -> WebhookEvent:
    repo = BillingRepository(db)
    event = await repo.get_webhook_event(key, lock=True)
    if event:
        return event
    event = WebhookEvent(
        processor="paystack",
        event_type=event_type or "unknown",
        idempotency_key=key,
        payload=_safe_payload(payload),
        processed=False,
    )
    await repo.add(event)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    event = await repo.get_webhook_event(key, lock=True)
    if event is None:
        raise RuntimeError("Could not establish webhook idempotency record.")
    return event


async def process_paystack_billing_event(
    db: AsyncSession, payload: dict, idempotency_key: str
) -> dict:
    event_type = payload.get("event") or "unknown"
    event = await _get_or_create_event(db, idempotency_key, event_type, payload)
    if event.processed:
        return {"status": "already_processed"}
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {}
    repo = BillingRepository(db)
    try:
        if (
            event_type == "charge.success"
            and metadata.get("type") == "bagg_billing_checkout"
        ):
            reference = data.get("reference")
            if not isinstance(reference, str) or not reference:
                raise ValueError("Missing billing checkout reference.")
            checkout = await repo.get_checkout(reference, lock=True)
            if checkout is None:
                raise ValueError(
                    "No server-created billing checkout matches this payment reference."
                )
            if (
                metadata.get("billing_checkout_id") != checkout.id
                or metadata.get("workspace_id") != checkout.workspace_id
                or metadata.get("purchase_type") != checkout.purchase_type
            ):
                raise ValueError(
                    "Billing checkout metadata does not match the stored purchase intent."
                )
            if (
                checkout.purchase_type == "subscription"
                and metadata.get("plan") != checkout.plan_code
            ):
                raise ValueError(
                    "Subscription plan metadata does not match the stored purchase intent."
                )
            if (
                checkout.purchase_type == "credit_pack"
                and metadata.get("pack") != checkout.pack_code
            ):
                raise ValueError(
                    "Credit-pack metadata does not match the stored purchase intent."
                )
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
                    "Verified payment amount or currency does not match the billing checkout."
                )
            if data.get("status") != "success":
                raise ValueError("Paystack charge.success payload is not successful.")
            if checkout.status != "succeeded":
                if checkout.purchase_type == "credit_pack":
                    pack = CREDIT_PACK_PRICING.get(checkout.pack_code or "")
                    if (
                        not pack
                        or checkout.credits != pack["credits"]
                        or checkout.amount_minor <= 0
                    ):
                        raise ValueError(
                            "Stored credit-pack purchase intent is invalid."
                        )
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
                    plan = PLAN_PRICING.get(checkout.plan_code or "")
                    if not plan or checkout.amount_minor <= 0:
                        raise ValueError(
                            "Stored subscription purchase intent is invalid."
                        )
                    await activate_subscription(
                        checkout.workspace_id,
                        checkout.plan_code,
                        checkout.currency,
                        checkout.amount_minor,
                        "paystack",
                        data.get("subscription_code"),
                        (data.get("customer") or {}).get("customer_code"),
                        db,
                        commit=False,
                    )
                else:
                    raise ValueError("Unsupported billing purchase type.")
                checkout.status = "succeeded"
                checkout.provider_transaction_id = (
                    str(data.get("id")) if data.get("id") is not None else None
                )
                from datetime import datetime, timezone

                checkout.paid_at = datetime.now(timezone.utc)
        elif event_type in {"invoice.payment_failed", "subscription.not_renew"}:
            workspace_id = metadata.get("workspace_id")
            if not workspace_id:
                subscription = data.get("subscription") or {}
                subscription_code = data.get("subscription_code") or subscription.get(
                    "subscription_code"
                )
                if subscription_code:
                    stored_subscription = await repo.get_subscription_by_provider_code(
                        "paystack", str(subscription_code)
                    )
                    workspace_id = (
                        stored_subscription.workspace_id
                        if stored_subscription
                        else None
                    )
            if not workspace_id:
                raise ValueError(
                    "Could not resolve the workspace for the failed subscription payment."
                )
            await handle_failed_payment(workspace_id, db, commit=False)
        # Unrecognized event types are acknowledged without granting value.
        event.processed = True
        event.error_message = None
        await db.commit()
        return {"status": "success"}
    except Exception as exc:
        await db.rollback()
        event = await repo.get_webhook_event(idempotency_key, lock=True)
        if event is not None:
            event.error_message = str(exc)[:4000]
            await db.commit()
        logger.exception("Failed to process Paystack billing event %s", idempotency_key)
        raise
