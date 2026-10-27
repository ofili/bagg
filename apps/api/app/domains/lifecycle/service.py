from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.lifecycle.models import DocumentStatusEvent


INVOICE_STATUSES = {
    "draft",
    "issued",
    "sent",
    "viewed",
    "payment_claimed",
    "partially_paid",
    "paid",
    "cancelled",
}

INVOICE_TRANSITIONS = {
    "draft": {"issued", "cancelled"},
    "issued": {"sent", "cancelled"},
    "sent": {"viewed", "cancelled"},
    "viewed": {"payment_claimed", "cancelled"},
    "payment_claimed": {"viewed", "partially_paid", "paid", "cancelled"},
    "partially_paid": {"paid", "cancelled"},
    "paid": set(),
    "cancelled": set(),
}

QUOTE_STATUSES = {
    "draft",
    "issued",
    "sent",
    "viewed",
    "review_requested",
    "accepted",
    "declined",
    "converted",
}

QUOTE_TRANSITIONS = {
    "draft": {"issued", "cancelled"},
    "issued": {"sent", "review_requested", "cancelled"},
    "sent": {"viewed", "review_requested", "cancelled"},
    "viewed": {"review_requested", "accepted", "declined"},
    "review_requested": {"issued", "declined", "cancelled"},
    "accepted": {"converted"},
    "declined": set(),
    "converted": set(),
}


def invoice_target_payable(invoice) -> int:
    return (
        invoice.net_payable_minor
        if (invoice.net_payable_minor and invoice.net_payable_minor > 0)
        else invoice.total_minor
    )


def invoice_balance_minor(invoice) -> int:
    return max(0, invoice_target_payable(invoice) - (invoice.amount_paid_minor or 0))


def invoice_is_overdue(invoice, today: Optional[date] = None) -> bool:
    if invoice.status in {"draft", "issued", "paid", "cancelled"}:
        return False
    today = today or date.today()
    return bool(invoice.due_date and invoice.due_date < today and invoice_balance_minor(invoice) > 0)


def invoice_days_overdue(invoice, today: Optional[date] = None) -> int:
    if not invoice_is_overdue(invoice, today):
        return 0
    today = today or date.today()
    return max(0, (today - invoice.due_date).days)


def invoice_payment_state(invoice) -> str:
    if invoice.status == "paid":
        return "paid"
    if invoice.status == "partially_paid":
        return "partially_paid"
    if invoice.status == "payment_claimed":
        return "awaiting_confirmation"
    if getattr(invoice, "payment_processing_at", None):
        return "processing"
    return "none"


def effective_invoice_status(invoice, today: Optional[date] = None) -> str:
    if invoice_is_overdue(invoice, today):
        return "overdue"
    return invoice.status


def user_facing_invoice_status(invoice, today: Optional[date] = None) -> str:
    """Return a human-readable status for client-facing display.

    Draft / issued / sent / viewed all read as 'Open' to the client,
    with the granular status kept as secondary context.
    """
    eff = effective_invoice_status(invoice, today)
    if eff == "overdue":
        return "Overdue"
    if invoice.status == "paid":
        return "Paid"
    if invoice.status == "partially_paid":
        return "Partially paid"
    if invoice.status == "payment_claimed":
        return "Needs review"
    if invoice.status in {"issued", "sent", "viewed"}:
        return "Open"
    if invoice.status == "draft":
        return "Draft"
    if invoice.status == "cancelled":
        return "Cancelled"
    return invoice.status.title()


def quote_is_expired(quote, today: Optional[date] = None) -> bool:
    if quote.status in {"accepted", "converted", "declined"}:
        return False
    today = today or date.today()
    return bool(quote.expires_at and quote.expires_at < today)


def effective_quote_status(quote, today: Optional[date] = None) -> str:
    if quote_is_expired(quote, today):
        return "expired"
    return quote.status


def can_transition(document_type: str, from_status: str, to_status: str) -> bool:
    transitions = INVOICE_TRANSITIONS if document_type == "invoice" else QUOTE_TRANSITIONS
    return to_status in transitions.get(from_status, set())


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
    event = DocumentStatusEvent(
        workspace_id=workspace_id,
        document_type=document_type,
        document_id=document_id,
        from_status=from_status,
        to_status=to_status,
        actor_type=actor_type,
        actor_id=actor_id,
        source=source,
        event_metadata=metadata,
    )
    db.add(event)
    return event


async def list_status_events(
    db: AsyncSession,
    workspace_id: str,
    document_type: str,
    document_id: str,
) -> list[DocumentStatusEvent]:
    from sqlalchemy import select

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
