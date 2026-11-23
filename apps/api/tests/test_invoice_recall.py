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
    values |= overrides
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


from datetime import date
from types import SimpleNamespace

import pytest

from app.domains.invoices import recall_service
from app.domains.invoices.recall_service import InvoiceRecallService


class SnapshotRepository:
    def __init__(self, existing=None, items=None):
        self.existing = existing
        self.items = items or []
        self.added = []

    async def get_document_version(
        self, invoice_id, issuance_generation, *, for_update=False
    ):
        self.lookup = (invoice_id, issuance_generation)
        return self.existing

    async def list_items(self, invoice_id):
        return self.items

    def add_document_version(self, version):
        self.added.append(version)

    async def flush(self):
        pass


@pytest.mark.asyncio
async def test_snapshot_uses_issuance_generation_not_revision(monkeypatch):
    repository = SnapshotRepository(
        items=[
            SimpleNamespace(
                position=0,
                description="Design",
                quantity=1,
                unit_price_minor=500000,
                total_minor=500000,
            )
        ]
    )

    monkeypatch.setattr(
        recall_service,
        "InvoiceRepository",
        lambda db: repository,
    )

    invoice = SimpleNamespace(
        id="inv_test",
        workspace_id="ws_test",
        client_id="client_test",
        invoice_number="INV-0001",
        version=1,
        issuance_generation=2,
        currency="NGN",
        status="issued",
        issue_date=date(2026, 11, 1),
        due_date=date(2026, 11, 15),
        subtotal_minor=500000,
        discount_minor=0,
        tax_rate_percent=0,
        tax_minor=0,
        total_minor=500000,
        wht_rate_percent=0,
        wht_minor=0,
        net_payable_minor=500000,
        deposit_percentage=None,
        deposit_amount_minor=None,
        deposit_due_date=None,
        direct_checkout_enabled=False,
        payment_profile_snapshot={"bank_name": "Example Bank"},
        notes=None,
        share_token_hash="hash-generation-2",
    )

    snapshot = await InvoiceRecallService.create_issued_snapshot(
        object(),
        invoice,
    )

    assert repository.lookup == ("inv_test", 2)
    assert snapshot.revision_number == 1
    assert snapshot.issuance_generation == 2
    assert snapshot.snapshot["revision_number"] == 1
    assert snapshot.snapshot["issuance_generation"] == 2
    assert snapshot.snapshot["payment_profile_snapshot"] == {
        "bank_name": "Example Bank"
    }


@pytest.mark.asyncio
async def test_reissue_same_revision_creates_new_snapshot(monkeypatch):
    repository = SnapshotRepository(items=[])

    monkeypatch.setattr(
        recall_service,
        "InvoiceRepository",
        lambda db: repository,
    )

    invoice = SimpleNamespace(
        id="inv_test",
        workspace_id="ws_test",
        client_id="client_test",
        invoice_number="INV-0001",
        version=1,
        issuance_generation=2,
        currency="NGN",
        status="issued",
        issue_date=None,
        due_date=None,
        subtotal_minor=100,
        discount_minor=0,
        tax_rate_percent=0,
        tax_minor=0,
        total_minor=100,
        wht_rate_percent=0,
        wht_minor=0,
        net_payable_minor=100,
        deposit_percentage=None,
        deposit_amount_minor=None,
        deposit_due_date=None,
        direct_checkout_enabled=False,
        payment_profile_snapshot=None,
        notes=None,
        share_token_hash="new-token-hash",
    )

    snapshot = await InvoiceRecallService.create_issued_snapshot(
        object(),
        invoice,
    )

    assert snapshot.revision_number == 1
    assert snapshot.issuance_generation == 2
    assert snapshot.share_token_hash == "new-token-hash"
    assert len(repository.added) == 1


@pytest.mark.asyncio
async def test_snapshot_creation_is_idempotent_for_same_generation(monkeypatch):
    existing = SimpleNamespace(
        id="existing_snapshot",
        revision_number=1,
        issuance_generation=2,
    )
    repository = SnapshotRepository(existing=existing)

    monkeypatch.setattr(
        recall_service,
        "InvoiceRepository",
        lambda db: repository,
    )

    invoice = SimpleNamespace(
        id="inv_test",
        issuance_generation=2,
        version=1,
    )

    snapshot = await InvoiceRecallService.create_issued_snapshot(
        object(),
        invoice,
    )

    assert snapshot is existing
    assert repository.added == []
