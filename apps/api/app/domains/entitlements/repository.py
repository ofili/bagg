"""Persistence boundary for administrative entitlement overrides."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.entitlements.models import EntitlementOverride


class EntitlementOverrideRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def expire_stale(
        self,
        *,
        workspace_id: str,
        now: datetime,
    ) -> int:
        """Mark elapsed active overrides as expired.

        Call within the caller's transaction, ideally after locking the
        workspace row. No background worker is required for enforcement.
        """
        statement = (
            update(EntitlementOverride)
            .where(
                EntitlementOverride.workspace_id == workspace_id,
                EntitlementOverride.status == "active",
                EntitlementOverride.expires_at <= now,
            )
            .values(
                status="expired",
                updated_at=now,
            )
        )

        result = await self.db.execute(statement)
        return int(result.rowcount or 0)

    async def create(
        self,
        override: EntitlementOverride,
    ) -> EntitlementOverride:
        self.db.add(override)
        await self.db.flush()
        return override

    async def get_for_workspace(
        self,
        *,
        workspace_id: str,
        override_id: str,
        lock: bool = False,
    ) -> EntitlementOverride | None:
        statement = select(EntitlementOverride).where(
            EntitlementOverride.id == override_id,
            EntitlementOverride.workspace_id == workspace_id,
        )

        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )

        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def list_for_workspace(
        self,
        *,
        workspace_id: str,
        status: str | None = None,
        entitlement_key: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[EntitlementOverride]:
        if not 1 <= limit <= 200:
            raise ValueError("limit must be between 1 and 200")

        if offset < 0:
            raise ValueError("offset cannot be negative")

        statement = select(EntitlementOverride).where(
            EntitlementOverride.workspace_id == workspace_id,
        )

        if status is not None:
            statement = statement.where(
                EntitlementOverride.status == status,
            )

        if entitlement_key is not None:
            statement = statement.where(
                EntitlementOverride.entitlement_key == entitlement_key,
            )

        statement = (
            statement.order_by(
                EntitlementOverride.created_at.desc(),
                EntitlementOverride.id.desc(),
            )
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_effective(
        self,
        *,
        workspace_id: str,
        now: datetime,
    ) -> list[EntitlementOverride]:
        """Return overrides effective at this exact point in time."""
        statement = (
            select(EntitlementOverride)
            .where(
                EntitlementOverride.workspace_id == workspace_id,
                EntitlementOverride.status == "active",
                EntitlementOverride.effective_at <= now,
                EntitlementOverride.expires_at > now,
            )
            .order_by(
                EntitlementOverride.entitlement_key,
                EntitlementOverride.created_at.desc(),
            )
        )

        result = await self.db.execute(statement)
        return list(result.scalars().all())
