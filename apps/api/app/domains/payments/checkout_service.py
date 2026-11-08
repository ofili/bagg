"""Public invoice checkout use cases; sharing routes only adapt HTTP contracts."""

from __future__ import annotations
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import NotFoundException
from app.domains.payments.repository import PaymentRepository
from app.domains.payments.invoice_attempts import (
    create_invoice_payment_attempt,
    mark_attempt_initialized,
    mark_attempt_initialization_failed,
    require_attempt_for_invoice,
    mark_attempt_processing,
)
from app.domains.lifecycle.service import invoice_balance_minor
from app.integrations.paystack import PaystackClient, PaystackError


async def initiate_invoice_checkout(
    db: AsyncSession,
    token: str,
    *,
    amount_minor: int | None,
    callback_url: str | None,
    payer_email: str | None = None,
) -> dict:
    repo = PaymentRepository(db)
    row = await repo.get_public_invoice_for_checkout(token)
    if row is None:
        raise NotFoundException("Invoice not found")
    invoice, client, workspace = row
    if invoice.status in {"draft", "cancelled", "void"}:
        raise HTTPException(
            status_code=400, detail=f"Cannot pay a {invoice.status} invoice."
        )
    if not invoice.direct_checkout_enabled:
        raise HTTPException(
            status_code=403, detail="Direct checkout is disabled for this invoice."
        )
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid.")
    if invoice.reconciliation_required:
        raise HTTPException(
            status_code=409,
            detail="A previous payment requires reconciliation. A new checkout cannot be initiated yet.",
        )
    target = (
        invoice.net_payable_minor
        if invoice.net_payable_minor and invoice.net_payable_minor > 0
        else invoice.total_minor
    )
    balance = max(0, target - (invoice.amount_paid_minor or 0))
    if amount_minor is not None and amount_minor > 0:
        charge = min(amount_minor, balance)
    elif invoice.deposit_amount_minor and (invoice.amount_paid_minor or 0) == 0:
        charge = invoice.deposit_amount_minor
    else:
        charge = balance
    if charge <= 0:
        raise HTTPException(status_code=400, detail="No outstanding balance to pay.")
    payer_email = (payer_email or (client.email if client else None) or "").strip()
    if not payer_email or "@" not in payer_email or len(payer_email) > 320:
        raise HTTPException(
            status_code=400,
            detail="A valid payer email is required for online checkout.",
        )
    attempt = await create_invoice_payment_attempt(
        db, invoice, amount_minor=charge, provider="paystack"
    )
    invoice.direct_payment_reference = attempt.provider_reference
    invoice.payment_processing_at = None
    invoice.payment_processing_reference = None
    await db.commit()
    await db.refresh(attempt)
    callback = (
        callback_url or f"{settings.WEB_BASE_URL.rstrip('/')}/i/{token}?payment=success"
    )
    try:
        result = await PaystackClient().initialize_payment(
            amount_minor=charge,
            email=payer_email,
            reference=attempt.provider_reference,
            currency=invoice.currency,
            callback_url=callback,
            metadata={
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "workspace_id": workspace.id,
                "invoice_version": attempt.invoice_version,
                "payment_attempt_id": attempt.id,
                "type": "direct_invoice_payment",
            },
        )
        locked_attempt = await repo.get_attempt(attempt.id, lock=True)
        if locked_attempt is None:
            raise RuntimeError(
                "Payment attempt disappeared during provider initialization."
            )
        if locked_attempt.status == "invalidated":
            await db.commit()
            raise HTTPException(
                status_code=409,
                detail="This invoice checkout was invalidated while the payment provider was initializing it.",
            )
        await mark_attempt_initialized(
            db, locked_attempt, checkout_url=result["authorization_url"]
        )
        await db.commit()
        return {
            "checkout_url": result["authorization_url"],
            "reference": locked_attempt.provider_reference,
            "amount_minor": locked_attempt.amount_minor,
            "currency": locked_attempt.currency,
        }
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        failed = await repo.get_attempt(attempt.id, lock=True)
        if failed and failed.status != "invalidated":
            await mark_attempt_initialization_failed(db, failed, reason=str(exc))
            await db.commit()
        raise HTTPException(
            status_code=502,
            detail="Payment gateway unavailable or unable to initialize checkout.",
        ) from exc


async def verify_invoice_checkout(db: AsyncSession, token: str, reference: str) -> dict:
    repo = PaymentRepository(db)
    invoice = await repo.get_public_invoice_for_update(token)
    if invoice is None or invoice.status == "draft":
        raise NotFoundException("Invoice not found.")
    attempt = await require_attempt_for_invoice(
        db,
        provider="paystack",
        reference=reference,
        invoice_id=invoice.id,
        workspace_id=invoice.workspace_id,
        lock=True,
    )
    try:
        provider_data = await PaystackClient().verify_payment(reference)
    except PaystackError as exc:
        raise HTTPException(
            status_code=502,
            detail="Payment gateway unavailable or unable to verify payment.",
        ) from exc
    provider_status = provider_data.get("status")
    if provider_status != "success":
        return {
            "status": "failed",
            "message": "Payment has not been confirmed by Paystack.",
            "invoice_status": invoice.status,
            "amount_paid_minor": invoice.amount_paid_minor or 0,
            "balance_due_minor": invoice_balance_minor(invoice),
        }
    metadata = provider_data.get("metadata") or {}
    if (
        metadata.get("invoice_id") != invoice.id
        or metadata.get("workspace_id") != invoice.workspace_id
    ):
        raise HTTPException(
            status_code=400, detail="Payment metadata does not match this invoice."
        )
    try:
        amount = int(provider_data.get("amount") or 0)
    except (TypeError, ValueError):
        amount = 0
    currency = str(provider_data.get("currency") or "").upper()
    if amount != attempt.amount_minor or currency != attempt.currency.upper():
        raise HTTPException(
            status_code=400,
            detail="Verified payment amount or currency does not match the original checkout attempt.",
        )
    if (
        metadata.get("payment_attempt_id")
        and metadata["payment_attempt_id"] != attempt.id
    ):
        raise HTTPException(
            status_code=400,
            detail="Payment attempt metadata does not match this checkout.",
        )
    if attempt.status not in {"invalidated", "reconciliation_required", "succeeded"}:
        await mark_attempt_processing(db, attempt)
        invoice.payment_processing_at = datetime.now(timezone.utc)
        invoice.payment_processing_reference = attempt.provider_reference
    attempt.provider_status = provider_status
    attempt.provider_transaction_id = (
        str(provider_data.get("id")) if provider_data.get("id") is not None else None
    )
    await db.commit()
    await db.refresh(invoice)
    if attempt.status == "invalidated":
        return {
            "status": "processing",
            "message": "Paystack confirms the transaction, but this checkout was invalidated. Bagg is awaiting the signed webhook to record the payment for reconciliation.",
            "invoice_status": invoice.status,
            "amount_paid_minor": invoice.amount_paid_minor or 0,
            "balance_due_minor": invoice_balance_minor(invoice),
        }
    if attempt.status in {"succeeded", "reconciliation_required"}:
        return {
            "status": "success",
            "message": "Payment has already been recorded.",
            "invoice_status": invoice.status,
            "amount_paid_minor": invoice.amount_paid_minor or 0,
            "balance_due_minor": invoice_balance_minor(invoice),
        }
    return {
        "status": "processing",
        "message": "Payment is processing. The signed provider webhook will confirm the receipt.",
        "invoice_status": invoice.status,
        "amount_paid_minor": invoice.amount_paid_minor or 0,
        "balance_due_minor": invoice_balance_minor(invoice),
    }
