"""Persistence boundary for clients and contacts."""
from __future__ import annotations

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.clients.models import Client, Contact
from app.domains.invoices.models import Invoice


class ClientRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_clients(
        self,
        workspace_id: str,
        *,
        query: str | None = None,
        currency: str | None = None,
    ) -> list[Client]:
        stmt = (
            select(Client)
            .options(selectinload(Client.contacts))
            .where(Client.workspace_id == workspace_id)
        )

        if query and query.strip():
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Client.name.ilike(pattern),
                    Client.email.ilike(pattern),
                    Client.phone.ilike(pattern),
                )
            )

        if currency:
            stmt = stmt.where(
                Client.preferred_currency == currency.strip().upper()
            )

        result = await self.db.execute(stmt.order_by(Client.name.asc()))
        return list(result.scalars().all())

    async def get_client(
        self,
        workspace_id: str,
        client_id: str,
        *,
        for_update: bool = False,
    ) -> Client | None:
        stmt = (
            select(Client)
            .options(selectinload(Client.contacts))
            .where(
                Client.workspace_id == workspace_id,
                Client.id == client_id,
            )
        )
        if for_update:
            stmt = stmt.with_for_update()

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_contacts(
        self,
        workspace_id: str,
        *,
        query: str | None = None,
        client_id: str | None = None,
    ) -> list[Contact]:
        stmt = (
            select(Contact)
            .join(Client, Contact.client_id == Client.id)
            .where(
                Contact.workspace_id == workspace_id,
                Client.workspace_id == workspace_id,
            )
        )

        if client_id:
            stmt = stmt.where(Contact.client_id == client_id)

        if query and query.strip():
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Contact.name.ilike(pattern),
                    Contact.email.ilike(pattern),
                    Contact.phone.ilike(pattern),
                    Contact.job_title.ilike(pattern),
                    Client.name.ilike(pattern),
                )
            )

        result = await self.db.execute(
            stmt.order_by(
                Contact.is_primary.desc(),
                Contact.name.asc(),
            )
        )
        return list(result.scalars().all())

    async def get_contact(
        self,
        workspace_id: str,
        contact_id: str,
        *,
        for_update: bool = False,
    ) -> Contact | None:
        stmt = select(Contact).where(
            Contact.workspace_id == workspace_id,
            Contact.id == contact_id,
        )

        if for_update:
            stmt = stmt.with_for_update()

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_client_contacts(
        self,
        workspace_id: str,
        client_id: str,
    ) -> list[Contact]:
        result = await self.db.execute(
            select(Contact)
            .where(
                Contact.workspace_id == workspace_id,
                Contact.client_id == client_id,
            )
            .order_by(
                Contact.is_primary.desc(),
                Contact.name.asc(),
            )
        )
        return list(result.scalars().all())

    async def count_client_contacts(
        self,
        workspace_id: str,
        client_id: str,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Contact.id)).where(
                Contact.workspace_id == workspace_id,
                Contact.client_id == client_id,
            )
        )
        return int(result.scalar_one() or 0)

    async def get_financial_summaries(
        self,
        workspace_id: str,
        client_ids: list[str],
    ) -> dict[str, list[dict]]:
        """Return invoice totals grouped by currency for each client.

        Draft and cancelled invoices are excluded. Amounts remain in
        their original currency; currencies are never added together.
        """
        if not client_ids:
            return {}

        payable = case(
            (
                Invoice.net_payable_minor.is_not(None),
                Invoice.net_payable_minor,
            ),
            else_=Invoice.total_minor,
        )

        paid = func.coalesce(Invoice.amount_paid_minor, 0)

        outstanding = case(
            (payable > paid, payable - paid),
            else_=0,
        )

        result = await self.db.execute(
            select(
                Invoice.client_id,
                Invoice.currency,
                func.count(Invoice.id).label("invoice_count"),
                func.coalesce(func.sum(payable), 0).label(
                    "total_invoiced_minor"
                ),
                func.coalesce(func.sum(paid), 0).label(
                    "total_paid_minor"
                ),
                func.coalesce(func.sum(outstanding), 0).label(
                    "total_outstanding_minor"
                ),
            )
            .where(
                Invoice.workspace_id == workspace_id,
                Invoice.client_id.in_(client_ids),
                Invoice.status.notin_(["draft", "cancelled"]),
            )
            .group_by(Invoice.client_id, Invoice.currency)
        )

        summaries: dict[str, list[dict]] = {}

        for row in result:
            summaries.setdefault(row.client_id, []).append(
                {
                    "currency": row.currency,
                    "invoice_count": int(row.invoice_count or 0),
                    "total_invoiced_minor": int(
                        row.total_invoiced_minor or 0
                    ),
                    "total_paid_minor": int(row.total_paid_minor or 0),
                    "total_outstanding_minor": int(
                        row.total_outstanding_minor or 0
                    ),
                }
            )

        return summaries

    async def get_client_invoice_summaries(
        self,
        workspace_id: str,
        client_id: str,
    ) -> list[dict]:
        """Return non-draft, non-cancelled invoice summaries."""
        result = await self.db.execute(
            select(
                Invoice.id,
                Invoice.invoice_number,
                Invoice.bagg_reference,
                Invoice.currency,
                Invoice.total_minor,
                Invoice.status,
                Invoice.due_date,
            )
            .where(
                Invoice.workspace_id == workspace_id,
                Invoice.client_id == client_id,
                Invoice.status.notin_(["draft", "cancelled"]),
            )
            .order_by(
                Invoice.created_at.desc(),
                Invoice.id.desc(),
            )
        )

        return [
            {
                "id": row.id,
                "invoice_number": row.invoice_number or row.bagg_reference,
                "currency": row.currency,
                "total_minor": int(row.total_minor or 0),
                "status": row.status,
                "due_date": (
                    row.due_date.isoformat()
                    if row.due_date
                    else ""
                ),
            }
            for row in result
        ]

    async def add(self, entity):
        self.db.add(entity)
        await self.db.flush()
        return entity

    async def delete(self, entity) -> None:
        await self.db.delete(entity)

    async def flush(self) -> None:
        await self.db.flush()

    async def refresh(self, entity) -> None:
        await self.db.refresh(entity)