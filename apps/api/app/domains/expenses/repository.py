from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_token
from app.domains.expenses.models import Expense


class ExpenseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def add(self, expense: Expense) -> None:
        self.db.add(expense)

    async def get_by_id(self, workspace_id: str, expense_id: str) -> Optional[Expense]:
        query = select(Expense).where(
            Expense.workspace_id == workspace_id,
            Expense.id == expense_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_for_update_by_ids(
        self, workspace_id: str, expense_ids: List[str]
    ) -> List[Expense]:
        query = (
            select(Expense)
            .where(
                Expense.workspace_id == workspace_id,
                Expense.id.in_(expense_ids),
            )
            .with_for_update()
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_approval_token(self, token: str, for_update: bool = False) -> Optional[Expense]:
        token_hash = hash_token(token)
        query = select(Expense).where(
            Expense.approval_token_hash == token_hash
        )
        if for_update:
            query = query.with_for_update()
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_engagement(
        self,
        workspace_id: str,
        engagement_id: str,
        include_non_billable: bool = True,
    ) -> List[Expense]:
        query = select(Expense).where(
            Expense.workspace_id == workspace_id,
            Expense.engagement_id == engagement_id,
        )
        if not include_non_billable:
            query = query.where(Expense.billable == True)
        query = query.order_by(Expense.expense_date.desc(), Expense.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def sum_billable_expenses(
        self,
        workspace_id: str,
        engagement_id: str,
        exclude_expense_id: Optional[str] = None,
    ) -> int:
        query = select(func.coalesce(func.sum(Expense.amount_minor), 0)).where(
            Expense.workspace_id == workspace_id,
            Expense.engagement_id == engagement_id,
            Expense.billable == True,
            Expense.approval_status != "declined",
        )
        if exclude_expense_id:
            query = query.where(Expense.id != exclude_expense_id)
        result = await self.db.execute(query)
        return int(result.scalar_one() or 0)

    async def mark_invoiced_by_invoice_id(self, invoice_id: str, now: datetime) -> None:
        stmt = (
            update(Expense)
            .where(
                Expense.invoice_id == invoice_id,
                Expense.invoicing_status == "drafted",
            )
            .values(invoicing_status="invoiced", invoiced_at=now)
        )
        await self.db.execute(stmt)

    async def mark_reimbursed_by_invoice_id(self, invoice_id: str, now: datetime) -> None:
        stmt = (
            update(Expense)
            .where(
                Expense.invoice_id == invoice_id,
                Expense.reimbursement_status == "unreimbursed",
            )
            .values(reimbursement_status="reimbursed", reimbursed_at=now)
        )
        await self.db.execute(stmt)

    async def mark_unreimbursed_by_invoice_id(self, invoice_id: str) -> None:
        stmt = (
            update(Expense)
            .where(
                Expense.invoice_id == invoice_id,
                Expense.reimbursement_status == "reimbursed",
            )
            .values(reimbursement_status="unreimbursed", reimbursed_at=None)
        )
        await self.db.execute(stmt)

    async def release_by_invoice_id(self, invoice_id: str) -> None:
        stmt = (
            update(Expense)
            .where(Expense.invoice_id == invoice_id)
            .values(
                invoicing_status="uninvoiced",
                invoice_id=None,
                invoice_item_id=None,
                invoiced_at=None,
            )
        )
        await self.db.execute(stmt)
