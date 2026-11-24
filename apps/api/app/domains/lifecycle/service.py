from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException
from app.domains.lifecycle.models import DocumentStatusEvent

INVOICE_STATUSES = frozenset(
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

QUOTE_STATUSES = frozenset(
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

DOCUMENT_STATUSES = {
    "invoice": INVOICE_STATUSES,
    "quote": QUOTE_STATUSES,
}

# Compatibility for historical invoice records.
# New writes always use the canonical value "voided".
STATUS_ALIASES = {
    "invoice": {
        "void": "voided",
    },
    "quote": {},
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
        "paid",
    },
    # A confirmed receipt reversal can reopen a paid invoice.
    "paid": {"issued", "sent", "viewed", "partially_paid"},
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
