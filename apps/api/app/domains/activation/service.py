import uuid

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.activation.models import ProductEvent
from app.domains.activation.schemas import (
    ActivationMilestoneResponse,
    ActivationNextAction,
    ActivationResponse,
)
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.workspaces.models import Workspace

MILESTONE_DEFINITIONS = (
    ("first_invoice_created", "invoice.first_created"),
    ("first_quote_created", "quote.first_created"),
    ("first_document_dispatched", "document.first_dispatched"),
    ("first_payment_claimed", "payment.first_claimed"),
    ("first_payment_confirmed", "payment.first_confirmed"),
    ("first_receipt_issued", "receipt.first_issued"),
    ("invoice_tenth_created", "invoice.tenth_created"),
    ("invoice_hundredth_created", "invoice.hundredth_created"),
)


CHECKLIST_DISMISSED_EVENT = "activation.checklist_dismissed"
CHECKLIST_RESUMED_EVENT = "activation.checklist_resumed"


async def record_product_event(
    db: AsyncSession,
    *,
    workspace_id: str,
    event_name: str,
    user_id: str | None = None,
    source: str = "api",
    properties: dict[str, Any] | None = None,
    event_id: str | None = None,
    event_version: int = 1,
    occurred_at: datetime | None = None,
    milestone_key: str | None = None,
) -> bool:
    """
    Record one event without committing the caller's transaction.

    A nested transaction isolates uniqueness conflicts. Duplicate event
    IDs and duplicate milestones can therefore be ignored without
    rolling back the business operation surrounding them.
    """

    event = ProductEvent(
        event_id=event_id or str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=user_id,
        event_name=event_name,
        event_version=event_version,
        source=source,
        properties=properties or {},
        milestone_key=milestone_key,
        occurred_at=occurred_at or datetime.now(UTC),
    )

    savepoint = await db.begin_nested()

    try:
        db.add(event)
        await db.flush()
        await savepoint.commit()
        return True

    except IntegrityError:
        await savepoint.rollback()
        return False


async def record_milestone(
    db: AsyncSession,
    *,
    workspace_id: str,
    milestone_key: str,
    event_name: str,
    user_id: str | None = None,
    source: str = "api",
    properties: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> bool:
    return await record_product_event(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        event_name=event_name,
        source=source,
        properties=properties,
        occurred_at=occurred_at,
        milestone_key=milestone_key,
    )


async def record_invoice_created(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
) -> None:
    now = datetime.now(UTC)

    await record_product_event(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        event_name="invoice.created",
        source="api",
        properties={
            "invoice_id": invoice.id,
            "currency": invoice.currency,
        },
        occurred_at=now,
    )

    invoice_count = await db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.workspace_id == workspace.id,
        )
    )

    invoice_count = int(invoice_count or 0)

    if invoice_count == 1:
        await record_milestone(
            db,
            workspace_id=workspace.id,
            user_id=workspace.owner_id,
            milestone_key="first_invoice_created",
            event_name="invoice.first_created",
            properties={"invoice_id": invoice.id},
            occurred_at=now,
        )

    if invoice_count == 10:
        await record_milestone(
            db,
            workspace_id=workspace.id,
            user_id=workspace.owner_id,
            milestone_key="invoice_tenth_created",
            event_name="invoice.tenth_created",
            properties={"invoice_count": invoice_count},
            occurred_at=now,
        )

    if invoice_count == 100:
        await record_milestone(
            db,
            workspace_id=workspace.id,
            user_id=workspace.owner_id,
            milestone_key="invoice_hundredth_created",
            event_name="invoice.hundredth_created",
            properties={"invoice_count": invoice_count},
            occurred_at=now,
        )


async def record_quote_created(
    db: AsyncSession,
    workspace: Workspace,
    quote: Quote,
) -> None:
    now = datetime.now(UTC)

    await record_product_event(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        event_name="quote.created",
        source="api",
        properties={
            "quote_id": quote.id,
            "currency": quote.currency,
        },
        occurred_at=now,
    )

    await record_milestone(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        milestone_key="first_quote_created",
        event_name="quote.first_created",
        properties={"quote_id": quote.id},
        occurred_at=now,
    )


async def record_document_dispatched(
    db: AsyncSession,
    workspace: Workspace,
    *,
    document_type: str,
    document_id: str,
    source: str,
) -> None:
    now = datetime.now(UTC)

    await record_product_event(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        event_name="document.dispatched",
        source=source,
        properties={
            "document_type": document_type,
            "document_id": document_id,
        },
        occurred_at=now,
    )

    await record_milestone(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        milestone_key="first_document_dispatched",
        event_name="document.first_dispatched",
        source=source,
        properties={
            "document_type": document_type,
            "document_id": document_id,
        },
        occurred_at=now,
    )


