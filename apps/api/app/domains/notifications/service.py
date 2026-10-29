from datetime import datetime, timezone
import logging
from typing import List, Optional
from sqlalchemy import select, update, func
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
    ) -> Notification:
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

        res = await db.execute(stmt)
        return list(res.scalars().all())

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
        res = await db.execute(stmt)
        return int(res.scalar_one_or_none() or 0)

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
        res = await db.execute(stmt)
        notification = res.scalar_one_or_none()
        if not notification:
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
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount

    # Backward compatibility helpers
    @staticmethod
    async def notify_invoice_viewed(freelancer_email: str, invoice_number: str):
        logger.info(
            f"Notification: Invoice {invoice_number} was viewed by client. Sending alert to {freelancer_email}"
        )

    @staticmethod
    async def notify_payment_claimed(
        freelancer_email: str, invoice_number: str, amount_formatted: str
    ):
        logger.info(
            f"Notification: Client claimed payment of {amount_formatted} on {invoice_number}. Alerting {freelancer_email}"
        )
