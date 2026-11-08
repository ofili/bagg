"""Payment-profile application use cases."""

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import NotFoundException
from app.domains.payments.models import PaymentProfile
from app.domains.payments.repository import PaymentRepository


async def list_payment_profiles(
    db: AsyncSession, workspace_id: str, currency: str | None = None
):
    return await PaymentRepository(db).list_profiles(workspace_id, currency)


async def create_payment_profile(db: AsyncSession, workspace_id: str, values: dict):
    repo = PaymentRepository(db)
    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")
    currency = values["currency"].upper().strip()
    existing = await repo.list_currency_profiles(workspace_id, currency)
    is_default = bool(values.get("is_default", True)) or not any(
        p.is_default for p in existing
    )
    if is_default:
        await repo.unset_default_profiles(workspace_id, currency)
    profile = PaymentProfile(
        workspace_id=workspace_id,
        **{**values, "currency": currency, "is_default": is_default}
    )
    repo.add(profile)
    await db.commit()
    await repo.refresh(profile)
    return profile


async def validate_currency_profile(db: AsyncSession, workspace_id: str, currency: str):
    clean = currency.upper().strip()
    profiles = await PaymentRepository(db).list_currency_profiles(workspace_id, clean)
    return profiles[0] if profiles else None


async def update_payment_profile(
    db: AsyncSession, workspace_id: str, profile_id: str, values: dict
):
    repo = PaymentRepository(db)
    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")
    profile = await repo.get_profile(workspace_id, profile_id, lock=True)
    if profile is None:
        raise NotFoundException("Payment profile not found")
    if values.get("is_default") is True:
        await repo.unset_default_profiles(
            workspace_id, profile.currency, exclude_id=profile.id
        )
    elif values.get("is_default") is False and profile.is_default:
        alternatives = [
            p
            for p in await repo.list_currency_profiles(workspace_id, profile.currency)
            if p.id != profile.id
        ]
        if alternatives:
            alternatives[0].is_default = True
    for key, value in values.items():
        if key == "is_default" and value is None:
            continue
        setattr(profile, key, value)
    await db.commit()
    await repo.refresh(profile)
    return profile


async def delete_payment_profile(db: AsyncSession, workspace_id: str, profile_id: str):
    repo = PaymentRepository(db)
    if await repo.lock_workspace(workspace_id) is None:
        raise NotFoundException("Workspace not found")
    profile = await repo.get_profile(workspace_id, profile_id, lock=True)
    if profile is None:
        raise NotFoundException("Payment profile not found")
    if profile.is_default:
        alternatives = [
            p
            for p in await repo.list_currency_profiles(workspace_id, profile.currency)
            if p.id != profile.id
        ]
        if alternatives:
            alternatives[0].is_default = True
    await repo.delete(profile)
    await db.commit()
