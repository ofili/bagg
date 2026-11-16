
from datetime import date, datetime, time, timedelta, UTC
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.activation.models import ProductEvent
from app.domains.auth.models import User
from app.domains.billing.models import BillingCheckout, Subscription
from app.domains.workspaces.models import Workspace


FUNNEL_EVENTS = {
    "profile_completed": ("workspace.profile_completed",),
    "first_document_created": (
        "invoice.first_created",
        "quote.first_created",
    ),
    "first_document_dispatched": ("document.first_dispatched",),
    "first_payment_confirmed": ("payment.first_confirmed",),
}


def _date_bounds(
    from_date: date | None,
    to_date: date | None,
) -> tuple[datetime | None, datetime | None]:
    start = (
        datetime.combine(from_date, time.min, tzinfo=UTC)
        if from_date else None
    )
    end = (
        datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=UTC)
        if to_date else None
    )
    return start, end


async def _workspace_scope(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> list[str]:
    start, end = _date_bounds(from_date, to_date)

    stmt = (
        select(Workspace.id)
        .join(User, User.id == Workspace.owner_id)
        .outerjoin(
            Subscription,
            Subscription.workspace_id == Workspace.id,
        )
    )

    if start:
        stmt = stmt.where(User.created_at >= start)

    if end:
        stmt = stmt.where(User.created_at < end)

    if country:
        stmt = stmt.where(Workspace.country == country.upper())

    if plan_code:
        stmt = stmt.where(
            or_(
                Subscription.plan_code == plan_code,
                Subscription.tier == plan_code,
            )
        )

    if acquisition_source:
        # Attribution is stored in ProductEvent properties.
        # ProductEvent.source is the event origin, not acquisition source.
        attribution_event = (
            select(ProductEvent.id)
            .where(
                ProductEvent.workspace_id == Workspace.id,
                ProductEvent.event_name.in_(
                    ("account.created", "workspace.created")
                ),
                or_(
                    ProductEvent.properties["acquisition_source"].as_string()
                    == acquisition_source,
                    ProductEvent.properties["utm_source"].as_string()
                    == acquisition_source,
                ),
            )
            .exists()
        )
        stmt = stmt.where(attribution_event)

    result = await db.scalars(stmt.distinct())
    return list(result.all())


async def _event_workspace_sets(
    db: AsyncSession,
    workspace_ids: list[str],
) -> dict[str, set[str]]:
    if not workspace_ids:
        return {}

    names = tuple(
        event_name
        for event_names in FUNNEL_EVENTS.values()
        for event_name in event_names
    )

    result = await db.execute(
        select(
            ProductEvent.workspace_id,
            ProductEvent.event_name,
        ).where(
            ProductEvent.workspace_id.in_(workspace_ids),
            ProductEvent.event_name.in_(names),
        )
    )

    events: dict[str, set[str]] = {}

    for workspace_id, event_name in result.all():
        events.setdefault(workspace_id, set()).add(event_name)

    return events


def _stage_workspace_ids(
    workspace_ids: list[str],
    events: dict[str, set[str]],
    stage: str,
) -> set[str]:
    event_names = FUNNEL_EVENTS[stage]

    return {
        workspace_id
        for workspace_id in workspace_ids
        if events.get(workspace_id, set()).intersection(event_names)
    }


async def get_overview(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> dict[str, Any]:
    ids = await _workspace_scope(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    total = len(ids)
    events = await _event_workspace_sets(db, ids)

    profile = sum(
        "workspace.profile_completed" in events.get(i, set())
        for i in ids
    )
    document_created = len(
        _stage_workspace_ids(ids, events, "first_document_created")
    )
    dispatched = len(
        _stage_workspace_ids(ids, events, "first_document_dispatched")
    )
    paid_by_client = len(
        _stage_workspace_ids(ids, events, "first_payment_confirmed")
    )

    paid_subscriptions = 0
    if ids:
        paid_subscriptions = await db.scalar(
            select(func.count(Subscription.id)).where(
                Subscription.workspace_id.in_(ids),
                Subscription.tier != "free",
                Subscription.status.in_(("active", "past_due")),
            )
        ) or 0

    return {
        "workspace_count": total,
        "profile_completed": profile,
        "first_document_created": document_created,
        "first_document_dispatched": dispatched,
        "first_payment_confirmed": paid_by_client,
        "paid_subscriptions": int(paid_subscriptions),
        "profile_completion_rate": _rate(profile, total),
        "document_creation_rate": _rate(document_created, total),
        "dispatch_rate": _rate(dispatched, total),
        "client_payment_rate": _rate(paid_by_client, total),
        "subscription_conversion_rate": _rate(
            int(paid_subscriptions), total
        ),
    }


def _rate(numerator: int, denominator: int) -> float:
    if not denominator:
        return 0.0
    return round(numerator / denominator * 100, 2)


async def get_funnel(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> dict[str, Any]:
    ids = await _workspace_scope(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    events = await _event_workspace_sets(db, ids)

    stages = [
        ("account_created", set(ids)),
        ("workspace_created", set(ids)),
        (
            "profile_completed",
            {
                i for i in ids
                if "workspace.profile_completed" in events.get(i, set())
            },
        ),
        (
            "first_document_created",
            _stage_workspace_ids(ids, events, "first_document_created"),
        ),
        (
            "first_document_dispatched",
            _stage_workspace_ids(ids, events, "first_document_dispatched"),
        ),
        (
            "first_payment_confirmed",
            _stage_workspace_ids(ids, events, "first_payment_confirmed"),
        ),
    ]

    paid_ids: set[str] = set()
    if ids:
        result = await db.scalars(
            select(Subscription.workspace_id).where(
                Subscription.workspace_id.in_(ids),
                Subscription.tier != "free",
                Subscription.status.in_(("active", "past_due")),
            )
        )
        paid_ids = set(result.all())

    stages.append(("paid_subscription", paid_ids))

    return {
        "cohort_size": len(ids),
        "stages": [
            {
                "key": key,
                "count": len(workspaces),
                "conversion_rate": _rate(len(workspaces), len(ids)),
                "previous_stage_rate": (
                    _rate(len(workspaces), len(stages[index - 1][1]))
                    if index > 0 else 100.0 if ids else 0.0
                ),
            }
            for index, (key, workspaces) in enumerate(stages)
        ],
    }


async def get_billing(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> dict[str, Any]:
    ids = await _workspace_scope(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    if not ids:
        return {
            "checkout_count": 0,
            "successful_checkouts": 0,
            "failed_checkouts": 0,
            "pending_checkouts": 0,
            "subscription_revenue_minor": 0,
            "credit_pack_revenue_minor": 0,
            "currency_note": "Amounts remain grouped by checkout currency.",
            "by_currency": [],
        }

    start, end = _date_bounds(from_date, to_date)

    stmt = select(
        BillingCheckout.currency,
        BillingCheckout.purchase_type,
        BillingCheckout.status,
        func.count(BillingCheckout.id),
        func.coalesce(func.sum(BillingCheckout.amount_minor), 0),
    ).where(BillingCheckout.workspace_id.in_(ids))

    if start:
        stmt = stmt.where(BillingCheckout.created_at >= start)
    if end:
        stmt = stmt.where(BillingCheckout.created_at < end)

    stmt = stmt.group_by(
        BillingCheckout.currency,
        BillingCheckout.purchase_type,
        BillingCheckout.status,
    )

    result = await db.execute(stmt)

    rows = [
        {
            "currency": currency,
            "purchase_type": purchase_type,
            "status": status,
            "count": int(count),
            "amount_minor": int(amount or 0),
        }
        for currency, purchase_type, status, count, amount in result.all()
    ]

    return {
        "checkout_count": sum(row["count"] for row in rows),
        "successful_checkouts": sum(
            row["count"] for row in rows if row["status"] == "succeeded"
        ),
        "failed_checkouts": sum(
            row["count"] for row in rows if row["status"] == "failed"
        ),
        "pending_checkouts": sum(
            row["count"] for row in rows
            if row["status"] in ("pending", "initializing")
        ),
        "by_currency": rows,
        "currency_note": (
            "Amounts remain grouped by checkout currency; "
            "do not add different currencies together."
        ),
    }


async def get_events(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    event_name: str | None = None,
    event_source: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    start, end = _date_bounds(from_date, to_date)

    stmt = select(ProductEvent)

    if start:
        stmt = stmt.where(ProductEvent.occurred_at >= start)
    if end:
        stmt = stmt.where(ProductEvent.occurred_at < end)
    if event_name:
        stmt = stmt.where(ProductEvent.event_name == event_name)
    if event_source:
        stmt = stmt.where(ProductEvent.source == event_source)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int(await db.scalar(count_stmt) or 0)

    result = await db.scalars(
        stmt.order_by(
            ProductEvent.occurred_at.desc(),
            ProductEvent.created_at.desc(),
        ).offset(offset).limit(limit)
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "event_id": event.event_id,
                "event_name": event.event_name,
                "event_version": event.event_version,
                "workspace_id": event.workspace_id,
                "user_id": event.user_id,
                "source": event.source,
                "properties": event.properties,
                "occurred_at": event.occurred_at,
            }
            for event in result.all()
        ],
    }
