"""Persistence operations for public invoice sharing."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.clients.models import Client
from app.domains.compliance.models import AbuseReport
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.notifications.models import Notification
from app.domains.payments.models import PaymentClaim, PaymentProfile
from app.domains.receipts.models import Receipt
from app.domains.sharing.models import InvoiceComment
from app.domains.workspaces.models import Workspace


class SharingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_public_invoice_context(
        self,
        token: str,
        *,
        for_update: bool = False,
    ) -> Optional[tuple[Invoice, Optional[str], Workspace]]:
        stmt = (
            select(Invoice, Client.name, Workspace)
            .join(Client, Invoice.client_id == Client.id, isouter=True)
            .join(Workspace, Invoice.workspace_id == Workspace.id)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.client),
            )
            .where(Invoice.share_token == token)
        )

        if for_update:
            stmt = stmt.with_for_update(of=Invoice)

        result = await self.db.execute(stmt)
        row = result.first()

        return (row[0], row[1], row[2]) if row else None

    async def get_invoice_by_token(
        self,
        token: str,
        *,
        for_update: bool = False,
    ) -> Optional[Invoice]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.client),
            )
            .where(Invoice.share_token == token)
        )

        if for_update:
            stmt = stmt.with_for_update()

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_workspace(
        self,
        workspace_id: str,
    ) -> Optional[Workspace]:
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def get_default_payment_profile(
        self,
        workspace_id: str,
        currency: str,
    ) -> Optional[PaymentProfile]:
        stmt = (
            select(PaymentProfile)
            .where(
                PaymentProfile.workspace_id == workspace_id,
                PaymentProfile.currency == currency,
                PaymentProfile.is_default.is_(True),
            )
            .limit(1)
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_comments(
        self,
        invoice_id: str,
    ) -> list[InvoiceComment]:
        stmt = (
            select(InvoiceComment)
            .where(InvoiceComment.invoice_id == invoice_id)
            .order_by(InvoiceComment.created_at.asc())
        )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_claim(
        self,
        invoice_id: str,
    ) -> Optional[PaymentClaim]:
        stmt = (
            select(PaymentClaim)
            .where(PaymentClaim.invoice_id == invoice_id)
            .order_by(PaymentClaim.created_at.desc())
            .limit(1)
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest_receipt(
        self,
        invoice_id: str,
    ) -> Optional[Receipt]:
        stmt = (
            select(Receipt)
            .where(Receipt.invoice_id == invoice_id)
            .order_by(Receipt.created_at.desc())
            .limit(1)
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pending_claims(
        self,
        invoice_id: str,
    ) -> list[PaymentClaim]:
        stmt = select(PaymentClaim).where(
            PaymentClaim.invoice_id == invoice_id,
            PaymentClaim.status == "pending",
        )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def add_claim(self, claim: PaymentClaim) -> None:
        self.db.add(claim)

    async def add_comment(self, comment: InvoiceComment) -> None:
        self.db.add(comment)

    async def line_item_belongs_to_invoice(
        self,
        line_item_id: str,
        invoice_id: str,
    ) -> bool:
        result = await self.db.execute(
            select(InvoiceLineItem.id).where(
                InvoiceLineItem.id == line_item_id,
                InvoiceLineItem.invoice_id == invoice_id,
            )
        )

        return result.scalar_one_or_none() is not None

    async def add_notification(
        self,
        *,
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

        self.db.add(notification)
        return notification

    async def add_abuse_report(self, report: AbuseReport) -> None:
        self.db.add(report)

    async def flush(self) -> None:
        await self.db.flush()

    async def commit(self) -> None:
        await self.db.commit()

    async def refresh(self, instance) -> None:
        await self.db.refresh(instance)

    async def rollback(self) -> None:
        await self.db.rollback()
