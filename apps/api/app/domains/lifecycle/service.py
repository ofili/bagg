from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException
from app.domains.lifecycle.models import DocumentStatusEvent

PAYMENT_CLAIM_STATUSES: frozenset[str] = frozenset(
    {
        "pending",
        "confirmed",
        "rejected",
    }
)

PAYMENT_CLAIM_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "rejected"},
    "confirmed": set(),
    "rejected": set(),
}

INVOICE_STATUSES: frozenset[str] = frozenset(
    {
        "draft",
        "issued",
        "sent",
        "viewed",
        "payment_claimed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    }
)

QUOTE_STATUSES: frozenset[str] = frozenset(
    {
        "draft",
        "issued",
        "sent",
        "viewed",
        "review_requested",
        "accepted",
        "declined",
        "converted",
        "cancelled",
    }
)

DOCUMENT_STATUSES: dict[str, frozenset[str]] = {
    "invoice": INVOICE_STATUSES,
    "quote": QUOTE_STATUSES,
    "payment_claim": PAYMENT_CLAIM_STATUSES,
}

# Compatibility for historical invoice records.
# New writes always use the canonical value "voided".
STATUS_ALIASES = {
    "invoice": {
        "void": "voided",
    },
    "quote": {},
    "payment_claim": {},
}


INVOICE_TRANSITIONS = {
    "draft": {"issued", "cancelled", "voided"},
    "issued": {
        "draft",
        "sent",
        "viewed",
        "payment_claimed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    },
    "sent": {
        "draft",
        "viewed",
        "payment_claimed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    },
    "viewed": {
        "draft",
        "payment_claimed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    },
    "payment_claimed": {
        "issued",
        "sent",
        "viewed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    },
    "partially_paid": {
        "issued",
        "sent",
        "viewed",
        "payment_claimed",
        "paid",
    },
    # Paid invoices are terminal through the generic lifecycle service.
    # The dedicated receipt-reversal operation is the only permitted
    # path for reopening an invoice after a posted reversal.
    "paid": set(),
    "cancelled": set(),
    "voided": set(),
}


QUOTE_TRANSITIONS = {
    "draft": {"issued", "cancelled"},
    "issued": {
        "draft",
        "sent",
        "viewed",
        "accepted",
        "declined",
        "review_requested",
        "cancelled",
    },
    "sent": {
        "draft",
        "viewed",
        "accepted",
        "declined",
        "review_requested",
        "cancelled",
    },
    "viewed": {
        "draft",
        "review_requested",
        "accepted",
        "declined",
        "cancelled",
    },
    "review_requested": {"draft", "declined", "cancelled"},
    "accepted": {"converted"},
    "declined": set(),
    "converted": set(),
    "cancelled": set(),
}

DOCUMENT_TRANSITIONS = {
    "invoice": INVOICE_TRANSITIONS,
    "quote": QUOTE_TRANSITIONS,
    "payment_claim": PAYMENT_CLAIM_TRANSITIONS,
}


def _get_document_statuses(document_type: str) -> frozenset[str]:
    statuses = DOCUMENT_STATUSES.get(document_type)

    if statuses is None:
        raise BadRequestException(f"Unsupported document type: '{document_type}'.")

    return statuses


def canonical_document_status(
    document_type: str,
    status: Optional[str],
) -> Optional[str]:
    """Normalise a persisted or legacy status to its canonical value."""
    if status is None:
        return None

    statuses = _get_document_statuses(document_type)
    clean = status.strip().lower()

    clean = STATUS_ALIASES[document_type].get(clean, clean)

    if clean not in statuses:
        raise BadRequestException(f"Unsupported {document_type} status: '{status}'.")

    return clean


def validate_document_status(
    document_type: str,
    status: str,
) -> str:
    """Validate and return a canonical document status."""
    canonical = canonical_document_status(document_type, status)

    if canonical is None:
        raise BadRequestException("Document status is required.")

    return canonical


def can_transition(
    document_type: str,
    from_status: str,
    to_status: str,
) -> bool:
    """Return whether a canonical lifecycle transition is permitted."""
    transitions = DOCUMENT_TRANSITIONS.get(document_type)

    if transitions is None:
        raise BadRequestException(f"Unsupported document type: '{document_type}'.")

    source = validate_document_status(document_type, from_status)
    target = validate_document_status(document_type, to_status)

    return target in transitions.get(source, set())


def invoice_target_payable(invoice) -> int:
    return (
        invoice.net_payable_minor
        if (invoice.net_payable_minor and invoice.net_payable_minor > 0)
        else invoice.total_minor
    )


def invoice_balance_minor(invoice) -> int:
    return max(
        0,
        invoice_target_payable(invoice) - (invoice.amount_paid_minor or 0),
    )


def invoice_is_overdue(
    invoice,
    today: Optional[date] = None,
) -> bool:
    status = canonical_document_status("invoice", invoice.status)

    if status in {"draft", "issued", "paid", "cancelled", "voided"}:
        return False

    today = today or date.today()

    return bool(
        invoice.due_date
        and invoice.due_date < today
        and invoice_balance_minor(invoice) > 0
    )


def invoice_days_overdue(
    invoice,
    today: Optional[date] = None,
) -> int:
    if not invoice_is_overdue(invoice, today):
        return 0

    today = today or date.today()

    return max(0, (today - invoice.due_date).days)


def invoice_payment_state(invoice) -> str:
    status = canonical_document_status("invoice", invoice.status)

    if status == "paid":
        return "paid"

    if status == "partially_paid":
        return "partially_paid"

    if status == "payment_claimed":
        return "awaiting_confirmation"

    if getattr(invoice, "payment_processing_at", None):
        return "processing"

    return "none"


def effective_invoice_status(
    invoice,
    today: Optional[date] = None,
) -> str:
    if invoice_is_overdue(invoice, today):
        return "overdue"

    return canonical_document_status("invoice", invoice.status)


def user_facing_invoice_status(
    invoice,
    today: Optional[date] = None,
) -> str:
    """Return the client-facing invoice status label."""
    status = effective_invoice_status(invoice, today)

    labels = {
        "overdue": "Overdue",
        "paid": "Paid",
        "partially_paid": "Partially paid",
        "payment_claimed": "Needs review",
        "issued": "Open",
        "sent": "Open",
        "viewed": "Open",
        "draft": "Draft",
        "cancelled": "Cancelled",
        "voided": "Voided",
    }

    return labels.get(status, status.title())


def quote_is_expired(
    quote,
    today: Optional[date] = None,
) -> bool:
    status = canonical_document_status("quote", quote.status)

    if status in {"accepted", "converted", "declined", "cancelled"}:
        return False

    today = today or date.today()

    return bool(quote.expires_at and quote.expires_at < today)


def effective_quote_status(
    quote,
    today: Optional[date] = None,
) -> str:
    if quote_is_expired(quote, today):
        return "expired"

    return canonical_document_status("quote", quote.status)


def record_status_event(
    db: AsyncSession,
    workspace_id: str,
    document_type: str,
    document_id: str,
    from_status: Optional[str],
    to_status: str,
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    source: str = "system",
    metadata: Optional[dict] = None,
) -> DocumentStatusEvent:
    """
    Record a lifecycle event without changing the document.

    Supports observation events where from_status and to_status are
    equal, such as a first view of an already-paid invoice.

    The caller owns the transaction. This function does not commit.
    """
    canonical_from = canonical_document_status(
        document_type,
        from_status,
    )

    canonical_to = validate_document_status(
        document_type,
        to_status,
    )

    event = DocumentStatusEvent(
        workspace_id=workspace_id,
        document_type=document_type,
        document_id=document_id,
        from_status=canonical_from,
        to_status=canonical_to,
        actor_type=actor_type,
        actor_id=actor_id,
        source=source,
        event_metadata=metadata,
    )

    db.add(event)

    return event


def transition_document(
    db: AsyncSession,
    *,
    document,
    document_type: str,
    to_status: str,
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    source: str = "system",
    metadata: Optional[dict] = None,
) -> DocumentStatusEvent:
    """
    Validate, mutate and record one document lifecycle transition.

    The caller owns the transaction and commit. This function never
    commits, flushes or refreshes the database session.
    """
    if document_type == "payment_claim":
        raise BadRequestException(
            "Payment claims must use transition_payment_claim()."
        )

    from_status = validate_document_status(
        document_type,
        document.status,
    )

    target_status = validate_document_status(
        document_type,
        to_status,
    )

    if from_status == target_status:
        raise BadRequestException(
            f"{document_type.title()} is already in status " f"'{target_status}'."
        )

    if not can_transition(
        document_type,
        from_status,
        target_status,
    ):
        raise BadRequestException(
            f"Invalid {document_type} status transition: "
            f"'{from_status}' to '{target_status}'."
        )

    document.status = target_status

    return record_status_event(
        db=db,
        workspace_id=document.workspace_id,
        document_type=document_type,
        document_id=document.id,
        from_status=from_status,
        to_status=target_status,
        actor_type=actor_type,
        actor_id=actor_id,
        source=source,
        metadata=metadata,
    )


async def transition_invoice_after_receipt_reversal(
    db: AsyncSession,
    *,
    invoice,
    receipt,
    reversal,
    actor_user_id: str,
) -> DocumentStatusEvent:
    """
    Apply the only permitted lifecycle reopening path for a paid invoice.

    This operation is deliberately separate from transition_document().
    It validates the persisted reversal evidence, derives the resulting
    status from the invoice's updated financial aggregates, and records
    the lifecycle event.

    The caller must have already:
      - locked the invoice and receipt;
      - posted the reversal;
      - reduced invoice.amount_paid_minor by the reversal amount.

    The caller owns the transaction and commit.
    """

    if invoice.status not in {
        "paid",
        "partially_paid",
        "issued",
        "sent",
        "viewed",
        "cancelled",
        "void",
        "voided",
    }:
        raise BadRequestException(
            f"Invoice status '{invoice.status}' cannot be changed "
            "through receipt reversal."
        )

    if receipt.invoice_id != invoice.id:
        raise BadRequestException(
            "Receipt does not belong to this invoice."
        )

    if receipt.workspace_id != invoice.workspace_id:
        raise BadRequestException(
            "Receipt and invoice belong to different workspaces."
        )

    if reversal.receipt_id != receipt.id:
        raise BadRequestException(
            "Reversal does not belong to this receipt."
        )

    if reversal.invoice_id != invoice.id:
        raise BadRequestException(
            "Reversal does not belong to this invoice."
        )

    if reversal.workspace_id != invoice.workspace_id:
        raise BadRequestException(
            "Reversal and invoice belong to different workspaces."
        )

    if reversal.status != "posted" or reversal.posted_at is None:
        raise BadRequestException(
            "Only a posted receipt reversal can change invoice status."
        )

    if reversal.amount_minor <= 0:
        raise BadRequestException(
            "Reversal amount must be greater than zero."
        )

    old_status = validate_document_status(
        "invoice",
        invoice.status,
    )

    old_paid = int(invoice.amount_paid_minor or 0)

    if old_paid < 0:
        raise BadRequestException(
            "Invoice paid amount cannot be negative."
        )

    # A reversal must already have been reflected in the invoice aggregate.
    # The receipt/reversal records provide the evidence for this operation.
    if reversal.amount_minor > receipt.amount_paid_minor:
        raise BadRequestException(
            "Reversal amount exceeds the original receipt amount."
        )

    if old_status in {"cancelled", "voided"}:
        new_status = old_status

    elif old_paid >= invoice_target_payable(invoice):
        new_status = "paid"

    elif old_paid > 0:
        new_status = "partially_paid"

    elif invoice.viewed_at:
        new_status = "viewed"

    elif invoice.sent_at:
        new_status = "sent"

    else:
        new_status = "issued"

    metadata = {
        "receipt_id": receipt.id,
        "receipt_number": receipt.receipt_number,
        "reversal_id": reversal.id,
        "reversal_type": reversal.reversal_type,
        "reversal_amount_minor": reversal.amount_minor,
        "new_amount_paid_minor": old_paid,
        "new_outstanding_minor": invoice_balance_minor(invoice),
        "reason": reversal.reason,
    }

    if old_status == new_status:
        return record_status_event(
            db=db,
            workspace_id=invoice.workspace_id,
            document_type="invoice",
            document_id=invoice.id,
            from_status=old_status,
            to_status=new_status,
            actor_type="issuer",
            actor_id=actor_user_id,
            source="receipt_reversal_posted",
            metadata=metadata,
        )

    if old_status == "paid":
        # This is the explicit exception to the generic paid-terminal rule.
        invoice.status = new_status

        return record_status_event(
            db=db,
            workspace_id=invoice.workspace_id,
            document_type="invoice",
            document_id=invoice.id,
            from_status=old_status,
            to_status=new_status,
            actor_type="issuer",
            actor_id=actor_user_id,
            source="receipt_reversal_posted",
            metadata=metadata,
        )

    return transition_document(
        db,
        document=invoice,
        document_type="invoice",
        to_status=new_status,
        actor_type="issuer",
        actor_id=actor_user_id,
        source="receipt_reversal_posted",
        metadata=metadata,
    )


async def list_status_events(
    db: AsyncSession,
    workspace_id: str,
    document_type: str,
    document_id: str,
) -> list[DocumentStatusEvent]:
    from sqlalchemy import select

    _get_document_statuses(document_type)

    stmt = (
        select(DocumentStatusEvent)
        .where(
            DocumentStatusEvent.workspace_id == workspace_id,
            DocumentStatusEvent.document_type == document_type,
            DocumentStatusEvent.document_id == document_id,
        )
        .order_by(DocumentStatusEvent.created_at.asc())
    )

    result = await db.execute(stmt)

    return list(result.scalars().all())


def record_payment_claim_created(
    db: AsyncSession,
    *,
    claim,
    workspace_id: str,
    actor_type: str = "client",
    actor_id: Optional[str] = None,
    source: str = "client_payment_claim",
    metadata: Optional[dict] = None,
) -> DocumentStatusEvent:
    """
    Record the creation of a pending payment claim.

    The claim must already have been persisted or flushed so its ID exists.
    The caller owns the transaction.
    """
    status = validate_document_status(
        "payment_claim",
        claim.status,
    )

    if status != "pending":
        raise BadRequestException("A new payment claim must start in 'pending' status.")

    return record_status_event(
        db=db,
        workspace_id=workspace_id,
        document_type="payment_claim",
        document_id=claim.id,
        from_status=None,
        to_status="pending",
        actor_type=actor_type,
        actor_id=actor_id,
        source=source,
        metadata=metadata,
    )


def transition_payment_claim(
    db: AsyncSession,
    *,
    claim,
    workspace_id: str,
    to_status: str,
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    source: str = "system",
    metadata: Optional[dict] = None,
) -> DocumentStatusEvent:
    """
    Validate, mutate and record one payment-claim lifecycle transition.

    PaymentClaim has no workspace_id of its own. The caller must supply
    the workspace ID from the locked parent invoice.

    This function never commits or flushes.
    """
    from_status = validate_document_status(
        "payment_claim",
        claim.status,
    )

    target_status = validate_document_status(
        "payment_claim",
        to_status,
    )

    if from_status == target_status:
        raise BadRequestException(
            f"Payment claim is already in status '{target_status}'."
        )

    if not can_transition(
        "payment_claim",
        from_status,
        target_status,
    ):
        raise BadRequestException(
            "Invalid payment claim status transition: "
            f"'{from_status}' to '{target_status}'."
        )

    claim.status = target_status

    return record_status_event(
        db=db,
        workspace_id=workspace_id,
        document_type="payment_claim",
        document_id=claim.id,
        from_status=from_status,
        to_status=target_status,
        actor_type=actor_type,
        actor_id=actor_id,
        source=source,
        metadata=metadata,
    )
