from types import SimpleNamespace

import pytest

from app.core.errors import BadRequestException
from app.domains.invoices.recall_service import InvoiceRecallService


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDB:
    def __init__(self, results):
        self.results = iter(results)

    async def execute(self, statement):
        return FakeResult(next(self.results))


def make_invoice(**overrides):
    values = {
        "id": "inv_test",
        "status": "sent",
        "invoice_number": "INV-0001",
        "amount_paid_minor": 0,
        "payment_processing_at": None,
        "payment_processing_reference": None,
        "direct_payment_reference": None,
        "voided_at": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.mark.asyncio
async def test_recall_blocks_any_confirmed_payment():
    invoice = make_invoice(amount_paid_minor=1)

    db = FakeDB([])

    with pytest.raises(BadRequestException):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )


@pytest.mark.asyncio
async def test_recall_blocks_pending_payment_claim():
    invoice = make_invoice()

    db = FakeDB([
        None,           # No confirmed receipt
        "claim_123",    # Pending claim exists
    ])

    with pytest.raises(BadRequestException):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )


@pytest.mark.asyncio
async def test_recall_blocks_payment_processing():
    invoice = make_invoice(
        payment_processing_at="2026-11-05T10:00:00Z",
    )

    db = FakeDB([
        None,  # No confirmed receipt
        None,  # No pending claim
    ])

    with pytest.raises(BadRequestException):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )


@pytest.mark.asyncio
async def test_recall_ignores_stale_direct_payment_reference():
    # Payment attempts are now the authoritative provider-transaction record;
    # recall invalidates open attempts and blocks processing ones. A leftover
    # reference on the invoice no longer gates eligibility by itself.
    invoice = make_invoice(
        direct_payment_reference="bagg_pay_existing",
    )

    db = FakeDB([
        None,
        None,
    ])

    await InvoiceRecallService.validate_recall_eligibility(
        db,
        invoice,
    )


@pytest.mark.asyncio
async def test_recall_allows_unpaid_resolved_invoice():
    invoice = make_invoice()

    db = FakeDB([
        None,  # No confirmed receipt
        None,  # No pending claim
    ])

    await InvoiceRecallService.validate_recall_eligibility(
        db,
        invoice,
    )


@pytest.mark.asyncio
async def test_recall_rejects_fully_paid_invoice():
    invoice = make_invoice(status="paid")

    db = FakeDB([])

    with pytest.raises(BadRequestException):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )