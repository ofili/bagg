"""Authoritative receipt reversal use cases."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.domains.audit.service import record_audit_event
from app.domains.invoices.models import Invoice
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    invoice_target_payable,
    record_receipt_reversal_created,
    transition_document,
    transition_invoice_after_receipt_reversal,
)
from app.domains.receipts.models import Receipt, ReceiptReversal
from app.domains.reminders.service import resume_invoice_reminders


async def _find_idempotent_reversal(
    db: AsyncSession,
    workspace_id: str,
    idempotency_key: str,
) -> ReceiptReversal | None:
    result = await db.execute(
        select(ReceiptReversal).where(
            ReceiptReversal.workspace_id == workspace_id,
            ReceiptReversal.idempotency_key == idempotency_key,
        )
    )
    return result.scalar_one_or_none()


def _validate_idempotent_match(
    existing: ReceiptReversal,
    *,
    receipt_id: str,
    amount_minor: int,
    reversal_type: str,
) -> ReceiptReversal:
    if (
        existing.receipt_id != receipt_id
        or existing.amount_minor != amount_minor
        or existing.reversal_type != reversal_type
    ):
        raise ConflictException(
            "Idempotency key was already used for a different reversal."
        )
    return existing


async def _lock_invoice_and_receipt(
    db: AsyncSession,
    *,
    workspace_id: str,
    receipt_id: str,
) -> tuple[Invoice, Receipt]:
    """Acquire financial locks in the canonical invoice → receipt order."""

    invoice_id = (
        await db.execute(
            select(Receipt.invoice_id).where(
                Receipt.id == receipt_id,
                Receipt.workspace_id == workspace_id,
            )
        )
    ).scalar_one_or_none()

    if invoice_id is None:
        raise NotFoundException("Receipt not found.")

    invoice = (
        await db.execute(
            select(Invoice)
            .where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if invoice is None:
        raise NotFoundException("Invoice not found.")

    receipt = (
        await db.execute(
            select(Receipt)
            .where(
                Receipt.id == receipt_id,
                Receipt.workspace_id == workspace_id,
                Receipt.invoice_id == invoice.id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if receipt is None:
        raise NotFoundException("Receipt not found.")

    return invoice, receipt


async def _get_posted_reversal_total(
    db: AsyncSession,
    receipt_id: str,
    *,
    exclude_reversal_id: str | None = None,
) -> int:
    stmt = select(func.coalesce(func.sum(ReceiptReversal.amount_minor), 0)).where(
        ReceiptReversal.receipt_id == receipt_id,
        ReceiptReversal.status == "posted",
    )

    if exclude_reversal_id:
        stmt = stmt.where(ReceiptReversal.id != exclude_reversal_id)

    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


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
    if len(reason) < 3:
        raise BadRequestException(
            "A reversal reason of at least three characters is required."
        )

    idempotency_key = (idempotency_key or "").strip()
    if not idempotency_key:
        raise BadRequestException("An idempotency key is required.")

    existing = await _find_idempotent_reversal(db, workspace_id, idempotency_key)
    if existing:
        return _validate_idempotent_match(
            existing,
            receipt_id=receipt_id,
            amount_minor=amount_minor,
            reversal_type=reversal_type,
        )

    invoice, receipt = await _lock_invoice_and_receipt(
        db,
        workspace_id=workspace_id,
        receipt_id=receipt_id,
    )

    # Recheck after acquiring the financial locks. This serialises retries
    # for the same receipt and prevents duplicate work after a concurrent
    # request has committed.
    existing = await _find_idempotent_reversal(db, workspace_id, idempotency_key)
    if existing:
        return _validate_idempotent_match(
            existing,
            receipt_id=receipt_id,
            amount_minor=amount_minor,
            reversal_type=reversal_type,
        )

    reversed_amount = await _get_posted_reversal_total(db, receipt.id)
    remaining_reversible = receipt.amount_paid_minor - reversed_amount

    before_audit_state = {
        "invoice_status": invoice.status,
        "invoice_amount_paid_minor": int(invoice.amount_paid_minor or 0),
    }

    if amount_minor > remaining_reversible:
        raise BadRequestException(
            "Reversal amount exceeds the remaining reversible receipt amount."
        )

    initial_status = "posted" if reversal_type == "correction" else "pending"

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
        posted_at=(datetime.now(timezone.utc) if initial_status == "posted" else None),
    )

    db.add(reversal)

    # Assign the generated reversal ID before it is used in lifecycle
    # metadata. SQLAlchemy column defaults are applied at flush time.
    await db.flush()

    record_receipt_reversal_created(
        db,
        reversal=reversal,
        actor_type="issuer",
        actor_id=actor_user_id,
        source="receipt_reversal_created",
        metadata={
            "invoice_id": invoice.id,
            "receipt_id": receipt.id,
            "amount_minor": reversal.amount_minor,
            "reversal_type": reversal.reversal_type,
            "reason": reversal.reason,
        },
    )

    if initial_status == "posted":
        await apply_posted_reversal(
            db,
            invoice=invoice,
            receipt=receipt,
            reversal=reversal,
            actor_user_id=actor_user_id,
        )

    await record_audit_event(
        db,
        workspace_id=workspace_id,
        actor_type="user",
        actor_id=actor_user_id,
        action="receipt_reversal.created",
        entity_type="receipt_reversal",
        entity_id=reversal.id,
        before_state=before_audit_state,
        after_state={
            "reversal_status": reversal.status,
            "reversal_type": reversal.reversal_type,
            "amount_minor": reversal.amount_minor,
            "invoice_status": invoice.status,
            "invoice_amount_paid_minor": int(invoice.amount_paid_minor or 0),
        },
        metadata={
            "invoice_id": invoice.id,
            "receipt_id": receipt.id,
        },
    )

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()

        # A concurrent request may have won the workspace/idempotency
        # unique constraint. Return its record only if the request matches.
        existing = await _find_idempotent_reversal(db, workspace_id, idempotency_key)
        if existing:
            return _validate_idempotent_match(
                existing,
                receipt_id=receipt_id,
                amount_minor=amount_minor,
                reversal_type=reversal_type,
            )

        raise ConflictException(
            "A conflicting reversal operation was committed. Retry with a new idempotency key."
        ) from e

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
    # Read identifiers without locking the reversal. The canonical lock
    # order is invoice → receipt → reversal.
    reversal_ref = (
        await db.execute(
            select(
                ReceiptReversal.invoice_id,
                ReceiptReversal.receipt_id,
            ).where(
                ReceiptReversal.id == reversal_id,
                ReceiptReversal.workspace_id == workspace_id,
            )
        )
    ).first()

    if reversal_ref is None:
        raise NotFoundException("Reversal not found.")

    invoice = (
        await db.execute(
            select(Invoice)
            .where(
                Invoice.id == reversal_ref.invoice_id,
                Invoice.workspace_id == workspace_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if invoice is None:
        raise NotFoundException("Invoice not found.")

    receipt = (
        await db.execute(
            select(Receipt)
            .where(
                Receipt.id == reversal_ref.receipt_id,
                Receipt.workspace_id == workspace_id,
                Receipt.invoice_id == invoice.id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if receipt is None:
        raise NotFoundException("Receipt not found.")

    reversal = (
        await db.execute(
            select(ReceiptReversal)
            .where(
                ReceiptReversal.id == reversal_id,
                ReceiptReversal.workspace_id == workspace_id,
                ReceiptReversal.invoice_id == invoice.id,
                ReceiptReversal.receipt_id == receipt.id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if reversal is None:
        raise NotFoundException("Reversal not found.")

    if reversal.status != "pending":
        raise ConflictException(
            f"Only pending reversals can be posted. Current status: {reversal.status}."
        )

    before_audit_state = {
        "reversal_status": reversal.status,
        "invoice_status": invoice.status,
        "invoice_amount_paid_minor": int(invoice.amount_paid_minor or 0),
    }

    reversal.reversed_by_user_id = actor_user_id

    confirmed_evidence = (
        evidence_reference or reversal.evidence_reference or ""
    ).strip()

    if reversal.reversal_type in {"refund", "chargeback"} and not confirmed_evidence:
        raise BadRequestException(
            "Evidence of the completed refund or chargeback is required before posting."
        )

    already_reversed = await _get_posted_reversal_total(
        db,
        receipt.id,
        exclude_reversal_id=reversal.id,
    )

    remaining_reversible = receipt.amount_paid_minor - already_reversed

    if reversal.amount_minor > remaining_reversible:
        raise BadRequestException(
            "Posting this reversal would exceed the remaining reversible receipt amount."
        )

    if confirmed_evidence:
        reversal.evidence_reference = confirmed_evidence

    reversal.posted_at = datetime.now(timezone.utc)

    transition_document(
        db,
        document=reversal,
        document_type="receipt_reversal",
        to_status="posted",
        actor_type="issuer",
        actor_id=actor_user_id,
        source="receipt_reversal_posted",
        metadata={
            "invoice_id": invoice.id,
            "receipt_id": receipt.id,
            "amount_minor": reversal.amount_minor,
            "reversal_type": reversal.reversal_type,
            "reason": reversal.reason,
            "evidence_reference": reversal.evidence_reference,
        },
    )

    await apply_posted_reversal(
        db,
        invoice=invoice,
        receipt=receipt,
        reversal=reversal,
        actor_user_id=actor_user_id,
    )

    await record_audit_event(
        db,
        workspace_id=workspace_id,
        actor_type="user",
        actor_id=actor_user_id,
        action="receipt_reversal.posted",
        entity_type="receipt_reversal",
        entity_id=reversal.id,
        before_state=before_audit_state,
        after_state={
            "reversal_status": reversal.status,
            "reversal_type": reversal.reversal_type,
            "amount_minor": reversal.amount_minor,
            "invoice_status": invoice.status,
            "invoice_amount_paid_minor": int(invoice.amount_paid_minor or 0),
        },
        metadata={
            "invoice_id": invoice.id,
            "receipt_id": receipt.id,
            "has_evidence_reference": bool(reversal.evidence_reference),
        },
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

    if reversal.amount_minor > receipt.amount_paid_minor:
        raise BadRequestException("Reversal exceeds the original receipt amount.")

    invoice.amount_paid_minor = old_paid - reversal.amount_minor

    if invoice.amount_paid_minor < invoice_target_payable(invoice):
        invoice.paid_at = None
        from app.domains.expenses.repository import ExpenseRepository
        await ExpenseRepository(db).mark_unreimbursed_by_invoice_id(invoice.id)

    await transition_invoice_after_receipt_reversal(
        db,
        invoice=invoice,
        receipt=receipt,
        reversal=reversal,
        actor_user_id=actor_user_id,
    )

    await db.flush()

    # A fully paid invoice has had its reminder jobs cancelled.
    # If a reversal makes it outstanding again, begin a future-only cycle.
    if old_status == "paid" and invoice.status in {
        "sent",
        "viewed",
        "partially_paid",
    }:
        await resume_invoice_reminders(
            invoice,
            db,
            commit=False,
        )
