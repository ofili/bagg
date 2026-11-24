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

    if row is None or not row[0].is_verified:
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
    reversals = await repo.list_statement_reversals(
        workspace.id, client.id, selected, date_to
    )

    timeline = []

    for inv in invoices:
        net_payable_minor = inv.net_payable_minor
        billed = (
            int(net_payable_minor)
            if net_payable_minor is not None and int(net_payable_minor) > 0
            else inv.total_minor
        )

        timeline.append(
            {
                "date": inv.issue_date,
                "created_at": inv.created_at,
                "type": "invoice",
                "reference_number": inv.invoice_number,
                "description": (f"Invoice {inv.invoice_number} (Due {inv.due_date})"),
                "debit_minor": billed,
                "credit_minor": 0,
            }
        )

    timeline.extend(
        {
            "date": receipt.payment_date,
            "created_at": receipt.created_at,
            "type": "receipt",
            "reference_number": receipt.receipt_number,
            "description": (
                "Payment Receipt "
                f"({receipt.payment_method.replace('_', ' ').title()})"
            ),
            "debit_minor": 0,
            "credit_minor": receipt.amount_paid_minor,
        }
        for receipt in receipts
    )

    timeline.extend(
        {
            "date": reversal.posted_at.date(),
            "created_at": reversal.created_at,
            "type": "reversal",
            "reference_number": reversal.id,
            "description": (
                f"Receipt reversal ({reversal.reversal_type.replace('_', ' ')})"
            ),
            "debit_minor": reversal.amount_minor,
            "credit_minor": 0,
        }
        for reversal in reversals
    )

    timeline.sort(
        key=lambda item: (
            item["date"] or date.min,
            item["created_at"],
            item["type"],
        )
    )

    # Transactions before date_from form the opening balance.
    opening = 0
    period_timeline = []

    for item in timeline:
        if date_from and item["date"] < date_from:
            opening += item["debit_minor"] - item["credit_minor"]
        else:
            period_timeline.append(item)

    from app.domains.receipts.schemas import (
        ClientStatementResponse,
        StatementEntry,
    )

    balance = opening
    invoiced = 0
    net_paid = 0
    entries = []

    for item in period_timeline:
        debit = item["debit_minor"]
        credit = item["credit_minor"]

        balance += debit - credit

        # Reversals affect the balance but are not new invoices.
        if item["type"] == "invoice":
            invoiced += debit
        elif item["type"] == "receipt":
            net_paid += credit
        elif item["type"] == "reversal":
            net_paid -= debit

        entries.append(
            StatementEntry(
                date=item["date"],
                type=item["type"],
                reference_number=item["reference_number"],
                description=item["description"],
                debit_minor=debit,
                credit_minor=credit,
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
        total_paid_minor=net_paid,
        closing_balance_minor=balance,
        business_name=workspace.business_name,
        generated_at=datetime.now(timezone.utc),
    )
