from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from urllib.parse import urlsplit, urlunsplit

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

# Explicit allowlist. Never return arbitrary event properties.
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

def _normalise_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value

def _rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator * 100, 2)


def _safe_url_property(key: str, value: str) -> str | None:
    """
    Return a safe URL attribution value without query strings or fragments.

    landing_path is treated as a path, not as an arbitrary URL.
    referrer accepts only HTTP(S) URLs with a valid hostname.

    Credentials in URL authority components are never returned.
    """
    value = value.strip()

    if not value:
        return None

    try:
        parsed = urlsplit(value)
    except ValueError:
        return None

    if key == "landing_path":
        # Retain only the path. Query strings and fragments can contain
        # email addresses, tokens, or other sensitive information.
        path = parsed.path or "/"
        return path[:100]

    if key == "referrer":
        if parsed.scheme.lower() not in {"http", "https"}:
            return None

        hostname = parsed.hostname

        if not hostname:
            return None

        try:
            port = parsed.port
        except ValueError:
            return None

        # Reconstruct the authority without username/password information.
        if ":" in hostname and not hostname.startswith("["):
            safe_host = f"[{hostname}]"
        else:
            safe_host = hostname

        netloc = (
            f"{safe_host}:{port}"
            if port is not None
            else safe_host
        )

        safe_url = urlunsplit(
            (
                parsed.scheme.lower(),
                netloc,
                parsed.path,
                "",
                "",
            )
        )

        return safe_url[:100]

    return None


def _safe_properties(properties: Any) -> dict[str, Any]:
    """
    Project event properties through an explicit safe allowlist.

    Unknown keys and complex values are discarded. URL attribution
    properties are sanitised before they are returned.
    """
    if not isinstance(properties, dict):
        return {}

    safe: dict[str, Any] = {}

    for key, value in properties.items():
        if key not in SAFE_EVENT_PROPERTIES:
            continue

        if key in {"landing_path", "referrer"}:
            if isinstance(value, str):
                sanitised = _safe_url_property(key, value)

                if sanitised is not None:
                    safe[key] = sanitised

            continue

        if value is None or isinstance(value, (str, int, float, bool)):
            if isinstance(value, str):
                safe[key] = value[:100]
            else:
                safe[key] = value

    return safe


