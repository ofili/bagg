"""Workspace-scoped persistence operations for receipts and statements."""

from __future__ import annotations
from datetime import date
from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.receipts.models import Receipt
from app.domains.invoices.models import Invoice
from app.domains.clients.models import Client
from app.domains.workspaces.models import Workspace


class ReceiptRepository:
    SORT_COLUMNS = {
        "created_at": Receipt.created_at,
        "amount_minor": Receipt.amount_paid_minor,
        "receipt_number": Receipt.receipt_number,
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_invoice_for_workspace(self, workspace_id: str, invoice_id: str):
        result = await self.db.execute(
            select(Invoice, Client)
            .join(Client, Invoice.client_id == Client.id)
            .where(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
        )
        row = result.first()
        return (row[0], row[1]) if row else None

    async def get_for_workspace(self, workspace_id: str, receipt_id: str):
        result = await self.db.execute(
            select(Receipt, Client.name, Client.phone, Invoice.invoice_number)
            .join(Client, Receipt.client_id == Client.id, isouter=True)
            .join(Invoice, Receipt.invoice_id == Invoice.id)
            .where(Receipt.id == receipt_id, Receipt.workspace_id == workspace_id)
        )
        row = result.first()
        return row if row else None

    async def list_page(
        self,
        workspace_id: str,
        *,
        page: int,
        per_page: int,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        client_id: str | None = None,
        invoice_id: str | None = None,
        currency: str | None = None,
    ):
        conditions = [Receipt.workspace_id == workspace_id]
        if client_id:
            conditions.append(Receipt.client_id == client_id)
        if invoice_id:
            conditions.append(Receipt.invoice_id == invoice_id)
        if currency:
            conditions.append(Receipt.currency == currency.upper().strip())
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Receipt.receipt_number.ilike(term),
                    Invoice.invoice_number.ilike(term),
                    Client.name.ilike(term),
                )
            )
        joins = (
            select(Receipt)
            .join(Client, Receipt.client_id == Client.id, isouter=True)
            .join(Invoice, Receipt.invoice_id == Invoice.id)
        )
        count = (
            select(func.count(Receipt.id))
            .join(Client, Receipt.client_id == Client.id, isouter=True)
            .join(Invoice, Receipt.invoice_id == Invoice.id)
            .where(and_(*conditions))
        )
        total = int((await self.db.execute(count)).scalar_one())
        col = self.SORT_COLUMNS.get(sort_by, Receipt.created_at)
        order = asc(col) if sort_order.lower() == "asc" else desc(col)
        stmt = (
            select(Receipt, Client.name, Client.phone, Invoice.invoice_number)
            .join(Client, Receipt.client_id == Client.id, isouter=True)
            .join(Invoice, Receipt.invoice_id == Invoice.id)
            .where(and_(*conditions))
            .order_by(order, desc(Receipt.created_at))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        return list((await self.db.execute(stmt)).all()), total

    async def get_public(self, token: str):
        stmt = (
            select(Receipt, Client.name, Workspace, Invoice.invoice_number)
            .join(Client, Receipt.client_id == Client.id, isouter=True)
            .join(Workspace, Receipt.workspace_id == Workspace.id)
            .join(Invoice, Receipt.invoice_id == Invoice.id)
            .where(Receipt.share_token == token)
        )
        row = (await self.db.execute(stmt)).first()
        return row if row else None

    async def get_client(self, workspace_id: str, client_id: str):
        return (
            await self.db.execute(
                select(Client).where(
                    Client.id == client_id, Client.workspace_id == workspace_id
                )
            )
        ).scalar_one_or_none()

    async def list_statement_invoices(
        self, workspace_id: str, client_id: str, currency: str, date_to: date | None
    ):
        stmt = select(Invoice).where(
            Invoice.workspace_id == workspace_id,
            Invoice.client_id == client_id,
            Invoice.currency == currency,
            Invoice.status.in_(
                [
                    "issued",
                    "sent",
                    "viewed",
                    "payment_claimed",
                    "partially_paid",
                    "paid",
                ]
            ),
        )
        stmt = stmt.where(Invoice.issue_date.is_not(None))
        if date_to:
            stmt = stmt.where(Invoice.issue_date <= date_to)
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_statement_receipts(
        self, workspace_id: str, client_id: str, currency: str, date_to: date | None
    ):
        stmt = select(Receipt).where(
            Receipt.workspace_id == workspace_id,
            Receipt.client_id == client_id,
            Receipt.currency == currency,
        )
        if date_to:
            stmt = stmt.where(Receipt.payment_date <= date_to)
        return list((await self.db.execute(stmt)).scalars().all())

    async def lock_invoice(self, workspace_id: str, invoice_id: str):
        return (
            await self.db.execute(
                select(Invoice)
                .where(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
        ).scalar_one_or_none()

    async def lock_workspace(self, workspace_id: str):
        return (
            await self.db.execute(
                select(Workspace)
                .where(Workspace.id == workspace_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
        ).scalar_one_or_none()

    async def find_provider_receipt(self, workspace_id: str, provider_reference: str):
        return (
            await self.db.execute(
                select(Receipt)
                .where(
                    Receipt.workspace_id == workspace_id,
                    Receipt.provider_reference == provider_reference,
                )
                .with_for_update()
            )
        ).scalar_one_or_none()

    async def add(self, entity):
        self.db.add(entity)

    async def flush(self):
        await self.db.flush()
