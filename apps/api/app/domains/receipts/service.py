"""Authoritative payment-confirmation use case.

A confirmed payment, invoice balance/status update, receipt, and lifecycle event
are committed by the caller in one DB transaction.
"""

from __future__ import annotations

from dataclasses import dataclass
import logging
from datetime import date, datetime, timezone
from typing import NamedTuple, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException
from app.core.dates import business_today
from app.core.money import format_money
from app.core.security import generate_share_token
from app.domains.sharing.secrets import store_share_token
from app.domains.activation.service import record_payment_confirmed
from app.domains.audit.service import record_audit_event
from app.domains.documents.builders.receipts import build_receipt_document
from app.domains.documents.generation import enqueue_document_generation
from app.domains.workspaces.models import Workspace
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.receipts.repository import ReceiptRepository
from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    invoice_target_payable,
    record_status_event,
    transition_document,
)

logger = logging.getLogger(__name__)

LATE_PAYMENT_SOURCE = "webhook_paystack_late"


def classify_payment_evidence(
    confirmation_source: str,
    payment_method: str,
) -> str:
    source = (confirmation_source or "").strip().lower()
    method = (payment_method or "").strip().lower()

    if source.startswith("webhook_paystack"):
        return "provider_verified"

    if method == "cash":
        return "cash_attested"

    if source.startswith("issuer"):
        return "issuer_attested"

    return "legacy_unclassified"


@dataclass(frozen=True)
class _Payment:
    """The facts about one payment being confirmed."""

    amount_minor: int
    method: str
    reference: Optional[str]
    payer_name: Optional[str]
    payment_date: Optional[date]
    claim_id: Optional[str]
    notes: Optional[str]
    source: str
    confirmed_by_user_id: Optional[str]
    provider: Optional[str]
    provider_reference: Optional[str]
    late: bool


class _NotificationContent(NamedTuple):
    type: str
    title: str
    body: str


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------


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
    pay = _Payment(
        amount_minor=amount_paid_minor,
        method=payment_method,
        reference=reference,
        payer_name=payer_name,
        payment_date=payment_date,
        claim_id=payment_claim_id,
        notes=notes,
        source=confirmation_source,
        confirmed_by_user_id=confirmed_by_user_id,
        provider=provider,
        provider_reference=provider_reference,
        late=late_payment,
    )

    repo = ReceiptRepository(db)
    invoice, workspace = await _lock_invoice_and_workspace(repo, workspace, invoice)

    _validate_payment(invoice, pay)

    duplicate = await _find_duplicate_receipt(repo, workspace, invoice, pay)
    if duplicate is not None:
        return duplicate

    balance_before = _outstanding_balance(invoice, pay)
    old_status = invoice.status
    old_amount_paid_minor = int(invoice.amount_paid_minor or 0)
    now = datetime.now(timezone.utc)

    sequence, receipt_number = _allocate_receipt_number(workspace)
    new_status = _apply_payment_to_invoice(invoice, pay, now)

    receipt = _build_receipt(
        workspace=workspace,
        invoice=invoice,
        pay=pay,
        sequence=sequence,
        receipt_number=receipt_number,
        balance_remaining_minor=max(0, balance_before - pay.amount_minor),
        now=now,
    )
    await repo.add(receipt)

    _record_status_change(
        db,
        workspace,
        invoice,
        receipt,
        pay,
        old_status,
        new_status,
    )

    if invoice.status == "paid":
        if not pay.late:
            await cancel_invoice_reminders(invoice.id, db, commit=False)
        from app.domains.expenses.repository import ExpenseRepository
        await ExpenseRepository(db).mark_reimbursed_by_invoice_id(invoice.id, now)

    await _notify_owner(db, workspace, invoice, receipt, pay)
    await repo.flush()

    await store_share_token(
        db,
        document_type="receipt",
        document_id=receipt.id,
        token=receipt.share_token,
        expected_hash=receipt.share_token_hash,
    )

    await _enqueue_receipt_document(db, workspace, invoice, receipt)
    
    await record_payment_confirmed(
        db,
        workspace,
        invoice_id=invoice.id,
        receipt_id=receipt.id,
        amount_minor=pay.amount_minor,
        currency=invoice.currency,
    )

    actor_type = (
        "webhook"
        if pay.source.startswith("webhook")
        else "user"
        if pay.confirmed_by_user_id
        else "system"
    )

    await record_audit_event(
        db,
        workspace_id=workspace.id,
        actor_type=actor_type,
        actor_id=(
            pay.confirmed_by_user_id
            if actor_type == "user"
            else pay.provider
            if actor_type == "webhook"
            else None
        ),
        action="payment.confirmed",
        entity_type="receipt",
        entity_id=receipt.id,
        before_state={
            "invoice_status": old_status,
            "invoice_amount_paid_minor": old_amount_paid_minor,
        },
        after_state={
            "invoice_status": invoice.status,
            "invoice_amount_paid_minor": int(invoice.amount_paid_minor or 0),
            "amount_paid_minor": pay.amount_minor,
            "currency": invoice.currency,
            "payment_method": pay.method,
            "evidence_classification": receipt.evidence_classification,
            "receipt_number": receipt.receipt_number,
            "reconciliation_required": bool(invoice.reconciliation_required),
        },
        metadata={
            "invoice_id": invoice.id,
            "payment_claim_id": pay.claim_id,
            "confirmation_source": pay.source,
            "provider": pay.provider,
            "late_payment": pay.late,
        },
    )

    return receipt


