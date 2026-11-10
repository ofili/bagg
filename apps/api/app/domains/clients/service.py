"""Client/contact use cases.

All SQL construction is delegated to ClientRepository.
The service owns business invariants and transaction boundaries.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clients.models import Client, Contact
from app.domains.clients.repository import ClientRepository
from app.domains.workspaces.models import Workspace


class ClientNotFoundError(Exception):
    pass


class ContactNotFoundError(Exception):
    pass


class BusinessContactInvariantError(Exception):
    pass


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClientRepository(db)

    async def list_clients(
        self,
        workspace_id: str,
        *,
        query: str | None = None,
        currency: str | None = None,
    ) -> list[Client]:
        return await self.repo.list_clients(
            workspace_id,
            query=query,
            currency=currency,
        )

    async def get_client(
        self,
        workspace_id: str,
        client_id: str,
    ) -> Client:
        client = await self.repo.get_client(workspace_id, client_id)

        if client is None:
            raise ClientNotFoundError

        return client

    async def create_client(
        self,
        workspace: Workspace,
        payload,
    ) -> Client:
        if payload.client_type == "BUSINESS" and not payload.contacts:
            raise BusinessContactInvariantError(
                "A business client must have at least one contact."
            )

        client = Client(
            workspace_id=workspace.id,
            name=payload.name,
            client_type=payload.client_type,
            email=payload.email,
            phone=payload.phone,
            address=payload.address,
            country=payload.country or workspace.country,
            preferred_currency=payload.preferred_currency,
            default_payment_terms_days=payload.default_payment_terms_days,
            tax_id=payload.tax_id,
            notes=payload.notes,
        )

        try:
            await self.repo.add(client)

            for index, item in enumerate(payload.contacts):
                values = item.model_dump()
                primary = bool(values.pop("is_primary", False)) or index == 0

                await self.repo.add(
                    Contact(
                        workspace_id=workspace.id,
                        client_id=client.id,
                        **values,
                        is_primary=int(primary),
                    )
                )

            await self.db.commit()

            # Re-read with contacts eager-loaded. The router serializes the
            # relationship, which cannot lazy-load from async context.
            created = await self.repo.get_client(workspace.id, client.id)

            if created is None:
                raise ClientNotFoundError

            return created

        except Exception:
            await self.db.rollback()
            raise

    async def update_client(
        self,
        workspace_id: str,
        client_id: str,
        payload,
    ) -> Client:
        client = await self.repo.get_client(
            workspace_id,
            client_id,
            for_update=True,
        )

        if client is None:
            raise ClientNotFoundError

        values = payload.model_dump(exclude_unset=True)

        try:
            for field, value in values.items():
                if value is not None or field in {
                    "email",
                    "phone",
                    "address",
                    "country",
                    "tax_id",
                    "notes",
                }:
                    setattr(client, field, value)

            await self.repo.flush()

            if (
                client.client_type == "BUSINESS"
                and await self.repo.count_client_contacts(
                    workspace_id,
                    client_id,
                ) < 1
            ):
                raise BusinessContactInvariantError(
                    "A business client must have at least one contact."
                )

            await self.db.commit()

            # Re-read with contacts eager-loaded. The router serializes the
            # relationship, which cannot lazy-load from async context.
            updated = await self.repo.get_client(workspace_id, client_id)

            if updated is None:
                raise ClientNotFoundError

            return updated

        except Exception:
            await self.db.rollback()
            raise

    async def delete_client(
        self,
        workspace_id: str,
        client_id: str,
    ) -> None:
        client = await self.repo.get_client(
            workspace_id,
            client_id,
            for_update=True,
        )

        if client is None:
            raise ClientNotFoundError

        try:
            await self.repo.delete(client)
            await self.db.commit()

        except Exception:
            await self.db.rollback()
            raise

    async def list_contacts(
        self,
        workspace_id: str,
        *,
        query: str | None = None,
        client_id: str | None = None,
    ) -> list[Contact]:
        if client_id:
            client = await self.repo.get_client(workspace_id, client_id)

            if client is None:
                raise ClientNotFoundError

        return await self.repo.list_contacts(
            workspace_id,
            query=query,
            client_id=client_id,
        )

    async def create_contact(
        self,
        workspace_id: str,
        payload,
    ) -> Contact:
        client = await self.repo.get_client(
            workspace_id,
            payload.client_id,
            for_update=True,
        )

        if client is None:
            raise ClientNotFoundError

        values = payload.model_dump(exclude={"client_id"})

        try:
            count = await self.repo.count_client_contacts(
                workspace_id,
                client.id,
            )

            values["is_primary"] = int(
                bool(values.get("is_primary")) or count == 0
            )

            contact = Contact(
                workspace_id=workspace_id,
                client_id=client.id,
                **values,
            )

            await self.repo.add(contact)
            await self.db.commit()
            await self.repo.refresh(contact)

            return contact

        except Exception:
            await self.db.rollback()
            raise

    async def update_contact(
        self,
        workspace_id: str,
        contact_id: str,
        payload,
    ) -> Contact:
        contact = await self.repo.get_contact(
            workspace_id,
            contact_id,
            for_update=True,
        )

        if contact is None:
            raise ContactNotFoundError

        values = payload.model_dump(exclude_unset=True)

        try:
            if values.get("is_primary") is True:
                contacts = await self.repo.list_client_contacts(
                    workspace_id,
                    contact.client_id,
                )

                for item in contacts:
                    item.is_primary = int(item.id == contact.id)

            for field, value in values.items():
                if field == "is_primary":
                    contact.is_primary = int(bool(value))
                elif value is not None or field in {
                    "email",
                    "phone",
                    "job_title",
                    "notes",
                }:
                    setattr(contact, field, value)

            await self.db.commit()
            await self.repo.refresh(contact)

            return contact

        except Exception:
            await self.db.rollback()
            raise

    async def delete_contact(
        self,
        workspace_id: str,
        contact_id: str,
    ) -> None:
        contact = await self.repo.get_contact(
            workspace_id,
            contact_id,
            for_update=True,
        )

        if contact is None:
            raise ContactNotFoundError

        try:
            client = await self.repo.get_client(
                workspace_id,
                contact.client_id,
                for_update=True,
            )

            if client is None:
                raise ClientNotFoundError

            if (
                client.client_type == "BUSINESS"
                and await self.repo.count_client_contacts(
                    workspace_id,
                    client.id,
                ) <= 1
            ):
                raise BusinessContactInvariantError(
                    "This is the business's last contact. "
                    "Add another contact before deleting this one."
                )

            await self.repo.delete(contact)
            await self.db.commit()

        except Exception:
            await self.db.rollback()
            raise