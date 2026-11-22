
from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException, NotFoundException
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt, ReceiptReversal
from app.domains.lifecycle.service import (
    invoice_target_payable,
    record_status_event,
)


async def create_reversal(
    db: AsyncSession,
    *,
    workspace_id: str,
    receipt_id: str,
    amount_minor: int,
    reversal_type: str,
    reason: str,
    idempotency_key: str,
    actor_user_id: str,
    evidence_reference: str | None = None,
) -> ReceiptReversal:
    if amount_minor <= 0:
        raise BadRequestException("Reversal amount must be greater than zero.")

    if reversal_type not in {"correction", "refund", "chargeback"}:
        raise BadRequestException("Invalid reversal type.")

    reason = (reason or "").strip()
    if not reason:
        raise BadRequestException("A reversal reason is required.")

    idempotency_key = (idempotency_key or "").strip()
    if not idempotency_key:
        raise BadRequestException("An idempotency key is required.")

    existing = (
        await db.execute(
            select(ReceiptReversal).where(
                ReceiptReversal.workspace_id == workspace_id,
                ReceiptReversal.idempotency_key == idempotency_key,
            )
        )
    ).scalar_one_or_none()

    if existing:
        if existing.receipt_id != receipt_id or existing.amount_minor != amount_minor:
            raise BadRequestException(
                "Idempotency key was already used for a different reversal."
            )
        return existing

    # Lock the invoice first, then the receipt. All reversal operations use
    # this same lock order to serialize concurrent reversals.
    invoice = (
        await db.execute(
            select(Invoice)
            .where(
                Invoice.id == (
                    select(Receipt.invoice_id).where(
                        Receipt.id == receipt_id,
                        Receipt.workspace_id == workspace_id,
                    ).scalar_subquery()
                ),
                Invoice.workspace_id == workspace_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    if invoice is None:
        raise NotFoundException("Receipt not found.")

    receipt = (
        await db.execute(
            select(Receipt)
            .where(
                Receipt.id == receipt_id,
                Receipt.workspace_id == workspace_id,
                Receipt.invoice_id == invoice.id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    if receipt is None:
        raise NotFoundException("Receipt not found.")

    reversed_amount = (
        await db.execute(
            select(func.coalesce(func.sum(ReceiptReversal.amount_minor), 0))
            .where(
                ReceiptReversal.receipt_id == receipt.id,
                ReceiptReversal.status == "posted",
            )
        )
    ).scalar_one()

    remaining_reversible = receipt.amount_paid_minor - int(reversed_amount or 0)

    if amount_minor > remaining_reversible:
        raise BadRequestException(
            "Reversal amount exceeds the remaining reversible receipt amount."
        )

    # A correction is an accounting adjustment. Refunds and chargebacks
    # remain pending until their external financial event is confirmed.
    initial_status = (
        "posted" if reversal_type == "correction" else "pending"
    )

    reversal = ReceiptReversal(
        receipt_id=receipt.id,
        workspace_id=workspace_id,
        invoice_id=invoice.id,
        amount_minor=amount_minor,
        reversal_type=reversal_type,
        status=initial_status,
        reason=reason,
        idempotency_key=idempotency_key,
        reversed_by_user_id=actor_user_id,
        evidence_reference=evidence_reference,
        posted_at=(
            datetime.now(timezone.utc)
            if initial_status == "posted"
            else None
        ),
    )

    db.add(reversal)

    if initial_status == "posted":
        await apply_posted_reversal(
            db,
            invoice=invoice,
            receipt=receipt,
            reversal=reversal,
            actor_user_id=actor_user_id,
        )

    await db.commit()
    await db.refresh(reversal)
    return reversal


async def post_pending_reversal(
    db: AsyncSession,
    *,
    workspace_id: str,
    reversal_id: str,
    actor_user_id: str,
    evidence_reference: str | None = None,
) -> ReceiptReversal:
    reversal = (
        await db.execute(
            select(ReceiptReversal)
            .where(
                ReceiptReversal.id == reversal_id,
                ReceiptReversal.workspace_id == workspace_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    if reversal is None:
        raise NotFoundException("Reversal not found.")

    if reversal.status != "pending":
        raise BadRequestException(
            f"Only pending reversals can be posted. Current status: {reversal.status}."
        )

    invoice = (
        await db.execute(
            select(Invoice)
            .where(
                Invoice.id == reversal.invoice_id,
                Invoice.workspace_id == workspace_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    if invoice is None:
        raise NotFoundException("Invoice not found.")

    receipt = (
        await db.execute(
            select(Receipt)
            .where(
                Receipt.id == reversal.receipt_id,
                Receipt.workspace_id == workspace_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    if receipt is None:
        raise NotFoundException("Receipt not found.")

    already_reversed = (
        await db.execute(
            select(func.coalesce(func.sum(ReceiptReversal.amount_minor), 0))
            .where(
                ReceiptReversal.receipt_id == receipt.id,
                ReceiptReversal.status == "posted",
                ReceiptReversal.id != reversal.id,
            )
        )
    ).scalar_one()

    if reversal.amount_minor > (
        receipt.amount_paid_minor - int(already_reversed or 0)
    ):
        raise BadRequestException(
            "Posting this reversal would exceed the remaining reversible amount."
        )

    reversal.status = "posted"
    reversal.posted_at = datetime.now(timezone.utc)
    reversal.evidence_reference = (
        evidence_reference or reversal.evidence_reference
    )

    await apply_posted_reversal(
        db,
        invoice=invoice,
        receipt=receipt,
        reversal=reversal,
        actor_user_id=actor_user_id,
    )

    await db.commit()
    await db.refresh(reversal)
    return reversal


async def apply_posted_reversal(
    db: AsyncSession,
    *,
    invoice: Invoice,
    receipt: Receipt,
    reversal: ReceiptReversal,
    actor_user_id: str,
) -> None:
    old_status = invoice.status
    old_paid = int(invoice.amount_paid_minor or 0)

    if reversal.amount_minor > old_paid:
        raise BadRequestException(
            "Reversal exceeds the invoice's currently recorded paid amount."
        )

    invoice.amount_paid_minor = old_paid - reversal.amount_minor

    if invoice.status in {"cancelled", "void", "voided"}:
        # Preserve discontinued invoice state. The financial adjustment is
        # still recorded, but it must not reopen the invoice.
        new_status = invoice.status
    elif invoice.amount_paid_minor >= invoice_target_payable(invoice):
        new_status = "paid"
    elif invoice.amount_paid_minor > 0:
        new_status = "partially_paid"
    elif invoice.viewed_at:
        new_status = "viewed"
    elif invoice.sent_at:
        new_status = "sent"
    else:
        new_status = "issued"

    invoice.status = new_status

    if new_status != "paid":
        invoice.paid_at = None

    record_status_event(
        db=db,
        workspace_id=invoice.workspace_id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status=new_status,
        actor_type="issuer",
        actor_id=actor_user_id,
        source="receipt_reversal_posted",
        metadata={
            "receipt_id": receipt.id,
            "receipt_number": receipt.receipt_number,
            "reversal_id": reversal.id,
            "reversal_type": reversal.reversal_type,
            "reversal_amount_minor": reversal.amount_minor,
            "new_amount_paid_minor": invoice.amount_paid_minor,
            "reason": reversal.reason,
        },
    )

    await db.flush()