async def record_payment_claimed(
    db: AsyncSession,
    workspace: Workspace,
    *,
    invoice_id: str,
    claim_id: str,
    amount_minor: int,
    currency: str,
) -> None:
    """
    This records payment intent only. It must never be used to record
    a confirmed payment or receipt.
    """

    now = datetime.now(UTC)

    await record_product_event(
        db,
        workspace_id=workspace.id,
        user_id=None,
        event_name="payment.claimed",
        source="client",
        properties={
            "invoice_id": invoice_id,
            "claim_id": claim_id,
            "amount_minor": amount_minor,
            "currency": currency,
        },
        occurred_at=now,
    )

    await record_milestone(
        db,
        workspace_id=workspace.id,
        milestone_key="first_payment_claimed",
        event_name="payment.first_claimed",
        source="client",
        properties={
            "invoice_id": invoice_id,
            "claim_id": claim_id,
        },
        occurred_at=now,
    )


async def record_payment_confirmed(
    db: AsyncSession,
    workspace: Workspace,
    *,
    invoice_id: str,
    receipt_id: str,
    amount_minor: int,
    currency: str,
) -> None:
    now = datetime.now(UTC)

    await record_product_event(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        event_name="payment.confirmed",
        source="api",
        properties={
            "invoice_id": invoice_id,
            "receipt_id": receipt_id,
            "amount_minor": amount_minor,
            "currency": currency,
        },
        occurred_at=now,
    )

    await record_milestone(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        milestone_key="first_payment_confirmed",
        event_name="payment.first_confirmed",
        properties={
            "invoice_id": invoice_id,
            "receipt_id": receipt_id,
            "currency": currency,
        },
        occurred_at=now,
    )

    await record_milestone(
        db,
        workspace_id=workspace.id,
        user_id=workspace.owner_id,
        milestone_key="first_receipt_issued",
        event_name="receipt.first_issued",
        properties={
            "invoice_id": invoice_id,
            "receipt_id": receipt_id,
        },
        occurred_at=now,
    )


async def get_activation(
    db: AsyncSession,
    workspace: Workspace,
) -> ActivationResponse:
    result = await db.execute(
        select(ProductEvent).where(
            ProductEvent.workspace_id == workspace.id,
            ProductEvent.milestone_key.is_not(None),
        )
    )

    events = {event.milestone_key: event for event in result.scalars().all()}

    milestones = [
        ActivationMilestoneResponse(
            key=key,
            completed=key in events,
            completed_at=(events[key].occurred_at if key in events else None),
        )
        for key, _ in MILESTONE_DEFINITIONS
    ]

    first_document_created = (
        "first_invoice_created" in events or "first_quote_created" in events
    )

    first_dispatched = "first_document_dispatched" in events
    first_payment = "first_payment_confirmed" in events

    if first_payment:
        activation_status = "commercially_activated"
        next_action = ActivationNextAction(
            key="create_another_invoice",
            href="/invoices/new",
        )

    elif first_dispatched:
        activation_status = "initially_activated"
        next_action = ActivationNextAction(
            key="record_first_payment",
            href="/invoices",
        )

    elif first_document_created:
        activation_status = "in_progress"
        next_action = ActivationNextAction(
            key="send_first_document",
            href="/invoices",
        )

    else:
        activation_status = "in_progress"
        next_action = ActivationNextAction(
            key="create_first_invoice",
            href="/invoices/new",
        )

    # Dismissal is a reversible presentation preference, not a
    # business milestone. The latest event wins.
    checklist_result = await db.execute(
        select(ProductEvent)
        .where(
            ProductEvent.workspace_id == workspace.id,
            ProductEvent.event_name.in_(
                (
                    CHECKLIST_DISMISSED_EVENT,
                    CHECKLIST_RESUMED_EVENT,
                )
            ),
        )
        .order_by(
            ProductEvent.occurred_at.desc(),
            ProductEvent.created_at.desc(),
        )
        .limit(1)
    )

    latest_checklist_event = checklist_result.scalar_one_or_none()

    checklist_dismissed = (
        latest_checklist_event is not None
        and latest_checklist_event.event_name == CHECKLIST_DISMISSED_EVENT
    )

    return ActivationResponse(
        activation_status=activation_status,
        milestones=milestones,
        next_recommended_action=next_action,
        checklist_dismissed=checklist_dismissed,
    )


async def ingest_client_event(
    db: AsyncSession,
    workspace: Workspace,
    *,
    event_id: str,
    event_name: str,
    event_version: int,
    properties: dict[str, Any],
    occurred_at: datetime | None,
) -> bool:
    return await record_product_event(
        db,
        workspace_id=workspace.id,
        event_id=event_id,
        user_id=None,
        event_name=event_name,
        event_version=event_version,
        source="web",
        properties=properties,
        occurred_at=occurred_at,
    )
