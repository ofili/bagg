"""Persistence boundary for quote aggregates and public quote access."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clients.models import Client
from app.domains.quotes.models import Quote, QuoteComment, QuoteLineItem, QuoteRevision
from app.domains.workspaces.models import Workspace


class QuoteRepository:
    SORT_COLUMNS = {
        "sequence_number": Quote.sequence_number,
        "issue_date": Quote.issue_date,
        "expires_at": Quote.expires_at,
        "total_minor": Quote.total_minor,
        "status": Quote.status,
        "created_at": Quote.created_at,
    }

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, workspace_id: str, quote_id: str) -> Quote | None:
        result = await self.db.execute(
            select(Quote).where(
                Quote.id == quote_id,
                Quote.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_for_update(self, workspace_id: str, quote_id: str) -> Quote | None:
        result = await self.db.execute(
            select(Quote)
            .where(Quote.id == quote_id, Quote.workspace_id == workspace_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_client(self, workspace_id: str, client_id: str) -> Client | None:
        result = await self.db.execute(
            select(Client).where(
                Client.id == client_id,
                Client.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_page(
        self,
        workspace_id: str,
        *,
        client_id: str | None = None,
        status_filter: str | None = None,
        currency: str | None = None,
        search: str | None = None,
        sort_by: str = "sequence_number",
        sort_order: str = "desc",
        page: int = 1,
        per_page: int = 20,
        today: date | None = None,
    ) -> tuple[list[Quote], int]:
        conditions: list[Any] = [Quote.workspace_id == workspace_id]
        if client_id:
            conditions.append(Quote.client_id == client_id)
        if currency:
            conditions.append(Quote.currency == currency.upper().strip())
        if status_filter:
            normalized = status_filter.lower().strip()
            if normalized == "expired":
                conditions.append(
                    and_(
                        Quote.expires_at < (today or date.today()),
                        Quote.status.notin_(["accepted", "converted"]),
                    )
                )
            else:
                conditions.append(Quote.status == normalized)
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                or_(Quote.quote_number.ilike(term), Client.name.ilike(term))
            )

        base = (
            select(Quote)
            .outerjoin(Client, Client.id == Quote.client_id)
            .where(and_(*conditions))
        )
        count = (
            select(func.count())
            .select_from(Quote)
            .outerjoin(Client, Client.id == Quote.client_id)
            .where(and_(*conditions))
        )
        total = (await self.db.execute(count)).scalar_one()
        sort_column = self.SORT_COLUMNS.get(sort_by, Quote.sequence_number)
        ordering = [asc(sort_column) if sort_order == "asc" else desc(sort_column)]
        if sort_by != "created_at":
            ordering.append(desc(Quote.created_at))
        result = await self.db.execute(
            base.order_by(*ordering).offset((page - 1) * per_page).limit(per_page)
        )
        return list(result.scalars().all()), total

    async def get_public_for_update(
        self, token: str
    ) -> tuple[Quote, str | None, Workspace] | None:
        result = await self.db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
            .with_for_update(of=Quote)
            .execution_options(populate_existing=True)
        )
        row = result.first()
        return (row[0], row[1], row[2]) if row else None

    async def get_public(
        self, token: str
    ) -> tuple[Quote, str | None, Workspace] | None:
        result = await self.db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
        row = result.first()
        return (row[0], row[1], row[2]) if row else None

    async def get_public_with_workspace(
        self, token: str
    ) -> tuple[Quote, Workspace] | None:
        result = await self.db.execute(
            select(Quote, Workspace)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
        row = result.first()
        return (row[0], row[1]) if row else None

    async def get_with_client(
        self, workspace_id: str, quote_id: str
    ) -> tuple[Quote, Client] | None:
        result = await self.db.execute(
            select(Quote, Client)
            .join(Client, Quote.client_id == Client.id)
            .where(Quote.id == quote_id, Quote.workspace_id == workspace_id)
        )
        row = result.first()
        return (row[0], row[1]) if row else None

    async def list_revisions(self, quote_id: str) -> list[QuoteRevision]:
        result = await self.db.execute(
            select(QuoteRevision)
            .where(QuoteRevision.quote_id == quote_id)
            .order_by(QuoteRevision.version.desc())
        )
        return list(result.scalars().all())

    async def list_comments(self, quote_id: str) -> list[QuoteComment]:
        result = await self.db.execute(
            select(QuoteComment)
            .where(QuoteComment.quote_id == quote_id)
            .order_by(QuoteComment.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_line_item(
        self, quote_id: str, line_item_id: str
    ) -> QuoteLineItem | None:
        result = await self.db.execute(
            select(QuoteLineItem).where(
                QuoteLineItem.id == line_item_id,
                QuoteLineItem.quote_id == quote_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_workspace_for_update(self, workspace_id: str) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.id == workspace_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_owner_email(self, workspace: Workspace) -> str | None:
        if not workspace.owner_id:
            return None
        from app.domains.auth.models import User

        result = await self.db.execute(
            select(User.email).where(User.id == workspace.owner_id)
        )
        return result.scalar_one_or_none()

    def add(self, instance: Any) -> None:
        self.db.add(instance)

    def add_all(self, instances: list[Any]) -> None:
        self.db.add_all(instances)

    async def flush(self) -> None:
        await self.db.flush()

    async def refresh(self, instance: Any) -> None:
        await self.db.refresh(instance)
