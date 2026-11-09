"""Persistence boundary for clients and contacts."""
from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clients.models import Client, Contact


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
        stmt = select(Client).where(Client.workspace_id == workspace_id)

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
        stmt = select(Client).where(
            Client.workspace_id == workspace_id,
            Client.id == client_id,
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