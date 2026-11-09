"""Persistence operations for in-app notifications."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notifications.models import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(
        self,
        notification: Notification,
    ) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def list_for_recipient(
        self,
        user_id: str,
        workspace_id: str,
        *,
        unread_only: bool,
        limit: int,
    ) -> list[Notification]:
        stmt = select(Notification).where(
            Notification.recipient_user_id == user_id,
            Notification.workspace_id == workspace_id,
        )

        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))

        result = await self.db.execute(
            stmt.order_by(Notification.created_at.desc()).limit(limit)
        )

        return list(result.scalars().all())

    async def unread_count(
        self,
        user_id: str,
        workspace_id: str,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == user_id,
                Notification.workspace_id == workspace_id,
                Notification.read_at.is_(None),
            )
        )

        return int(result.scalar_one() or 0)

    async def get_for_recipient(
        self,
        notification_id: str,
        user_id: str,
        *,
        for_update: bool = False,
    ) -> Notification | None:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user_id,
        )

        if for_update:
            stmt = stmt.with_for_update()

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_all_read(
        self,
        user_id: str,
        workspace_id: str,
        read_at: datetime,
    ) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.recipient_user_id == user_id,
                Notification.workspace_id == workspace_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=read_at)
        )

        return int(result.rowcount or 0)