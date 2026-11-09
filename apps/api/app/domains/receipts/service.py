"""Authoritative payment-confirmation use case.

A confirmed payment, invoice balance/status update, receipt, lifecycle event and
payment-attempt hand-off are committed by the caller in one DB transaction.
"""

from __future__ import annotations
import logging
from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import BadRequestException
from app.core.money import format_money
from app.core.security import generate_share_token
from app.domains.workspaces.models import Workspace
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.receipts.repository import ReceiptRepository
from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    invoice_target_payable,
    record_status_event,
)

logger = logging.getLogger(__name__)


async def confirm_payment(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    amount_paid_minor: int,
    payment_method: str = "bank_transfer",
    reference: Optional[str] = None,
    payer_name: Optional[str] = None,
    payment_date: Optional[date] = None,
    payment_claim_id: Optional[str] = None,
    notes: Optional[str] = None,
    confirmation_source: str = "issuer_manual",
    confirmed_by_user_id: Optional[str] = None,
    provider: Optional[str] = None,
    provider_reference: Optional[str] = None,
    late_payment: bool = False,
) -> Receipt:
    repo = ReceiptRepository(db)
    locked_invoice = await repo.lock_invoice(workspace.id, invoice.id)
    if locked_invoice is None:
        raise BadRequestException("Invoice no longer exists.")
    invoice = locked_invoice
    locked_workspace = await repo.lock_workspace(workspace.id)
    if locked_workspace is None:
        raise BadRequestException("Workspace no longer exists.")
    workspace = locked_workspace
    if amount_paid_minor <= 0:
        raise BadRequestException("Confirmed payment amount must be greater than zero.")
    if late_payment and confirmation_source != "webhook_paystack_late":
        raise BadRequestException(
            "Late-payment reconciliation is reserved for verified Paystack webhooks."
        )
    if invoice.status == "draft" and not late_payment:
        raise BadRequestException("A draft invoice cannot receive a confirmed payment.")
    if invoice.status in {"cancelled", "void"} and not late_payment:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is discontinued and cannot receive a new payment."
        )
    if provider_reference:
        existing = await repo.find_provider_receipt(workspace.id, provider_reference)
        if existing:
            if existing.invoice_id != invoice.id:
                raise BadRequestException(
                    "Provider reference is already linked to another invoice."
                )
            if (
                existing.amount_paid_minor != amount_paid_minor
                or existing.currency.upper() != invoice.currency.upper()
            ):
                raise BadRequestException(
                    "Provider transaction conflicts with the existing receipt amount or currency."
                )
            return existing
    balance_before = invoice_balance_minor(invoice)
    if balance_before <= 0 and not late_payment:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is already fully paid."
        )
    if amount_paid_minor > balance_before and not late_payment:
        raise BadRequestException(
            f"Confirmed amount {format_money(amount_paid_minor, invoice.currency)} exceeds the outstanding balance {format_money(balance_before, invoice.currency)}."
        )
    remaining = max(0, balance_before - amount_paid_minor)
    old_status = invoice.status
    seq = workspace.next_receipt_number
    receipt_number = f"{workspace.receipt_prefix}{seq:04d}"
    workspace.next_receipt_number = seq + 1
    invoice.amount_paid_minor = (invoice.amount_paid_minor or 0) + amount_paid_minor
    now = datetime.now(timezone.utc)
    if late_payment:
        invoice.reconciliation_required = True
    elif invoice.amount_paid_minor >= invoice_target_payable(invoice):
        invoice.status = "paid"
        invoice.paid_at = now
    else:
        invoice.status = "partially_paid"
    invoice.payment_processing_at = None
    invoice.payment_processing_reference = None
    raw_token, token_hash = generate_share_token()
    receipt = Receipt(
        workspace_id=workspace.id,
        client_id=invoice.client_id,
        invoice_id=invoice.id,
        payment_claim_id=payment_claim_id,
        receipt_number=receipt_number,
        sequence_number=seq,
        currency=invoice.currency,
        amount_paid_minor=amount_paid_minor,
        balance_remaining_minor=remaining,
        payment_date=payment_date or date.today(),
        payment_method=payment_method,
        reference=reference,
        payer_name=payer_name or (invoice.client.name if invoice.client else None),
        notes=notes,
        is_verified=True,
        verified_at=now,
        confirmation_source=confirmation_source,
        confirmed_by_user_id=confirmed_by_user_id,
        provider=provider,
        provider_reference=provider_reference,
        share_token=raw_token,
        share_token_hash=token_hash,
    )
    repo.add(receipt)
    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status=invoice.status,
        actor_type="webhook" if confirmation_source.startswith("webhook") else "issuer",
        actor_id=confirmed_by_user_id,
        source=confirmation_source,
        metadata={
            "receipt_number": receipt_number,
            "amount_paid_minor": amount_paid_minor,
            "payment_method": payment_method,
            "reference": reference,
            "late_payment": late_payment,
            "reconciliation_required": late_payment,
        },
    )
    if invoice.status == "paid" and not late_payment:
        await cancel_invoice_reminders(invoice.id, db, commit=False)
    # Notification creation is an internal DB hand-off. Failure must not hide a
    # successfully confirmed payment; the durable receipt remains authoritative.
    if workspace.owner_id and confirmed_by_user_id != workspace.owner_id:
        try:
            from app.domains.notifications.service import NotificationService

            formatted = format_money(amount_paid_minor, invoice.currency)
            late_title = f"Late payment received for invoice {invoice.invoice_number}"
            title = (
                late_title
                if late_payment
                else (
                    f"Invoice {invoice.invoice_number} is fully paid!"
                    if invoice.status == "paid"
                    else f"Payment received for invoice {invoice.invoice_number}"
                )
            )
            body = (
                f"Paystack confirmed {formatted} ({receipt.receipt_number}). This payment arrived after checkout invalidation and requires reconciliation."
                if late_payment
                else f"Payment of {formatted} received ({receipt.receipt_number})."
            )
            await NotificationService.create_notification(
                db,
                workspace_id=workspace.id,
                recipient_user_id=workspace.owner_id,
                type=(
                    "payment_reconciliation_required"
                    if late_payment
                    else (
                        "invoice_paid"
                        if invoice.status == "paid"
                        else "payment_received"
                    )
                ),
                title=title,
                body=body,
                document_type="invoice",
                document_id=invoice.id,
                document_number=invoice.invoice_number,
                link_url=f"/invoices/{invoice.id}",
                commit=False,
            )
        except Exception:
            logger.exception(
                "Payment notification creation failed for receipt %s", receipt.id
            )
    await repo.flush()
    return receipt