# --------------------------------------------------------------------------
# Locking and validation
# --------------------------------------------------------------------------


async def _lock_invoice_and_workspace(
    repo: ReceiptRepository,
    workspace: Workspace,
    invoice: Invoice,
) -> tuple[Invoice, Workspace]:
    locked_invoice = await repo.lock_invoice(workspace.id, invoice.id)
    if locked_invoice is None:
        raise BadRequestException("Invoice no longer exists.")

    locked_workspace = await repo.lock_workspace(workspace.id)
    if locked_workspace is None:
        raise BadRequestException("Workspace no longer exists.")

    return locked_invoice, locked_workspace


def _validate_payment(invoice: Invoice, pay: _Payment) -> None:
    """Checks that do not depend on the invoice balance."""
    if pay.amount_minor <= 0:
        raise BadRequestException("Confirmed payment amount must be greater than zero.")

    if pay.late and pay.source != LATE_PAYMENT_SOURCE:
        raise BadRequestException(
            "Late-payment reconciliation is reserved for verified Paystack webhooks."
        )

    if pay.late:
        return  # Late payments may land on draft, cancelled or void invoices.

    if invoice.status == "draft":
        raise BadRequestException("A draft invoice cannot receive a confirmed payment.")

    if invoice.status in {"cancelled", "void"}:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is discontinued and cannot receive a new payment."
        )


async def _find_duplicate_receipt(
    repo: ReceiptRepository,
    workspace: Workspace,
    invoice: Invoice,
    pay: _Payment,
) -> Optional[Receipt]:
    """Idempotency: a repeated provider reference returns the original receipt."""
    if not pay.provider_reference:
        return None

    existing = await repo.find_provider_receipt(workspace.id, pay.provider_reference)
    if existing is None:
        return None

    if existing.invoice_id != invoice.id:
        raise BadRequestException(
            "Provider reference is already linked to another invoice."
        )

    amount_differs = existing.amount_paid_minor != pay.amount_minor
    currency_differs = existing.currency.upper() != invoice.currency.upper()
    if amount_differs or currency_differs:
        raise BadRequestException(
            "Provider transaction conflicts with the existing receipt amount or currency."
        )

    return existing


def _outstanding_balance(invoice: Invoice, pay: _Payment) -> int:
    """Returns the balance before this payment; rejects over and re-payment."""
    balance = invoice_balance_minor(invoice)
    if pay.late:
        return balance

    if balance <= 0:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is already fully paid."
        )

    if pay.amount_minor > balance:
        raise BadRequestException(
            f"Confirmed amount {format_money(pay.amount_minor, invoice.currency)} "
            f"exceeds the outstanding balance {format_money(balance, invoice.currency)}."
        )

    return balance


# --------------------------------------------------------------------------
# State changes
# --------------------------------------------------------------------------


def _allocate_receipt_number(workspace: Workspace) -> tuple[int, str]:
    sequence = workspace.next_receipt_number
    workspace.next_receipt_number = sequence + 1
    return sequence, f"{workspace.receipt_prefix}{sequence:04d}"


def _apply_payment_to_invoice(
    invoice: Invoice,
    pay: _Payment,
    now: datetime,
) -> str:
    """
    Apply payment aggregates and return the target lifecycle status.

    The canonical lifecycle service owns the actual status mutation.
    Late-payment reconciliation deliberately preserves the existing status.
    """
    invoice.amount_paid_minor = (invoice.amount_paid_minor or 0) + pay.amount_minor

    if pay.late:
        invoice.reconciliation_required = True
        new_status = invoice.status
    elif invoice.amount_paid_minor >= invoice_target_payable(invoice):
        invoice.paid_at = now
        new_status = "paid"
    else:
        new_status = "partially_paid"

    invoice.payment_processing_at = None
    invoice.payment_processing_reference = None

    return new_status