async def _user_ids_in_signup_window(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> set[str]:
    start, end = _date_bounds(from_date, to_date)

    stmt = select(User.id)

    if start:
        stmt = stmt.where(User.created_at >= start)

    if end:
        stmt = stmt.where(User.created_at < end)

    result = await db.scalars(stmt)
    return set(result.all())

async def _workspace_scope(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
) -> list[str]:
    """
    Return workspaces matching the selected workspace attributes.

    Date filters here refer to workspace-owner signup date. Billing
    analytics deliberately calls this without date filters because
    its date range refers to checkout creation time.
    """
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

async def _account_ids_for_workspaces(
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

async def _account_cohort_ids(
    db: AsyncSession,
    *,
    workspace_ids: list[str],
    from_date: date | None,
    to_date: date | None,
    country: str | None,
    plan_code: str | None,
    acquisition_source: str | None,
) -> set[str]:
    """
    With no workspace dimensions, the account cohort is all registered
    users in the signup date range, including users without workspaces.

    When a workspace dimension is supplied, the cohort is restricted
    to owners of workspaces matching that dimension.
    """
    has_workspace_filter = any(
        (country, plan_code, acquisition_source)
    )

    if has_workspace_filter:
        return await _account_ids_for_workspaces(db, workspace_ids)

    return await _user_ids_in_signup_window(
        db,
        from_date=from_date,
        to_date=to_date,
    )

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

def _owners_for_workspaces(
    workspace_owner: dict[str, str],
    workspace_ids: set[str],
) -> set[str]:
    return {
        workspace_owner[workspace_id]
        for workspace_id in workspace_ids
        if workspace_id in workspace_owner
    }

async def _workspace_owner_map(
    db: AsyncSession,
    workspace_ids: list[str],
) -> dict[str, str]:
    if not workspace_ids:
        return {}

    result = await db.execute(
        select(Workspace.id, Workspace.owner_id).where(
            Workspace.id.in_(workspace_ids)
        )
    )

    return {
        workspace_id: owner_id
        for workspace_id, owner_id in result.all()
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

    account_ids = await _account_cohort_ids(
        db,
        workspace_ids=ids,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    total = len(ids)
    events = await _workspace_event_names(db, ids)

    profile_result = (
        await db.scalar(
            select(func.count(Workspace.id)).where(
                Workspace.id.in_(ids),
                Workspace.onboarding_completed.is_(True),
            )
        )
        if ids else 0
    )

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

    return {
        "account_count": len(account_ids),
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

    account_ids = await _account_cohort_ids(
        db,
        workspace_ids=ids,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    events = await _workspace_event_names(db, ids)
    owner_by_workspace = await _workspace_owner_map(db, ids)

    workspace_owner_ids = set(owner_by_workspace.values())

    profile_result = (
        await db.scalars(
            select(Workspace.id).where(
                Workspace.id.in_(ids),
                Workspace.onboarding_completed.is_(True),
            )
        )
        if ids else None
    )
    profile_ids = set(profile_result.all()) if profile_result else set()

    created_ids = _stage_ids(ids, events, "first_document_created")
    dispatched_ids = _stage_ids(ids, events, "first_document_dispatched")
    confirmed_ids = _stage_ids(ids, events, "first_payment_confirmed")

    paid_workspace_ids: set[str] = set()

    if ids:
        paid_result = await db.scalars(
            select(Subscription.workspace_id).where(
                Subscription.workspace_id.in_(ids),
                Subscription.tier != "free",
                Subscription.status.in_(("active", "past_due")),
            )
        )
        paid_workspace_ids = set(paid_result.all())

    stages = [
        ("account_created", account_ids),
        ("workspace_created", workspace_owner_ids),
        ("profile_completed", _owners_for_workspaces(owner_by_workspace, profile_ids)),
        ("first_document_created", _owners_for_workspaces(owner_by_workspace, created_ids)),
        ("first_document_dispatched", _owners_for_workspaces(owner_by_workspace, dispatched_ids)),
        ("first_payment_confirmed", _owners_for_workspaces(owner_by_workspace, confirmed_ids)),
        ("paid_subscription", _owners_for_workspaces(owner_by_workspace, paid_workspace_ids)),
    ]

    previous_count: int | None = None
    stage_results = []

    for key, stage_accounts in stages:
        count = len(stage_accounts)

        stage_results.append({
            "key": key,
            "count": count,
            "conversion_rate": _rate(count, len(account_ids)),
            "previous_stage_rate": (
                _rate(count, previous_count)
                if previous_count is not None
                else 100.0 if account_ids else 0.0
            ),
        })

        previous_count = count

    return {
        "cohort_size": len(account_ids),
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

    account_ids = await _account_cohort_ids(
        db,
        workspace_ids=workspace_ids,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    windows = list(COHORT_WINDOWS)

    if not account_ids:
        return {
            "measurement_unit": "accounts",
            "windows": windows,
            "items": [],
        }

    start, end = _date_bounds(from_date, to_date)

    user_stmt = select(User.id, User.created_at).where(
        User.id.in_(account_ids)
    )

    if start:
        user_stmt = user_stmt.where(User.created_at >= start)

    if end:
        user_stmt = user_stmt.where(User.created_at < end)

    user_result = await db.execute(user_stmt)

    users = {
        user_id: _normalise_datetime(created_at)
        for user_id, created_at in user_result.all()
    }

    owner_by_workspace = await _workspace_owner_map(db, workspace_ids)

    milestone_names = (
        "document.first_dispatched",
        "payment.first_confirmed",
    )

    event_result = (
        await db.execute(
            select(
                ProductEvent.workspace_id,
                ProductEvent.event_name,
                ProductEvent.occurred_at,
            ).where(
                ProductEvent.workspace_id.in_(workspace_ids),
                ProductEvent.event_name.in_(milestone_names),
            )
        )
        if workspace_ids else None
    )

    events_by_owner: dict[str, list[tuple[str, datetime]]] = defaultdict(list)

    if event_result:
        for workspace_id, event_name, occurred_at in event_result.all():
            owner_id = owner_by_workspace.get(workspace_id)

            if owner_id:
                events_by_owner[owner_id].append(
                    (event_name, _normalise_datetime(occurred_at))
                )

    now = datetime.now(UTC)
    cohorts: dict[str, list[str]] = defaultdict(list)

    for user_id, created_at in users.items():
        cohorts[created_at.strftime("%Y-%m")].append(user_id)

    items = []

    for month in sorted(cohorts):
        cohort_users = cohorts[month]

        counts = {
            window: {
                "eligible": 0,
                "initially_activated": 0,
                "commercially_activated": 0,
            }
            for window in COHORT_WINDOWS
        }

        for user_id in cohort_users:
            signup_at = users[user_id]
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

        cohort_windows = {}

        for window_name, values in counts.items():
            eligible = values["eligible"]

            cohort_windows[window_name] = {
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
            "windows": cohort_windows,
        })

    return {
        "measurement_unit": "accounts",
        "windows": windows,
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

    # This segment means: has at least one currently-draft document.
    #
    # Historical dispatches must not exclude a workspace: a workspace
    # may have dispatched an earlier document and subsequently created
    # another draft that has not yet been dispatched.
    drafts_not_dispatched = set(drafts_result.all())

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
        "drafts_not_dispatched": drafts_not_dispatched,
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
        created_at = _normalise_datetime(created_at)

        items.append({
            "workspace_id": workspace_id,
            "business_name": business_name,
            "country": country_code,
            "onboarding_completed": onboarding_completed,
            "created_at": created_at,
            "workspace_age_days": max(0, (now - created_at).days),
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
    # Do not apply signup-date filters here. The billing date range
    # means checkout creation date, not account creation date.
    workspace_ids = await _workspace_scope(
        db,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
    )

    if not workspace_ids:
        return {
            "checkout_count": 0,
            "successful_checkouts": 0,
            "failed_checkouts": 0,
            "pending_checkouts": 0,
            "revenue_by_currency": [],
            "checkout_breakdown": [],
            "currency_note": (
                "Revenue is grouped by currency. Different currencies "
                "must not be added together."
            ),
        }

    start, end = _date_bounds(from_date, to_date)

    stmt = select(
        BillingCheckout.currency,
        BillingCheckout.purchase_type,
        BillingCheckout.status,
        func.count(BillingCheckout.id),
        func.coalesce(func.sum(BillingCheckout.amount_minor), 0),
    ).where(
        BillingCheckout.workspace_id.in_(workspace_ids)
    )

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
            "Revenue is grouped by currency. Different currencies "
            "must not be added together."
        ),
    }

async def get_events(
    db: AsyncSession,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    event_name: str | None = None,
    event_source: str | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    limit: int = 50,
    offset: int = 0,
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
            "total": 0,
            "limit": limit,
            "offset": offset,
            "items": [],
        }

    start, end = _date_bounds(from_date, to_date)

    stmt = select(ProductEvent).where(
        ProductEvent.workspace_id.in_(workspace_ids)
    )

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
