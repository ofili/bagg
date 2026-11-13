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
    apply_subscription_renewal,
    handle_failed_payment,
)
from app.domains.billing.checkout_service import (
    _paystack_plan_code,
    apply_verified_checkout_payment,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


def _safe_payload(payload: dict) -> dict:
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {}
    customer = data.get("customer") or {}
    subscription = data.get("subscription") or {}
    plan = subscription.get("plan") or data.get("plan") or {}
    transaction = data.get("transaction") or {}

    return {
        "event": payload.get("event"),
        "data": {
            "id": data.get("id"),
            "reference": data.get("reference"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "status": data.get("status"),
            "paid": data.get("paid"),
            "period_start": data.get("period_start"),
            "period_end": data.get("period_end"),
            "invoice_code": data.get("invoice_code"),
            "transaction": {
                "reference": transaction.get("reference"),
                "status": transaction.get("status"),
                "amount": transaction.get("amount"),
                "currency": transaction.get("currency"),
            },
            "metadata": {
                key: metadata.get(key)
                for key in (
                    "type",
                    "billing_checkout_id",
                    "workspace_id",
                    "purchase_type",
                    "plan",
                    "billing_interval",
                    "pack",
                )
                if metadata.get(key) is not None
            },
            "subscription": {
                "subscription_code": subscription.get("subscription_code")
                                     or data.get("subscription_code"),
                "status": subscription.get("status"),
                "amount": subscription.get("amount"),
                "next_payment_date": subscription.get("next_payment_date"),
                "plan_code": plan.get("plan_code"),
            },
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

            await apply_verified_checkout_payment(
                db=db,
                checkout=checkout,
                data=data,
                require_metadata=True,
            )

        elif event_type == "subscription.create":
            subscription_data = data.get("subscription") or data
            subscription_code = subscription_data.get("subscription_code")

            customer = data.get("customer") or {}
            customer_code = customer.get("customer_code")

            plan = subscription_data.get("plan") or data.get("plan") or {}
            provider_plan_code = plan.get("plan_code")

            if not subscription_code or not customer_code:
                raise ValueError(
                    "Paystack subscription creation event is incomplete."
                )

            candidate = await repo.get_subscription_by_customer_code(
                "paystack",
                str(customer_code),
                lock=True,
            )

            if candidate is None:
                # Do not attach an unknown provider subscription to a workspace.
                raise ValueError(
                    "No unlinked Bagg subscription matches this Paystack customer."
                )

            if candidate.processor_subscription_code:
                if candidate.processor_subscription_code != subscription_code:
                    raise ValueError(
                        "A different Paystack subscription is already linked."
                    )
            else:
                if candidate.processor_plan_code and provider_plan_code:
                    if candidate.processor_plan_code != provider_plan_code:
                        raise ValueError(
                            "Paystack plan does not match the stored provider plan."
                        )

                candidate.processor_subscription_code = str(subscription_code)

            await repo.flush()

        elif event_type == "invoice.update":
            subscription, subscription_code = await _get_subscription_for_event(
                repo,
                data,
            )

            transaction = data.get("transaction") or {}
            amount_value = (
                transaction.get("amount")
                if transaction.get("amount") is not None
                else data.get("amount")
            )
            currency_value = (
                    transaction.get("currency")
                    or data.get("currency")
            )

            if not currency_value:
                raise ValueError(
                    "Paystack renewal invoice is missing its currency."
                )

            try:
                paid_amount = int(amount_value)
            except (TypeError, ValueError):
                paid_amount = 0

            invoice_status = str(data.get("status") or "").lower()
            transaction_status = str(
                transaction.get("status") or ""
            ).lower()
            paid = data.get("paid")

            if not (
                    invoice_status in {"success", "paid"}
                    or transaction_status == "success"
            ):
                # Failed or pending invoices must not extend entitlements.
                if invoice_status in {"failed", "attention"}:
                    await handle_failed_payment(
                        subscription.workspace_id,
                        db,
                        commit=False,
                    )
            elif paid is False or paid == 0:
                raise ValueError(
                    "Paystack invoice is not marked as paid."
                )
            else:
                await apply_subscription_renewal(
                    subscription_code=subscription_code,
                    amount_minor=paid_amount,
                    currency=str(currency_value),
                    period_start=data.get("period_start"),
                    period_end=data.get("period_end"),
                    db=db,
                    commit=False,
                )

        elif event_type == "invoice.payment_failed":
            subscription, _ = await _get_subscription_for_event(repo, data)

            await handle_failed_payment(
                subscription.workspace_id,
                db,
                commit=False,
            )

        elif event_type in {
            "subscription.not_renew",
            "subscription.disable",
        }:
            subscription, _ = await _get_subscription_for_event(repo, data)

            workspace = await repo.lock_workspace(subscription.workspace_id)
            if workspace is None:
                raise ValueError("Subscription workspace no longer exists.")

            subscription = await repo.get_subscription(
                workspace.id,
                lock=True,
            )
            if subscription is None:
                raise ValueError("Subscription record no longer exists.")

            # Both events confirm that Paystack will no longer renew this
            # subscription. Paid access remains until the stored period ends.
            subscription.cancel_at_period_end = True

            if subscription.status not in {"past_due", "downgraded"}:
                subscription.status = "active"

            await repo.flush()

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


async def _get_subscription_for_event(
        repo: BillingRepository,
        data: dict,
):
    subscription_data = data.get("subscription") or {}
    subscription_code = (
            data.get("subscription_code")
            or subscription_data.get("subscription_code")
    )

    if not subscription_code:
        raise ValueError("Paystack event has no subscription code.")

    subscription = await repo.get_subscription_by_provider_code(
        "paystack",
        str(subscription_code),
    )

    if subscription is None:
        raise ValueError(
            "No Bagg subscription matches the Paystack subscription code."
        )

    return subscription, str(subscription_code)
