
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.activation.models import ProductEvent
from app.domains.auth.models import User
from app.domains.billing.models import BillingCheckout, Subscription
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.workspaces.models import Workspace


ACTIVATION_EVENTS = {
    "first_document_created": (
        "invoice.first_created",
        "quote.first_created",
    ),
    "first_document_dispatched": (
        "document.first_dispatched",
    ),
    "first_payment_confirmed": (
        "payment.first_confirmed",
    ),
}

COHORT_WINDOWS = {
    "24h": timedelta(hours=24),
    "3d": timedelta(days=3),
    "7d": timedelta(days=7),
    "14d": timedelta(days=14),
    "30d": timedelta(days=30),
}

SEGMENTS = {
    "incomplete_setup",
    "no_document",
    "drafts_not_dispatched",
    "dispatched_no_payment",
    "pending_checkout",
    "failed_checkout",
    "paid_not_activated",
}

# Only these properties may be exposed by the internal event explorer.
SAFE_EVENT_PROPERTIES = {
    "purchase_type",
    "plan_code",
    "billing_interval",
    "currency",
    "document_type",
    "step",
    "surface",
    "action",
    "error_code",
    "invoice_count",
    "event_category",
    "acquisition_source",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "referral_code",
    "landing_path",
    "referrer",
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


def _rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator * 100, 2)


def _safe_properties(properties: Any) -> dict[str, Any]:
    if not isinstance(properties, dict):
        return {}

    result = {}

    for key, value in properties.items():
        if key not in SAFE_EVENT_PROPERTIES:
            continue

        if value is None or isinstance(value, (str, int, float, bool)):
            if isinstance(value, str):
                result[key] = value[:250]
            else:
                result[key] = value

    return result


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
                Workspace.tier == plan_code,
            )
        )

    if acquisition_source:
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


