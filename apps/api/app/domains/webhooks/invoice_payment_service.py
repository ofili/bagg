"""Application workflow for verified Paystack invoice-payment webhooks."""

from __future__ import annotations
import logging
from datetime import date
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.billing.models import WebhookEvent
from app.domains.billing.repository import BillingRepository
from app.domains.payments.repository import PaymentRepository
from app.domains.receipts.repository import ReceiptRepository
from app.domains.receipts.service import confirm_payment

logger = logging.getLogger(__name__)


def _event_key(reference: str) -> str:
    return f"paystack:invoice-payment:{reference}"


def _safe_provider_payload(payload: dict) -> dict:
    data = payload.get("data") or {}
    return {
        "event": payload.get("event"),
        "data": {
            k: data.get(k)
            for k in (
                "id",
                "reference",
                "amount",
                "currency",
                "status",
                "channel",
                "paid_at",
            )
        },
    }


async def _event(db: AsyncSession, reference: str, payload: dict) -> WebhookEvent:
    repo = BillingRepository(db)
    key = _event_key(reference)
    existing = await repo.get_webhook_event(key, lock=True)
    if existing:
        return existing
    candidate = WebhookEvent(
        processor="paystack",
        event_type="charge.success",
        idempotency_key=key,
        payload=_safe_provider_payload(payload),
        processed=False,
    )
    repo.add(candidate)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    result = await repo.get_webhook_event(key, lock=True)
    if result is None:
        raise RuntimeError("Unable to establish invoice payment webhook event.")
    return result


async def process_invoice_payment_event(db: AsyncSession, payload: dict) -> dict:
    event_type = payload.get("event")
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {}
    reference = data.get("reference")
    if (
        event_type != "charge.success"
        or metadata.get("type") != "direct_invoice_payment"
    ):
        return {"status": "ignored"}
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError("Missing Paystack transaction reference.")
    invoice_id = metadata.get("invoice_id")
    workspace_id = metadata.get("workspace_id")
    if not invoice_id or not workspace_id:
        raise ValueError("Missing invoice metadata.")
    event = await _event(db, reference, payload)
    if event.processed:
        return {"status": "already_processed"}
    billing_repo = BillingRepository(db)
    payment_repo = PaymentRepository(db)
    receipt_repo = ReceiptRepository(db)
    try:
        invoice = await payment_repo.get_invoice_for_update(workspace_id, invoice_id)
        if invoice is None:
            raise ValueError(
                f"Invoice '{invoice_id}' not found for payment '{reference}'."
            )
        workspace = await billing_repo.lock_workspace(workspace_id)
        if workspace is None:
            raise ValueError(
                f"Workspace '{workspace_id}' not found for payment '{reference}'."
            )
        attempt = await payment_repo.get_attempt_by_reference(
            "paystack", reference, lock=True
        )
        if (
            attempt is None
            or attempt.invoice_id != invoice_id
            or attempt.workspace_id != workspace_id
        ):
            raise ValueError("Payment reference does not belong to this invoice.")
        currency = data.get("currency")
        if (
            not isinstance(currency, str)
            or currency.upper() != attempt.currency.upper()
            or currency.upper() != invoice.currency.upper()
        ):
            raise ValueError(
                "Paystack transaction currency does not match the payment attempt and invoice."
            )
        try:
            amount = int(data.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0 or amount != attempt.amount_minor:
            raise ValueError(
                "Paystack transaction amount does not match the initialized payment attempt."
            )
        if data.get("status") != "success":
            raise ValueError(
                "Paystack charge.success event does not contain a successful transaction."
            )
        if (
            metadata.get("payment_attempt_id")
            and metadata["payment_attempt_id"] != attempt.id
        ):
            raise ValueError(
                "Paystack payment attempt metadata does not match the stored attempt."
            )
        existing = await receipt_repo.find_provider_receipt(workspace_id, reference)
        if existing:
            if (
                existing.invoice_id != invoice.id
                or existing.amount_paid_minor != amount
                or existing.currency.upper() != currency.upper()
            ):
                raise ValueError(
                    "Existing receipt conflicts with the verified Paystack transaction."
                )
            if attempt.invalidated_at:
                invoice.reconciliation_required = True
            attempt.receipt_id = existing.id
            attempt.status = (
                "reconciliation_required" if attempt.invalidated_at else "succeeded"
            )
            attempt.reconciliation_required = bool(attempt.invalidated_at)
            attempt.provider_transaction_id = (
                str(data.get("id")) if data.get("id") is not None else None
            )
            attempt.provider_status = data.get("status")
            attempt.provider_payload = _safe_provider_payload(payload)
            event.processed = True
            event.error_message = None
            await db.commit()
            return {
                "status": "success",
                "reconciliation_required": attempt.reconciliation_required,
                "receipt_id": existing.id,
            }
        late = attempt.invalidated_at is not None or attempt.status == "invalidated"
        channel = str(data.get("channel") or "card").lower()
        method = "mobile_money" if channel in {"mobile_money", "ussd"} else "card"
        customer = data.get("customer") or {}
        payer_name = " ".join(
            p for p in (customer.get("first_name"), customer.get("last_name")) if p
        ) or customer.get("email")
        receipt = await confirm_payment(
            db=db,
            workspace=workspace,
            invoice=invoice,
            amount_paid_minor=amount,
            payment_method=method,
            reference=reference,
            payer_name=payer_name,
            payment_date=date.today(),
            confirmation_source="webhook_paystack_late" if late else "webhook_paystack",
            provider="paystack",
            provider_reference=reference,
            late_payment=late,
        )
        attempt.receipt_id = receipt.id
        attempt.provider_transaction_id = (
            str(data.get("id")) if data.get("id") is not None else None
        )
        attempt.provider_status = data.get("status")
        attempt.provider_channel = channel
        attempt.provider_payload = _safe_provider_payload(payload)
        attempt.succeeded_at = receipt.verified_at
        attempt.status = "reconciliation_required" if late else "succeeded"
        attempt.reconciliation_required = late
        attempt.reconciliation_reason = (
            "Provider confirmed payment after checkout invalidation; manual reconciliation is required."
            if late
            else None
        )
        event.processed = True
        event.error_message = None
        await db.commit()
        logger.info(
            "Recorded Paystack invoice payment %s for invoice %s; late=%s",
            reference,
            invoice_id,
            late,
        )
        return {
            "status": "success",
            "receipt_id": receipt.id,
            "reconciliation_required": late,
        }
    except Exception as exc:
        await db.rollback()
        event = await billing_repo.get_webhook_event(_event_key(reference), lock=True)
        if event is not None:
            event.error_message = str(exc)[:4000]
            await db.commit()
        logger.exception("Failed to process Paystack invoice payment %s", reference)
        raise