async def create_receipt(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    amount_paid_minor: int,
    payment_method: str = "bank_transfer",
    reference: Optional[str] = None,
    payer_name: Optional[str] = None,
    payment_date: Optional[date] = None,
    payment_claim_id: Optional[str] = None,
    notes: Optional[str] = None,
    confirmation_source: str = "issuer_manual",
    confirmed_by_user_id: Optional[str] = None,
    provider: Optional[str] = None,
    provider_reference: Optional[str] = None,
) -> Receipt:
    """Compatibility wrapper; all callers use the authoritative confirmation gate."""
    return await confirm_payment(
        db,
        workspace,
        invoice,
        amount_paid_minor,
        payment_method,
        reference,
        payer_name,
        payment_date,
        payment_claim_id,
        notes,
        confirmation_source,
        confirmed_by_user_id,
        provider,
        provider_reference,
    )


async def record_manual_payment(
    db: AsyncSession, workspace: Workspace, invoice: Invoice, **payment_data
) -> Receipt:
    """Complete the issuer-facing manual payment use case and own its commit."""
    receipt = await confirm_payment(
        db=db,
        workspace=workspace,
        invoice=invoice,
        confirmation_source="issuer_manual",
        provider="manual",
        **payment_data,
    )
    await db.commit()
    await db.refresh(receipt)
    return receipt
