import logging
from datetime import datetime, date, timezone

logger = logging.getLogger(__name__)
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.errors import BadRequestException
from app.core.money import format_money
from app.core.security import generate_share_token
from app.domains.workspaces.models import Workspace
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    invoice_target_payable,
    record_status_event,
)


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
) -> Receipt:

    """
    Single authoritative writer for confirmed payments.

    Lock and refresh the invoice before evaluating its balance. This ensures
    concurrent payment confirmations serialize against the same financial
    state on databases that support row-level locking.
    """

    locked_invoice = (
        await db.execute(
            select(Invoice)
            .where(
                and_(
                    Invoice.id == invoice.id,
                    Invoice.workspace_id == workspace.id,
                )
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if locked_invoice is None:
        raise BadRequestException("Invoice no longer exists")

    invoice = locked_invoice

    locked_workspace = (
        await db.execute(
            select(Workspace)
            .where(Workspace.id == workspace.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if locked_workspace is None:
        raise BadRequestException("Workspace no longer exists")

    workspace = locked_workspace

    if amount_paid_minor <= 0:
        raise BadRequestException("Confirmed payment amount must be greater than zero")

    if invoice.status == "cancelled":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is cancelled "
            "and cannot receive payment"
        )

    if provider_reference:
        existing_stmt = select(Receipt).where(
            and_(
                Receipt.workspace_id == workspace.id,
                Receipt.provider_reference == provider_reference,
            )
        )
        existing = (await db.execute(existing_stmt)).scalars().first()

        if existing:
            if existing.invoice_id != invoice.id:
                raise BadRequestException(
                    f"Provider reference '{provider_reference}' "
                    "is already linked to another invoice"
                )
            return existing

    balance_before = invoice_balance_minor(invoice)
    if balance_before <= 0:
        raise BadRequestException(f"Invoice '{invoice.invoice_number}' is already fully paid")

    if amount_paid_minor > balance_before:
        raise BadRequestException(
            f"Confirmed amount {format_money(amount_paid_minor, invoice.currency)} exceeds "
            f"the outstanding balance {format_money(balance_before, invoice.currency)}"
        )

    old_status = invoice.status
    seq = workspace.next_receipt_number
    receipt_number = f"{workspace.receipt_prefix}{seq:04d}"
    workspace.next_receipt_number = seq + 1

    invoice.amount_paid_minor = (invoice.amount_paid_minor or 0) + amount_paid_minor
    balance_remaining_minor = invoice_balance_minor(invoice)
    now = datetime.now(timezone.utc)

    if invoice.amount_paid_minor >= invoice_target_payable(invoice):
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
        balance_remaining_minor=balance_remaining_minor,
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
    db.add(receipt)

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status=invoice.status,
        actor_type="issuer" if confirmation_source.startswith("issuer") else "webhook",
        actor_id=confirmed_by_user_id,
        source=confirmation_source,
        metadata={
            "receipt_number": receipt_number,
            "amount_paid_minor": amount_paid_minor,
            "payment_method": payment_method,
            "reference": reference,
        },
    )

    if invoice.status == "paid":
        await cancel_invoice_reminders(invoice.id, db, commit=False)

    # Dispatch in-app notification when client pays or payment is confirmed
    if workspace.owner_id and confirmed_by_user_id != workspace.owner_id:
        try:
            from app.domains.notifications.service import NotificationService
            formatted_amt = format_money(amount_paid_minor, invoice.currency)
            is_full = invoice.status == "paid"
            title = (
                f"Invoice {invoice.invoice_number} is fully paid!"
                if is_full
                else f"Payment received for invoice {invoice.invoice_number}"
            )
            body = (
                f"Payment of {formatted_amt} received ({receipt.receipt_number})."
                if is_full
                else f"Partial payment of {formatted_amt} received ({receipt.receipt_number}). Balance remaining: {format_money(balance_remaining_minor, invoice.currency)}."
            )
            await NotificationService.create_notification(
                db,
                workspace_id=workspace.id,
                recipient_user_id=workspace.owner_id,
                type="invoice_paid" if is_full else "payment_received",
                title=title,
                body=body,
                document_type="invoice",
                document_id=invoice.id,
                document_number=invoice.invoice_number,
                link_url=f"/invoices/{invoice.id}",
            )
        except Exception as e:
            logger.warning(f"Failed to create payment notification: {e}")

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
    """Backward-compatible wrapper around the confirmation gate."""
    return await confirm_payment(
        db=db,
        workspace=workspace,
        invoice=invoice,
        amount_paid_minor=amount_paid_minor,
        payment_method=payment_method,
        reference=reference,
        payer_name=payer_name,
        payment_date=payment_date,
        payment_claim_id=payment_claim_id,
        notes=notes,
        confirmation_source=confirmation_source,
        confirmed_by_user_id=confirmed_by_user_id,
        provider=provider,
        provider_reference=provider_reference,
    )