async def _workspace_event_names(
    db: AsyncSession,
    workspace_ids: list[str],
    event_names: tuple[str, ...] | None = None,
) -> dict[str, set[str]]:
    if not workspace_ids:
        return {}

    names = event_names or tuple(
        name
        for group in ACTIVATION_EVENTS.values()
        for name in group
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

    events: dict[str, set[str]] = defaultdict(set)

    for workspace_id, event_name in result.all():
        events[workspace_id].add(event_name)

    return dict(events)


def _stage_ids(
    workspace_ids: list[str],
    events: dict[str, set[str]],
    stage: str,
) -> set[str]:
    names = ACTIVATION_EVENTS[stage]

    return {
        workspace_id
        for workspace_id in workspace_ids
        if events.get(workspace_id, set()).intersection(names)
    }


async def _account_scope(
    db: AsyncSession,
    workspace_ids: list[str],
) -> set[str]:
    if not workspace_ids:
        return set()

    result = await db.scalars(
        select(Workspace.owner_id).where(
            Workspace.id.in_(workspace_ids)
        )
    )
    return set(result.all())


async def _account_created_count(
    db: AsyncSession,
    *,
    from_date: date | None,
    to_date: date | None,
    workspace_ids: list[str],
) -> int:
    if not workspace_ids:
        return 0

    owners = await _account_scope(db, workspace_ids)

    if not owners:
        return 0

    start, end = _date_bounds(from_date, to_date)

    stmt = select(func.count(User.id)).where(User.id.in_(owners))

    if start:
        stmt = stmt.where(User.created_at >= start)

    if end:
        stmt = stmt.where(User.created_at < end)

    return int(await db.scalar(stmt) or 0)


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
    events = await _workspace_event_names(db, ids)

    profile_result = await db.scalar(
        select(func.count(Workspace.id)).where(
            Workspace.id.in_(ids),
            Workspace.onboarding_completed.is_(True),
        )
    ) if ids else 0

    profile = int(profile_result or 0)

    created = len(_stage_ids(ids, events, "first_document_created"))
    dispatched = len(_stage_ids(ids, events, "first_document_dispatched"))
    confirmed = len(_stage_ids(ids, events, "first_payment_confirmed"))

    paid_subscriptions = 0
    if ids:
        paid_subscriptions = int(
            await db.scalar(
                select(func.count(Subscription.id)).where(
                    Subscription.workspace_id.in_(ids),
                    Subscription.tier != "free",
                    Subscription.status.in_(("active", "past_due")),
                )
            ) or 0
        )

    account_count = await _account_created_count(
        db,
        from_date=from_date,
        to_date=to_date,
        workspace_ids=ids,
    )

    return {
        "account_count": account_count,
        "workspace_count": total,
        "profile_completed": profile,
        "first_document_created": created,
        "first_document_dispatched": dispatched,
        "first_payment_confirmed": confirmed,
        "paid_subscriptions": paid_subscriptions,
        "profile_completion_rate": _rate(profile, total),
        "document_creation_rate": _rate(created, total),
        "dispatch_rate": _rate(dispatched, total),
        "client_payment_rate": _rate(confirmed, total),
        "subscription_conversion_rate": _rate(
            paid_subscriptions, total
        ),
    }


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

    owners = await _account_scope(db, ids)
    account_count = await _account_created_count(
        db,
        from_date=from_date,
        to_date=to_date,
        workspace_ids=ids,
    )

    events = await _workspace_event_names(db, ids)

    workspace_owners_result = await db.execute(
        select(Workspace.id, Workspace.owner_id).where(
            Workspace.id.in_(ids)
        )
    ) if ids else None

    owner_by_workspace = (
        {
            workspace_id: owner_id
            for workspace_id, owner_id in workspace_owners_result.all()
        }
        if workspace_owners_result else {}
    )

    def owners_for_stage(workspace_stage_ids: set[str]) -> set[str]:
        return {
            owner_by_workspace[workspace_id]
            for workspace_id in workspace_stage_ids
            if workspace_id in owner_by_workspace
        }

    profile_result = await db.scalars(
        select(Workspace.id).where(
            Workspace.id.in_(ids),
            Workspace.onboarding_completed.is_(True),
        )
    ) if ids else None

    profile_ids = set(profile_result.all()) if profile_result else set()

    stages = [
        ("account_created", owners),
        ("workspace_created", owners),
        ("profile_completed", owners_for_stage(profile_ids)),
        (
            "first_document_created",
            owners_for_stage(
                _stage_ids(ids, events, "first_document_created")
            ),
        ),
        (
            "first_document_dispatched",
            owners_for_stage(
                _stage_ids(ids, events, "first_document_dispatched")
            ),
        ),
        (
            "first_payment_confirmed",
            owners_for_stage(
                _stage_ids(ids, events, "first_payment_confirmed")
            ),
        ),
    ]

    paid_ids: set[str] = set()
    if ids:
        result = await db.execute(
            select(Subscription.workspace_id, Workspace.owner_id)
            .join(Workspace, Workspace.id == Subscription.workspace_id)
            .where(
                Subscription.workspace_id.in_(ids),
                Subscription.tier != "free",
                Subscription.status.in_(("active", "past_due")),
            )
        )
        paid_ids = {owner_id for _, owner_id in result.all()}

    stages.append(("paid_subscription", paid_ids))

    previous_count = None
    stage_results = []

    for key, account_ids in stages:
        count = len(account_ids)
        stage_results.append({
            "key": key,
            "count": count,
            "conversion_rate": _rate(count, account_count),
            "previous_stage_rate": (
                _rate(count, previous_count)
                if previous_count is not None else 100.0 if account_count else 0.0
            ),
        })
        previous_count = count

    return {
        "cohort_size": account_count,
        "measurement_unit": "accounts",
        "stages": stage_results,
    }


async def get_cohorts(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> dict[str, Any]:
    workspace_ids = await _workspace_scope(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    if not workspace_ids:
        return {
            "measurement_unit": "accounts",
            "windows": list(COHORT_WINDOWS),
            "items": [],
        }

    workspace_result = await db.execute(
        select(Workspace.id, Workspace.owner_id).where(
            Workspace.id.in_(workspace_ids)
        )
    )
    workspace_owner = {
        workspace_id: owner_id
        for workspace_id, owner_id in workspace_result.all()
    }

    owner_ids = set(workspace_owner.values())
    start, end = _date_bounds(from_date, to_date)

    user_stmt = select(User.id, User.created_at).where(
        User.id.in_(owner_ids)
    )
    if start:
        user_stmt = user_stmt.where(User.created_at >= start)
    if end:
        user_stmt = user_stmt.where(User.created_at < end)

    user_result = await db.execute(user_stmt)
    users = {
        user_id: created_at
        for user_id, created_at in user_result.all()
    }

    if not users:
        return {
            "measurement_unit": "accounts",
            "windows": list(COHORT_WINDOWS),
            "items": [],
        }

    owner_workspaces: dict[str, list[str]] = defaultdict(list)
    for workspace_id, owner_id in workspace_owner.items():
        if owner_id in users:
            owner_workspaces[owner_id].append(workspace_id)

    milestone_names = (
        "document.first_dispatched",
        "payment.first_confirmed",
    )

    event_result = await db.execute(
        select(
            ProductEvent.workspace_id,
            ProductEvent.event_name,
            ProductEvent.occurred_at,
        ).where(
            ProductEvent.workspace_id.in_(workspace_ids),
            ProductEvent.event_name.in_(milestone_names),
        )
    )

    events_by_owner: dict[str, list[tuple[str, datetime]]] = defaultdict(list)

    for workspace_id, event_name, occurred_at in event_result.all():
        owner_id = workspace_owner.get(workspace_id)
        if owner_id:
            events_by_owner[owner_id].append((event_name, occurred_at))

    now = datetime.now(UTC)
    cohorts: dict[str, list[str]] = defaultdict(list)

    for user_id, created_at in users.items():
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        month = created_at.strftime("%Y-%m")
        cohorts[month].append(user_id)

    items = []

    for month in sorted(cohorts):
        cohort_users = cohorts[month]
        counts = {
            window: {"eligible": 0, "initially_activated": 0, "commercially_activated": 0}
            for window in COHORT_WINDOWS
        }

        for user_id in cohort_users:
            signup_at = users[user_id]
            if signup_at.tzinfo is None:
                signup_at = signup_at.replace(tzinfo=UTC)

            user_events = events_by_owner.get(user_id, [])

            for window_name, duration in COHORT_WINDOWS.items():
                cutoff = signup_at + duration

                if now < cutoff:
                    continue

                counts[window_name]["eligible"] += 1

                qualifying = [
                    (name, occurred_at)
                    for name, occurred_at in user_events
                    if signup_at <= occurred_at <= cutoff
                ]

                if any(
                    name == "document.first_dispatched"
                    for name, _ in qualifying
                ):
                    counts[window_name]["initially_activated"] += 1

                if any(
                    name == "payment.first_confirmed"
                    for name, _ in qualifying
                ):
                    counts[window_name]["commercially_activated"] += 1

        windows = {}
        for window_name, values in counts.items():
            eligible = values["eligible"]
            windows[window_name] = {
                "eligible_accounts": eligible,
                "initially_activated": values["initially_activated"],
                "commercially_activated": values["commercially_activated"],
                "initial_activation_rate": _rate(
                    values["initially_activated"], eligible
                ),
                "commercial_activation_rate": _rate(
                    values["commercially_activated"], eligible
                ),
                "mature": eligible == len(cohort_users),
            }

        items.append({
            "cohort_month": month,
            "signup_accounts": len(cohort_users),
            "windows": windows,
        })

    return {
        "measurement_unit": "accounts",
        "windows": list(COHORT_WINDOWS),
        "items": items,
    }


async def _segment_workspace_ids(
    db: AsyncSession,
    workspace_ids: list[str],
) -> dict[str, set[str]]:
    if not workspace_ids:
        return {key: set() for key in SEGMENTS}

    events = await _workspace_event_names(
        db,
        workspace_ids,
        (
            "document.first_dispatched",
            "payment.first_confirmed",
        ),
    )

    dispatched = {
        workspace_id
        for workspace_id in workspace_ids
        if "document.first_dispatched" in events.get(workspace_id, set())
    }

    confirmed = {
        workspace_id
        for workspace_id in workspace_ids
        if "payment.first_confirmed" in events.get(workspace_id, set())
    }

    profile_result = await db.scalars(
        select(Workspace.id).where(
            Workspace.id.in_(workspace_ids),
            Workspace.onboarding_completed.is_(False),
        )
    )
    incomplete = set(profile_result.all())

    invoice_exists = (
        select(Invoice.id)
        .where(Invoice.workspace_id == Workspace.id)
        .exists()
    )
    quote_exists = (
        select(Quote.id)
        .where(Quote.workspace_id == Workspace.id)
        .exists()
    )

    no_document_result = await db.scalars(
        select(Workspace.id).where(
            Workspace.id.in_(workspace_ids),
            ~invoice_exists,
            ~quote_exists,
        )
    )
    no_document = set(no_document_result.all())

    draft_invoice = (
        select(Invoice.id)
        .where(
            Invoice.workspace_id == Workspace.id,
            Invoice.status == "draft",
        )
        .exists()
    )
    draft_quote = (
        select(Quote.id)
        .where(
            Quote.workspace_id == Workspace.id,
            Quote.status == "draft",
        )
        .exists()
    )

    drafts_result = await db.scalars(
        select(Workspace.id).where(
            Workspace.id.in_(workspace_ids),
            or_(draft_invoice, draft_quote),
        )
    )
    drafts = set(drafts_result.all()) - dispatched

    pending_result = await db.scalars(
        select(BillingCheckout.workspace_id).where(
            BillingCheckout.workspace_id.in_(workspace_ids),
            BillingCheckout.status.in_(("initializing", "pending")),
        ).distinct()
    )
    pending = set(pending_result.all())

    failed_result = await db.scalars(
        select(BillingCheckout.workspace_id).where(
            BillingCheckout.workspace_id.in_(workspace_ids),
            BillingCheckout.status == "failed",
        ).distinct()
    )
    failed = set(failed_result.all())

    paid_result = await db.scalars(
        select(Subscription.workspace_id).where(
            Subscription.workspace_id.in_(workspace_ids),
            Subscription.tier != "free",
            Subscription.status.in_(("active", "past_due")),
        )
    )
    paid = set(paid_result.all())

    return {
        "incomplete_setup": incomplete,
        "no_document": no_document,
        "drafts_not_dispatched": drafts,
        "dispatched_no_payment": dispatched - confirmed,
        "pending_checkout": pending,
        "failed_checkout": failed,
        "paid_not_activated": paid - dispatched,
    }


async def get_segments(
    db: AsyncSession,
    *,
    segment: str = "incomplete_setup",
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    if segment not in SEGMENTS:
        raise ValueError(f"Unsupported segment: {segment}")

    workspace_ids = await _workspace_scope(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    segment_ids = await _segment_workspace_ids(db, workspace_ids)

    counts = {
        key: len(ids)
        for key, ids in segment_ids.items()
    }

    selected_ids = segment_ids[segment]

    if not selected_ids:
        return {
            "counts": counts,
            "selected_segment": segment,
            "total": 0,
            "limit": limit,
            "offset": offset,
            "items": [],
        }

    stmt = (
        select(
            Workspace.id,
            Workspace.business_name,
            Workspace.country,
            Workspace.onboarding_completed,
            Workspace.created_at,
            User.email,
            User.full_name,
            Subscription.tier,
            Subscription.status,
        )
        .join(User, User.id == Workspace.owner_id)
        .outerjoin(
            Subscription,
            Subscription.workspace_id == Workspace.id,
        )
        .where(Workspace.id.in_(selected_ids))
        .order_by(Workspace.created_at.desc())
    )

    total = len(selected_ids)

    result = await db.execute(
        stmt.offset(offset).limit(limit)
    )

    now = datetime.now(UTC)
    items = []

    for (
        workspace_id,
        business_name,
        country_code,
        onboarding_completed,
        created_at,
        email,
        full_name,
        tier,
        subscription_status,
    ) in result.all():
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)

        items.append({
            "workspace_id": workspace_id,
            "business_name": business_name,
            "country": country_code,
            "onboarding_completed": onboarding_completed,
            "created_at": created_at,
            "workspace_age_days": max(
                0, (now - created_at).days
            ),
            "owner_email": email,
            "owner_name": full_name,
            "plan_code": tier or "free",
            "subscription_status": subscription_status,
        })

    return {
        "counts": counts,
        "selected_segment": segment,
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
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
            "revenue_by_currency": [],
            "checkout_breakdown": [],
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

    successful = [
        row for row in rows if row["status"] == "succeeded"
    ]

    revenue: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "subscription_revenue_minor": 0,
            "credit_pack_revenue_minor": 0,
        }
    )

    for row in successful:
        currency = row["currency"]
        if row["purchase_type"] == "subscription":
            revenue[currency]["subscription_revenue_minor"] += row["amount_minor"]
        elif row["purchase_type"] == "credit_pack":
            revenue[currency]["credit_pack_revenue_minor"] += row["amount_minor"]

    return {
        "checkout_count": sum(row["count"] for row in rows),
        "successful_checkouts": sum(row["count"] for row in successful),
        "failed_checkouts": sum(
            row["count"] for row in rows if row["status"] == "failed"
        ),
        "pending_checkouts": sum(
            row["count"]
            for row in rows
            if row["status"] in ("pending", "initializing")
        ),
        "revenue_by_currency": [
            {
                "currency": currency,
                **values,
                "total_revenue_minor": (
                    values["subscription_revenue_minor"]
                    + values["credit_pack_revenue_minor"]
                ),
            }
            for currency, values in sorted(revenue.items())
        ],
        "checkout_breakdown": rows,
        "currency_note": (
            "Revenue is grouped by currency. Different currencies must not "
            "be added together."
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
                "properties": _safe_properties(event.properties),
                "occurred_at": event.occurred_at,
            }
            for event in result.all()
        ],
    }
