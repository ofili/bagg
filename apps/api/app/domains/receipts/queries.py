"""Read-side application queries for receipts and client statements."""

from __future__ import annotations
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import NotFoundException
from app.domains.receipts.repository import ReceiptRepository


async def list_receipts(db: AsyncSession, workspace_id: str, **filters):
    return await ReceiptRepository(db).list_page(workspace_id, **filters)


async def get_receipt(db: AsyncSession, workspace_id: str, receipt_id: str):
    row = await ReceiptRepository(db).get_for_workspace(workspace_id, receipt_id)
    if row is None:
        raise NotFoundException(f"Receipt '{receipt_id}' not found")
    return row


async def get_public_receipt(db: AsyncSession, token: str):
    row = await ReceiptRepository(db).get_public(token)
    if row is None:
        raise NotFoundException("Receipt not found or invalid link")
    return row


async def get_statement(
    db: AsyncSession,
    workspace,
    client_id: str,
    currency: str | None,
    date_from: date | None,
    date_to: date | None,
):
    repo = ReceiptRepository(db)
    client = await repo.get_client(workspace.id, client_id)
    if client is None:
        raise NotFoundException(f"Client '{client_id}' not found")
    selected = (
        (currency or client.preferred_currency or workspace.default_currency)
        .upper()
        .strip()
    )
    invoices = await repo.list_statement_invoices(
        workspace.id, client.id, selected, date_to
    )
    receipts = await repo.list_statement_receipts(
        workspace.id, client.id, selected, date_to
    )
    timeline = []
    for inv in invoices:
        billed = (
            inv.net_payable_minor
            if inv.net_payable_minor and inv.net_payable_minor > 0
            else inv.total_minor
        )
        timeline.append(
            {
                "date": inv.issue_date,
                "created_at": inv.created_at,
                "type": "invoice",
                "reference_number": inv.invoice_number,
                "description": f"Invoice {inv.invoice_number} (Due {inv.due_date})",
                "debit_minor": billed,
                "credit_minor": 0,
            }
        )
    for receipt in receipts:
        timeline.append(
            {
                "date": receipt.payment_date,
                "created_at": receipt.created_at,
                "type": "receipt",
                "reference_number": receipt.receipt_number,
                "description": f"Payment Receipt ({receipt.payment_method.replace('_', ' ').title()})",
                "debit_minor": 0,
                "credit_minor": receipt.amount_paid_minor,
            }
        )
    timeline.sort(key=lambda x: (x["date"] or date.min, x["created_at"], x["type"]))
    opening = 0
    period_timeline = []
    for item in timeline:
        if date_from and item["date"] < date_from:
            opening += item["debit_minor"] - item["credit_minor"]
        else:
            period_timeline.append(item)
    from app.domains.receipts.schemas import StatementEntry, ClientStatementResponse

    balance = opening
    invoiced = paid = 0
    entries = []
    for item in period_timeline:
        balance += item["debit_minor"] - item["credit_minor"]
        invoiced += item["debit_minor"]
        paid += item["credit_minor"]
        entries.append(
            StatementEntry(
                date=item["date"],
                type=item["type"],
                reference_number=item["reference_number"],
                description=item["description"],
                debit_minor=item["debit_minor"],
                credit_minor=item["credit_minor"],
                running_balance_minor=balance,
            )
        )
    return ClientStatementResponse(
        client_id=client.id,
        client_name=client.name,
        currency=selected,
        date_from=date_from,
        date_to=date_to,
        opening_balance_minor=opening,
        entries=entries,
        total_invoiced_minor=invoiced,
        total_paid_minor=paid,
        closing_balance_minor=balance,
        business_name=workspace.business_name,
        generated_at=datetime.now(timezone.utc),
    )
