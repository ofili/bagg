from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.money import format_money
from app.core.security import generate_share_token
from app.domains.workspaces.models import Workspace
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.reminders.service import cancel_invoice_reminders


async def create_receipt(
    db: AsyncSession,
    workspace: Workspace,
    invoice: Invoice,
    amount_paid_minor: int,
    payment_method: str = "bank_transfer",
    reference: Optional[str] = None,
    payer_name: Optional[str] = None,
    payment_date: Optional[date] = None,
    payment_claim_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> Receipt:
    """
    Creates an immutable, sequentially numbered Payment Receipt (US-RCP-01).
    Updates invoice paid amount, updates status to 'paid' or 'partially_paid',
    and cancels automated reminders if fully settled.
    """
    seq = workspace.next_receipt_number
    receipt_number = f"{workspace.receipt_prefix}{seq:04d}"
    workspace.next_receipt_number = seq + 1

    # Update invoice paid tracking
    invoice.amount_paid_minor = (invoice.amount_paid_minor or 0) + amount_paid_minor

    target_payable = (
        invoice.net_payable_minor
        if (invoice.net_payable_minor and invoice.net_payable_minor > 0)
        else invoice.total_minor
    )
    balance_remaining_minor = max(0, target_payable - invoice.amount_paid_minor)

    now = datetime.now(timezone.utc)

    if invoice.amount_paid_minor >= target_payable:
        invoice.status = "paid"
        invoice.paid_at = now
        await cancel_invoice_reminders(invoice.id, db)
    else:
        invoice.status = "partially_paid"

    raw_token, token_hash = generate_share_token()

    receipt = Receipt(
        workspace_id=workspace.id,
        client_id=invoice.client_id,
        invoice_id=invoice.id,
        payment_claim_id=payment_claim_id,
        receipt_number=receipt_number,
        sequence_number=seq,
        currency=invoice.currency,
        amount_paid_minor=amount_paid_minor,
        balance_remaining_minor=balance_remaining_minor,
        payment_date=payment_date or date.today(),
        payment_method=payment_method,
        reference=reference,
        payer_name=payer_name or (invoice.client.name if invoice.client else None),
        notes=notes,
        is_verified=True,
        verified_at=now,
        share_token=raw_token,
        share_token_hash=token_hash,
    )
    db.add(receipt)
    return receipt