def _build_receipt(
    *,
    workspace: Workspace,
    invoice: Invoice,
    pay: _Payment,
    sequence: int,
    receipt_number: str,
    balance_remaining_minor: int,
    now: datetime,
) -> Receipt:
    raw_token, token_hash = generate_share_token()
    client_name = invoice.client.name if invoice.client else None

    return Receipt(
        workspace_id=workspace.id,
        client_id=invoice.client_id,
        invoice_id=invoice.id,
        payment_claim_id=pay.claim_id,
        receipt_number=receipt_number,
        sequence_number=sequence,
        currency=invoice.currency,
        amount_paid_minor=pay.amount_minor,
        balance_remaining_minor=balance_remaining_minor,
        payment_date=pay.payment_date or business_today(workspace.timezone),
        payment_method=pay.method,
        reference=pay.reference,
        payer_name=pay.payer_name or client_name,
        notes=pay.notes,
        is_verified=True,
        verified_at=now,
        confirmation_source=pay.source,
        confirmed_by_user_id=pay.confirmed_by_user_id,
        provider=pay.provider,
        provider_reference=pay.provider_reference,
        share_token=raw_token,
        share_token_hash=token_hash,
        evidence_classification=classify_payment_evidence(pay.source, pay.method),
    )


def _record_status_change(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    receipt: Receipt,
    pay: _Payment,
    old_status: str,
    new_status: str,
) -> None:
    from_webhook = pay.source.startswith("webhook")

    metadata = {
        "receipt_number": receipt.receipt_number,
        "amount_paid_minor": pay.amount_minor,
        "payment_method": pay.method,
        "reference": pay.reference,
        "late_payment": pay.late,
        "reconciliation_required": pay.late,
    }

    if old_status != new_status:
        transition_document(
            db,
            document=invoice,
            document_type="invoice",
            to_status=new_status,
            actor_type="webhook" if from_webhook else "issuer",
            actor_id=pay.confirmed_by_user_id,
            source=pay.source,
            metadata=metadata,
        )
    else:
        # Late-payment reconciliation can add financial evidence without
        # changing the invoice's existing lifecycle status.
        record_status_event(
            db=db,
            workspace_id=workspace.id,
            document_type="invoice",
            document_id=invoice.id,
            from_status=old_status,
            to_status=new_status,
            actor_type="webhook" if from_webhook else "issuer",
            actor_id=pay.confirmed_by_user_id,
            source=pay.source,
            metadata=metadata,
        )


# --------------------------------------------------------------------------
# Side effects
# --------------------------------------------------------------------------


def _payment_notification_content(
    invoice: Invoice,
    receipt: Receipt,
    pay: _Payment,
) -> _NotificationContent:
    """Pure function: easy to unit test without a database."""
    number = invoice.invoice_number
    formatted = format_money(pay.amount_minor, invoice.currency)

    if pay.late:
        return _NotificationContent(
            type="payment_reconciliation_required",
            title=f"Late payment received for invoice {number}",
            body=(
                f"Paystack confirmed {formatted} ({receipt.receipt_number}). "
                "This payment arrived after checkout invalidation and requires reconciliation."
            ),
        )

    body = f"Payment of {formatted} received ({receipt.receipt_number})."
    if invoice.status == "paid":
        return _NotificationContent(
            type="invoice_paid",
            title=f"Invoice {number} is fully paid!",
            body=body,
        )

    return _NotificationContent(
        type="payment_received",
        title=f"Payment received for invoice {number}",
        body=body,
    )


async def _notify_owner(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    receipt: Receipt,
    pay: _Payment,
) -> None:
    """Best effort. A failed notification must not hide a confirmed payment;
    the durable receipt remains authoritative."""
    if not workspace.owner_id or pay.confirmed_by_user_id == workspace.owner_id:
        return

    try:
        async with db.begin_nested():
            from app.domains.notifications.service import NotificationService

            content = _payment_notification_content(invoice, receipt, pay)
            await NotificationService.create_notification(
                db,
                workspace_id=workspace.id,
                recipient_user_id=workspace.owner_id,
                type=content.type,
                title=content.title,
                body=content.body,
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


async def _enqueue_receipt_document(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    receipt: Receipt,
) -> None:
    client = invoice.client
    document = build_receipt_document(
        receipt,
        business_name=workspace.business_name,
        client_name=client.name if client else receipt.payer_name,
        invoice_number=invoice.invoice_number,
        business_address=workspace.address,
        business_tax_id=workspace.tax_id,
        business_logo_url=workspace.logo_url,
        payer_email=client.email if client else None,
        payer_address=client.address if client else None,
    )
    await enqueue_document_generation(db, document, issuance_generation=1)


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
