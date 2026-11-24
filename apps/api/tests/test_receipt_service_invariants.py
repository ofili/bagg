"""Tests pinning down invariants for payment confirmation in receipts/service.py."""

from datetime import date, datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.errors import BadRequestException
from app.domains.auth.models import User
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.receipts.service import (
    confirm_payment,
    _Payment,
    _payment_notification_content,
    LATE_PAYMENT_SOURCE,
)
from app.domains.workspaces.models import Workspace
from app.domains.clients.models import Client


@pytest.mark.asyncio
async def test_notification_content_pure_function():
    """Pin down notification content for standard partial, full, and late payments."""
    workspace = Workspace(id="ws_1", name="Test Studio", business_name="Test Studio", owner_id="user_1")
    invoice = Invoice(
        id="inv_1",
        workspace_id=workspace.id,
        invoice_number="INV-2026-0001",
        currency="NGN",
        status="partially_paid",
    )
    receipt = Receipt(
        id="rcpt_1",
        workspace_id=workspace.id,
        invoice_id=invoice.id,
        receipt_number="RCP-2026-0001",
        amount_paid_minor=50_000,
        currency="NGN",
    )

    # 1. Partial payment notification
    pay_part = _Payment(
        amount_minor=50_000,
        method="bank_transfer",
        reference="REF1",
        payer_name="Client Corp",
        payment_date=date.today(),
        claim_id=None,
        notes=None,
        source="issuer_manual",
        confirmed_by_user_id="user_other",
        provider="manual",
        provider_reference=None,
        late=False,
    )
    content_part = _payment_notification_content(invoice, receipt, pay_part)
    assert content_part.type == "payment_received"
    assert "INV-2026-0001" in content_part.title
    assert "RCP-2026-0001" in content_part.body

    # 2. Full payment notification
    invoice.status = "paid"
    content_full = _payment_notification_content(invoice, receipt, pay_part)
    assert content_full.type == "invoice_paid"
    assert "fully paid" in content_full.title

    # 3. Late payment notification
    pay_late = _Payment(
        amount_minor=50_000,
        method="card",
        reference="REF2",
        payer_name="Client Corp",
        payment_date=date.today(),
        claim_id=None,
        notes=None,
        source=LATE_PAYMENT_SOURCE,
        confirmed_by_user_id=None,
        provider="paystack",
        provider_reference="pstk_ref",
        late=True,
    )
    content_late = _payment_notification_content(invoice, receipt, pay_late)
    assert content_late.type == "payment_reconciliation_required"
    assert "reconciliation" in content_late.body


@pytest.mark.asyncio
async def test_confirm_payment_invariants_lifecycle():
    """Pin down:
    - Overpayment rejection.
    - Zero/negative amount rejection.
    - Partial payment transitions invoice to partially_paid.
    - Duplicate reference returns existing receipt idempotently.
    - Full payment clears balance and transitions invoice to paid.
    """
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        uid = f"inv-{now.timestamp()}"
        user = User(
            id=f"user_{uid}",
            email=f"owner_{uid}@studio.ng",
            full_name="Invariant Owner",
            is_active=True,
        )
        workspace = Workspace(
            id=f"ws_{uid}",
            name="Invariant Workspace",
            business_name="Invariant Studio",
            owner_id=user.id,
        )
        client = Client(
            id=f"cli_{uid}",
            workspace_id=workspace.id,
            name="Invariant Client",
            preferred_currency="NGN",
        )
        invoice = Invoice(
            id=f"inv_{uid}",
            workspace_id=workspace.id,
            client_id=client.id,
            invoice_number=f"INV-{uid[:8]}",
            currency="NGN",
            subtotal_minor=100_000,
            total_minor=100_000,
            net_payable_minor=100_000,
            amount_paid_minor=0,
            status="issued",
            issue_date=date.today(),
        )
        db.add_all([user, workspace, client, invoice])
        await db.commit()

        # Invariant 1: Amount must be > 0
        with pytest.raises(BadRequestException, match="greater than zero"):
            await confirm_payment(
                db=db,
                workspace=workspace,
                invoice=invoice,
                amount_paid_minor=0,
                confirmation_source="issuer_manual",
            )

        # Invariant 2: Overpayment must be rejected
        with pytest.raises(BadRequestException, match="exceeds the outstanding balance"):
            await confirm_payment(
                db=db,
                workspace=workspace,
                invoice=invoice,
                amount_paid_minor=150_000,
                confirmation_source="issuer_manual",
            )

        # Invariant 3: Partial payment transitions to partially_paid
        receipt_1 = await confirm_payment(
            db=db,
            workspace=workspace,
            invoice=invoice,
            amount_paid_minor=40_000,
            payment_method="bank_transfer",
            reference="BANK-REF-001",
            provider="manual",
            provider_reference="PROV-REF-001",
            confirmation_source="issuer_manual",
        )
        await db.commit()

        assert receipt_1.amount_paid_minor == 40_000
        assert receipt_1.balance_remaining_minor == 60_000
        assert invoice.status == "partially_paid"
        assert invoice.amount_paid_minor == 40_000

        # Invariant 4: Duplicate reference with same source/provider returns existing receipt idempotently
        dup_receipt = await confirm_payment(
            db=db,
            workspace=workspace,
            invoice=invoice,
            amount_paid_minor=40_000,
            payment_method="bank_transfer",
            reference="BANK-REF-001",
            provider="manual",
            provider_reference="PROV-REF-001",
            confirmation_source="issuer_manual",
        )
        assert dup_receipt.id == receipt_1.id
        assert invoice.amount_paid_minor == 40_000

        # Invariant 5: Full remaining payment transitions to paid
        receipt_2 = await confirm_payment(
            db=db,
            workspace=workspace,
            invoice=invoice,
            amount_paid_minor=60_000,
            payment_method="bank_transfer",
            reference="BANK-REF-002",
            confirmation_source="issuer_manual",
        )
        await db.commit()

        assert receipt_2.amount_paid_minor == 60_000
        assert receipt_2.balance_remaining_minor == 0
        assert invoice.status == "paid"
        assert invoice.amount_paid_minor == 100_000
