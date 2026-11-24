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

    db = FakeDB(
        [
            None,  # No confirmed receipt
            None,  # No pending claim
            None,  # No processing payment attempt
        ]
    )

    await InvoiceRecallService.validate_recall_eligibility(
        db,
        invoice,
    )


@pytest.mark.asyncio
async def test_recall_allows_unpaid_resolved_invoice():
    invoice = make_invoice()

    db = FakeDB(
        [
            None,  # No confirmed receipt
            None,  # No pending claim
            None,  # No processing payment attempt
        ]
    )

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


@pytest.mark.asyncio
async def test_recall_blocks_processing_attempt_without_invoice_processing_fields():
    invoice = make_invoice(
        payment_processing_at=None,
        payment_processing_reference=None,
    )

    db = FakeDB(
        [
            None,  # No confirmed receipt
            None,  # No pending claim
            "attempt_123",  # Durable processing attempt exists
        ]
    )

    with pytest.raises(
        BadRequestException,
        match="payment transaction is still processing",
    ):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )

@pytest.mark.asyncio
async def test_recall_blocks_confirmed_receipt_even_if_invoice_aggregate_is_zero():
    invoice = make_invoice(amount_paid_minor=0)

    db = FakeDB([
        "receipt_123",
    ])

    with pytest.raises(
        BadRequestException,
        match="confirmed payment receipt exists",
    ):
        await InvoiceRecallService.validate_recall_eligibility(
            db,
            invoice,
        )



import uuid

from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.helpers import login_code_for


@pytest.mark.asyncio
async def test_invoice_revision_reissue_preserves_document_generations():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"revision-{uuid.uuid4().hex[:8]}@lagos.agency"

        await client.post(
            "/auth/magic-link",
            json={"email": email},
        )
        code = login_code_for(email)

        auth_response = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": code,
                "intent": "signup",
                "full_name": "Invoice Revision Test",
            },
        )

        assert auth_response.status_code == 200, auth_response.text
        client.cookies.set(
            "bagg_session",
            auth_response.cookies["bagg_session"],
        )
        actor_user_id = auth_response.json()["user"]["id"]

        client_response = await client.post(
            "/clients",
            json={
                "name": "Revision Test Client",
                "email": f"billing-{uuid.uuid4().hex[:6]}@example.com",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 14,
            },
        )
        assert client_response.status_code == 201, client_response.text
        client_id = client_response.json()["id"]

        invoice_response = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Initial service",
                        "quantity": 1,
                        "unit_price_minor": 500000,
                    }
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0,
            },
        )
        assert invoice_response.status_code == 201, invoice_response.text
        invoice = invoice_response.json()
        invoice_id = invoice["id"]

        first_issue = await client.post(
            f"/invoices/{invoice_id}/finalize"
        )
        assert first_issue.status_code == 200, first_issue.text

        first = first_issue.json()
        original_number = first["invoice_number"]
        original_sequence = first["sequence_number"]

        assert first["issuance_generation"] == 1
        assert first["version"] == 1
        assert first["share_token"]

        # Revise the issued invoice directly. The revise operation performs
        # the recall and commercial revision in one transaction.
        revision_response = await client.post(
            f"/invoices/{invoice_id}/revise",
            json={
                "items": [
                    {
                        "description": "Revised service",
                        "quantity": 1,
                        "unit_price_minor": 750000,
                    }
                ],
                "reason": "Agreed scope adjustment",
                "notes": "Revised scope",
            },
        )
        assert revision_response.status_code == 200, revision_response.text

        revised = revision_response.json()
        assert revised["status"] == "draft"
        assert revised["invoice_number"] == original_number
        assert revised["sequence_number"] == original_sequence
        assert revised["version"] == 2
        assert revised["issuance_generation"] == 1
        assert revised["share_token"] is None
        assert revised["total_minor"] == 750000

        second_issue = await client.post(
            f"/invoices/{invoice_id}/finalize"
        )
        assert second_issue.status_code == 200, second_issue.text

        second = second_issue.json()
        assert second["invoice_number"] == original_number
        assert second["sequence_number"] == original_sequence
        assert second["version"] == 2
        assert second["issuance_generation"] == 2

        versions_response = await client.get(
            f"/invoices/{invoice_id}/document-versions"
        )
        assert versions_response.status_code == 200, versions_response.text

        versions = versions_response.json()
        assert len(versions) == 2

        first_version, second_version = versions

        assert first_version["revision_number"] == 1
        assert first_version["issuance_generation"] == 1
        assert first_version["document_number"] == original_number
        assert first_version["recalled_at"] is not None
        assert first_version["recalled_by_user_id"] == actor_user_id

        assert second_version["revision_number"] == 2
        assert second_version["issuance_generation"] == 2
        assert second_version["document_number"] == original_number
        assert second_version["recalled_at"] is None
