"""Persistence boundary for invoice aggregates.

Repositories own SQLAlchemy statements and ORM persistence primitives. They do
not commit transactions or enforce invoice lifecycle rules; application services
own those responsibilities.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.clients.models import Client
from app.domains.invoices.recall_models import InvoiceDocumentVersion
from app.domains.payments.models import InvoicePaymentAttempt
from app.domains.receipts.models import Receipt
from app.domains.invoices.models import (
    Invoice,
    InvoiceLineItem,
    InvoiceRevision,
)
from app.domains.payments.models import PaymentClaim, PaymentProfile
from app.domains.quotes.models import Quote
from app.domains.sharing.models import InvoiceComment
from app.domains.workspaces.models import Workspace


class InvoiceRepository:
    """Workspace-scoped persistence operations for invoices."""

    SORT_COLUMNS = {
        "sequence_number": Invoice.sequence_number,
        "issue_date": Invoice.issue_date,
        "due_date": Invoice.due_date,
        "total_minor": Invoice.total_minor,
        "status": Invoice.status,
        "created_at": Invoice.created_at,
    }

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, workspace_id: str, invoice_id: str) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_for_update(
        self, workspace_id: str, invoice_id: str
    ) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice)
            .where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_with_client(
        self, workspace_id: str, invoice_id: str
    ) -> tuple[Invoice, Client] | None:
        result = await self.db.execute(
            select(Invoice, Client)
            .join(Client, Invoice.client_id == Client.id)
            .where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
        )
        row = result.first()
        return (row[0], row[1]) if row else None

    async def get_with_client_for_update(
        self, workspace_id: str, invoice_id: str
    ) -> tuple[Invoice, Client] | None:
        result = await self.db.execute(
            select(Invoice, Client)
            .join(Client, Invoice.client_id == Client.id)
            .where(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
            .with_for_update(of=Invoice)
            .execution_options(populate_existing=True)
        )
        row = result.first()
        return (row[0], row[1]) if row else None

    async def get_client(self, workspace_id: str, client_id: str) -> Client | None:
        result = await self.db.execute(
            select(Client).where(
                Client.id == client_id,
                Client.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_payment_profile(
        self, workspace_id: str, profile_id: str
    ) -> PaymentProfile | None:
        result = await self.db.execute(
            select(PaymentProfile).where(
                PaymentProfile.id == profile_id,
                PaymentProfile.workspace_id == workspace_id,
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
    ) -> tuple[list[Invoice], int]:
        conditions: list[Any] = [Invoice.workspace_id == workspace_id]
        if client_id:
            conditions.append(Invoice.client_id == client_id)
        if status_filter:
            normalized = status_filter.lower().strip()
            if normalized == "overdue":
                payable = func.coalesce(
                    func.nullif(Invoice.net_payable_minor, 0),
                    Invoice.total_minor,
                )
                conditions.extend(
                    [
                        Invoice.due_date < (today or date.today()),
                        Invoice.status.in_(
                            [
                                "issued",
                                "sent",
                                "viewed",
                                "payment_claimed",
                                "partially_paid",
                            ]
                        ),
                        payable > func.coalesce(Invoice.amount_paid_minor, 0),
                    ]
                )
            elif normalized == "void":
                conditions.append(Invoice.status == "cancelled")
            else:
                conditions.append(Invoice.status == normalized)
        if currency:
            conditions.append(Invoice.currency == currency.upper().strip())
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                or_(Invoice.invoice_number.ilike(term), Client.name.ilike(term))
            )

        base = (
            select(Invoice)
            .outerjoin(Client, Client.id == Invoice.client_id)
            .where(and_(*conditions))
        )
        count = (
            select(func.count())
            .select_from(Invoice)
            .outerjoin(Client, Client.id == Invoice.client_id)
            .where(and_(*conditions))
        )
        total = (await self.db.execute(count)).scalar_one()
        sort_column = self.SORT_COLUMNS.get(sort_by, Invoice.sequence_number)
        ordering = [asc(sort_column) if sort_order == "asc" else desc(sort_column)]
        if sort_by != "created_at":
            ordering.append(desc(Invoice.created_at))
        result = await self.db.execute(
            base.order_by(*ordering).offset((page - 1) * per_page).limit(per_page)
        )
        return list(result.scalars().all()), total

    async def list_for_metrics(self, workspace_id: str) -> list[Invoice]:
        result = await self.db.execute(
            select(Invoice).where(Invoice.workspace_id == workspace_id)
        )
        return list(result.scalars().all())

    async def get_paid_totals_by_currency_since(
        self, workspace_id: str, first_day: date
    ) -> dict[str, int]:
        result = await self.db.execute(
            select(
                Receipt.currency, func.coalesce(func.sum(Receipt.amount_paid_minor), 0)
            )
            .where(
                Receipt.workspace_id == workspace_id,
                Receipt.payment_date >= first_day,
                Receipt.is_verified.is_(True),
            )
            .group_by(Receipt.currency)
        )
        return {currency: int(amount or 0) for currency, amount in result.all()}

    async def list_profile_currencies(self, workspace_id: str) -> list[str]:
        result = await self.db.execute(
            select(PaymentProfile.currency)
            .where(PaymentProfile.workspace_id == workspace_id)
            .distinct()
        )
        return list(result.scalars().all())

    async def list_items(self, invoice_id: str) -> list[InvoiceLineItem]:
        result = await self.db.execute(
            select(InvoiceLineItem)
            .where(InvoiceLineItem.invoice_id == invoice_id)
            .order_by(InvoiceLineItem.position.asc())
        )
        return list(result.scalars().all())

    async def delete_items(self, invoice_id: str) -> None:
        for item in await self.list_items(invoice_id):
            await self.db.delete(item)

    async def get_workspace_for_update(self, workspace_id: str) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.id == workspace_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_quote(self, workspace_id: str, quote_id: str) -> Quote | None:
        result = await self.db.execute(
            select(Quote).where(
                Quote.id == quote_id,
                Quote.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_claim(self, invoice_id: str, claim_id: str) -> PaymentClaim | None:
        result = await self.db.execute(
            select(PaymentClaim).where(
                PaymentClaim.id == claim_id,
                PaymentClaim.invoice_id == invoice_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_claim_for_update(
        self, invoice_id: str, claim_id: str
    ) -> PaymentClaim | None:
        result = await self.db.execute(
            select(PaymentClaim)
            .where(
                PaymentClaim.id == claim_id,
                PaymentClaim.invoice_id == invoice_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def list_claims(self, invoice_id: str) -> list[PaymentClaim]:
        result = await self.db.execute(
            select(PaymentClaim)
            .where(PaymentClaim.invoice_id == invoice_id)
            .order_by(PaymentClaim.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_revisions(
        self, workspace_id: str, invoice_id: str
    ) -> list[InvoiceRevision]:
        result = await self.db.execute(
            select(InvoiceRevision)
            .join(Invoice, InvoiceRevision.invoice_id == Invoice.id)
            .where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
            .order_by(InvoiceRevision.version.desc())
        )
        return list(result.scalars().all())

    async def get_by_quote(self, workspace_id: str, quote_id: str) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).where(
                Invoice.quote_id == quote_id,
                Invoice.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def has_confirmed_receipt(self, invoice_id: str) -> bool:
        result = await self.db.execute(
            select(Receipt.id)
            .where(
                Receipt.invoice_id == invoice_id,
                Receipt.is_verified.is_(True),
                Receipt.amount_paid_minor > 0,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def has_pending_claim(self, invoice_id: str) -> bool:
        result = await self.db.execute(
            select(PaymentClaim.id)
            .where(
                PaymentClaim.invoice_id == invoice_id,
                PaymentClaim.status == "pending",
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_document_version(
        self, invoice_id: str, revision_number: int, *, for_update: bool = False
    ) -> InvoiceDocumentVersion | None:
        statement = select(InvoiceDocumentVersion).where(
            InvoiceDocumentVersion.invoice_id == invoice_id,
            InvoiceDocumentVersion.revision_number == revision_number,
        )
        if for_update:
            statement = statement.with_for_update()
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def has_processing_attempt(self, invoice_id: str) -> bool:
        result = await self.db.execute(
            select(InvoicePaymentAttempt.id)
            .where(
                InvoicePaymentAttempt.invoice_id == invoice_id,
                InvoicePaymentAttempt.status == "processing",
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    def add_document_version(self, version: InvoiceDocumentVersion) -> None:
        self.db.add(version)

    async def list_comments(self, invoice_id: str) -> list[InvoiceComment]:
        result = await self.db.execute(
            select(InvoiceComment)
            .where(InvoiceComment.invoice_id == invoice_id)
            .order_by(InvoiceComment.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_line_item(
        self, invoice_id: str, line_item_id: str
    ) -> InvoiceLineItem | None:
        result = await self.db.execute(
            select(InvoiceLineItem).where(
                InvoiceLineItem.id == line_item_id,
                InvoiceLineItem.invoice_id == invoice_id,
            )
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

    async def delete(self, instance: Any) -> None:
        await self.db.delete(instance)
