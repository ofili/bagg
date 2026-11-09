"""Notification use cases.

Notification creation can participate in a caller-owned transaction.
Standalone callers retain the existing commit-by-default behaviour.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.notifications.models import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        workspace_id: str,
        recipient_user_id: str,
        type: str,
        title: str,
        body: str,
        document_type: str,
        document_id: str,
        document_number: str,
        link_url: str,
        comment_id: Optional[str] = None,
        *,
        commit: bool = True,
    ) -> Notification:
        """Create a notification.

        Args:
            db: Active database session.
            workspace_id: Owning workspace.
            recipient_user_id: Notification recipient.
            type: Notification event type.
            title: Notification title.
            body: Notification body.
            document_type: Related document type.
            document_id: Related document identifier.
            document_number: Human-readable document number.
            link_url: Internal destination.
            comment_id: Optional related comment.
            commit: When false, leave transaction ownership to the caller.

        The default remains True for compatibility with existing callers.
        """

        notification = Notification(
            workspace_id=workspace_id,
            recipient_user_id=recipient_user_id,
            type=type,
            title=title,
            body=body,
            document_type=document_type,
            document_id=document_id,
            document_number=document_number,
            link_url=link_url,
            comment_id=comment_id,
        )

        db.add(notification)
        await db.flush()

        if commit:
            await db.commit()
            await db.refresh(notification)

        return notification

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        user_id: str,
        workspace_id: str,
        unread_only: bool = False,
        limit: int = 30,
    ) -> List[Notification]:
        stmt = (
            select(Notification)
            .where(
                Notification.recipient_user_id == user_id,
                Notification.workspace_id == workspace_id,
            )
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )

        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))

        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_unread_count(
        db: AsyncSession,
        user_id: str,
        workspace_id: str,
    ) -> int:
        stmt = select(func.count(Notification.id)).where(
            Notification.recipient_user_id == user_id,
            Notification.workspace_id == workspace_id,
            Notification.read_at.is_(None),
        )

        result = await db.execute(stmt)
        return int(result.scalar_one_or_none() or 0)

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id: str,
        user_id: str,
    ) -> Optional[Notification]:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user_id,
        )

        result = await db.execute(stmt)
        notification = result.scalar_one_or_none()

        if notification is None:
            return None

        notification.read_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(notification)

        return notification

    @staticmethod
    async def mark_all_as_read(
        db: AsyncSession,
        user_id: str,
        workspace_id: str,
    ) -> int:
        now = datetime.now(timezone.utc)

        stmt = (
            update(Notification)
            .where(
                Notification.recipient_user_id == user_id,
                Notification.workspace_id == workspace_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=now)
        )

        result = await db.execute(stmt)
        await db.commit()

        return result.rowcount or 0

    # Backward-compatibility helpers.
    @staticmethod
    async def notify_invoice_viewed(
        freelancer_email: str,
        invoice_number: str,
    ):
        logger.info(
            "Notification: Invoice %s was viewed by client. " "Sending alert to %s",
            invoice_number,
            freelancer_email,
        )

    @staticmethod
    async def notify_payment_claimed(
        freelancer_email: str,
        invoice_number: str,
        amount_formatted: str,
    ):
        logger.info(
            "Notification: Client claimed payment of %s on %s. " "Alerting %s",
            amount_formatted,
            invoice_number,
            freelancer_email,
        )
