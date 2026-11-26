from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audit.models import AuditEvent


class AuditRepository:
    """Workspace-scoped queries for business audit events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_events(
        self,
        *,
        workspace_id: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        action: str | None = None,
        occurred_after: datetime | None = None,
        occurred_before: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditEvent]:
        if not workspace_id:
            raise ValueError("workspace_id is required")

        if limit < 1 or limit > 200:
            raise ValueError("limit must be between 1 and 200")

        if offset < 0:
            raise ValueError("offset cannot be negative")

        statement = select(AuditEvent).where(
            AuditEvent.workspace_id == workspace_id,
        )

        if entity_type is not None:
            statement = statement.where(
                AuditEvent.entity_type == entity_type,
            )

        if entity_id is not None:
            statement = statement.where(
                AuditEvent.entity_id == entity_id,
            )

        if action is not None:
            statement = statement.where(
                AuditEvent.action == action,
            )

        if occurred_after is not None:
            statement = statement.where(
                AuditEvent.occurred_at >= occurred_after,
            )

        if occurred_before is not None:
            statement = statement.where(
                AuditEvent.occurred_at <= occurred_before,
            )

        statement = (
            statement.order_by(
                AuditEvent.occurred_at.desc(),
                AuditEvent.id.desc(),
            )
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(statement)
        return list(result.scalars().all())
