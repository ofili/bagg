"""Payment-profile application use cases."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException, NotFoundException
from app.core.money import CURRENCY_SPECS
from app.domains.audit.service import record_audit_event
from app.domains.payments.models import PaymentProfile
from app.domains.payments.profile_rules import payment_profile_methods
from app.domains.payments.repository import PaymentRepository


def _validated_methods(values: dict) -> list[str]:
    try:
        return payment_profile_methods(values)
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc


def _payment_profile_audit_state(profile: PaymentProfile) -> dict:
    """
    Return an allowlisted, non-sensitive representation of a payment profile.

    Never include account numbers, routing numbers, payment links,
    mobile-money numbers, or freeform instructions in audit snapshots.
    """
    return {
        "currency": profile.currency,
        "is_default": profile.is_default,
        "has_bank_details": bool(
            profile.bank_name or profile.account_name or profile.account_number
        ),
        "has_payment_link": bool(profile.payment_link),
        "has_mobile_money": bool(profile.mobile_money_number),
        "has_instructions": bool(profile.instructions),
    }


async def list_payment_profiles(
    db: AsyncSession,
    workspace_id: str,
    currency: str | None = None,
):
    return await PaymentRepository(db).list_profiles(
        workspace_id,
        currency,
    )


async def get_payment_setup(
    db: AsyncSession,
    workspace_id: str,
) -> dict:
    """
    Return a workspace-scoped payment setup summary.

    A currency is configured only when its default profile is usable.
    Legacy incomplete profiles remain visible in profile_count but do
    not count as completed setup.
    """
    repo = PaymentRepository(db)
    profiles = await repo.list_profiles(workspace_id)

    grouped: dict[str, list[PaymentProfile]] = {
        currency: [] for currency in CURRENCY_SPECS
    }

    for profile in profiles:
        currency = profile.currency.upper().strip()

        if currency in grouped:
            grouped[currency].append(profile)

    currencies = []
    configured_count = 0

    for currency in CURRENCY_SPECS:
        currency_profiles = grouped[currency]

        default_profile = next(
            (profile for profile in currency_profiles if profile.is_default),
            None,
        )

        methods: list[str] = []
        configured = False

        if default_profile is not None:
            try:
                methods = payment_profile_methods(default_profile)
                configured = bool(methods)
            except ValueError:
                configured = False
                methods = []

        if configured:
            configured_count += 1

        currencies.append(
            {
                "currency": currency,
                "profile_count": len(currency_profiles),
                "has_profile": bool(currency_profiles),
                "is_configured": configured,
                "default_profile_id": (
                    default_profile.id
                    if configured and default_profile is not None
                    else None
                ),
                "methods": methods,
            }
        )

    return {
        "currencies": currencies,
        "configured_currency_count": configured_count,
        "supported_currency_count": len(CURRENCY_SPECS),
    }


async def create_payment_profile(
    db: AsyncSession,
    workspace_id: str,
    values: dict,
    actor_user_id: str,
):
    repo = PaymentRepository(db)

    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")

    currency = values["currency"].upper().strip()
    _validated_methods(values)

    existing = await repo.list_currency_profiles(
        workspace_id,
        currency,
    )

    has_default = any(profile.is_default for profile in existing)

    is_default = bool(values.get("is_default", True)) or not has_default

    if is_default:
        await repo.unset_default_profiles(workspace_id, currency)

    profile = PaymentProfile(
        workspace_id=workspace_id,
        **{
            **values,
            "currency": currency,
            "is_default": is_default,
        },
    )

    await repo.add(profile)
    await db.flush()

    await record_audit_event(
        db,
        workspace_id=workspace_id,
        actor_type="user",
        actor_id=actor_user_id,
        action="payment_profile.created",
        entity_type="payment_profile",
        entity_id=profile.id,
        outcome="success",
        after_state=_payment_profile_audit_state(profile),
    )

    await db.commit()
    await repo.refresh(profile)

    return profile


async def validate_currency_profile(
    db: AsyncSession,
    workspace_id: str,
    currency: str,
):
    clean = currency.upper().strip()

    profiles = await PaymentRepository(db).list_currency_profiles(
        workspace_id,
        clean,
    )

    default_profile = next(
        (profile for profile in profiles if profile.is_default),
        None,
    )

    if default_profile is None:
        return None

    try:
        payment_profile_methods(default_profile)
    except ValueError:
        return None

    return default_profile


async def update_payment_profile(
    db: AsyncSession,
    workspace_id: str,
    profile_id: str,
    values: dict,
    actor_user_id: str,
):
    repo = PaymentRepository(db)

    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")

    profile = await repo.get_profile(
        workspace_id,
        profile_id,
        lock=True,
    )

    if profile is None:
        raise NotFoundException("Payment profile not found")

    before_state = _payment_profile_audit_state(profile)

    merged_values = {
        "bank_name": profile.bank_name,
        "account_name": profile.account_name,
        "account_number": profile.account_number,
        "routing_number": profile.routing_number,
        "payment_link": profile.payment_link,
        "mobile_money_number": profile.mobile_money_number,
        "instructions": profile.instructions,
    }
    merged_values.update(
        {key: value for key, value in values.items() if key != "is_default"}
    )

    _validated_methods(merged_values)

    if values.get("is_default") is True:
        await repo.unset_default_profiles(
            workspace_id,
            profile.currency,
            exclude_id=profile.id,
        )

    elif values.get("is_default") is False and profile.is_default:
        alternatives = [
            candidate
            for candidate in await repo.list_currency_profiles(
                workspace_id,
                profile.currency,
            )
            if candidate.id != profile.id
        ]

        if not alternatives:
            raise BadRequestException(
                "A currency with saved payment profiles must retain "
                "a default profile. Add another profile first."
            )

        replacement = None

        for candidate in alternatives:
            try:
                payment_profile_methods(candidate)
                replacement = candidate
                break
            except ValueError:
                continue

        if replacement is None:
            raise BadRequestException(
                "Set up another usable payment profile before changing "
                "the current default."
            )

        replacement.is_default = True

    for key, value in values.items():
        if key == "is_default" and value is None:
            continue

        setattr(profile, key, value)

    await db.flush()

    await record_audit_event(
        db,
        workspace_id=workspace_id,
        actor_type="user",
        actor_id=actor_user_id,
        action="payment_profile.updated",
        entity_type="payment_profile",
        entity_id=profile.id,
        outcome="success",
        before_state=before_state,
        after_state=_payment_profile_audit_state(profile),
        metadata={
            "changed_fields": sorted(values.keys()),
        },
    )

    await db.commit()
    await repo.refresh(profile)

    return profile


async def delete_payment_profile(
    db: AsyncSession,
    workspace_id: str,
    profile_id: str,
    actor_user_id: str,
):
    repo = PaymentRepository(db)

    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")

    profile = await repo.get_profile(
        workspace_id,
        profile_id,
        lock=True,
    )

    if profile is None:
        raise NotFoundException("Payment profile not found")

    before_state = _payment_profile_audit_state(profile)

    if profile.is_default:
        alternatives = [
            candidate
            for candidate in await repo.list_currency_profiles(
                workspace_id,
                profile.currency,
            )
            if candidate.id != profile.id
        ]

        if alternatives:
            replacement = None

            for candidate in alternatives:
                try:
                    payment_profile_methods(candidate)
                    replacement = candidate
                    break
                except ValueError:
                    continue

            if replacement is None:
                raise BadRequestException(
                    "Set up another usable payment profile before "
                    "deleting the current default."
                )

            replacement.is_default = True

    await repo.delete(profile)

    await record_audit_event(
        db,
        workspace_id=workspace_id,
        actor_type="user",
        actor_id=actor_user_id,
        action="payment_profile.deleted",
        entity_type="payment_profile",
        entity_id=profile.id,
        outcome="success",
        before_state=before_state,
    )

    await db.commit()
