from datetime import date, datetime, timezone

import pytest

from app.domains.documents.schemas import (
    InvoiceDocument,
    InvoiceDocumentLineItem,
)
from app.domains.documents.snapshots import serialize_document_snapshot


@pytest.fixture
def invoice_document():
    return InvoiceDocument(
        source_id="inv_test",
        workspace_id="ws_test",
        invoice_number="INV-0001",
        version=2,
        business_name="Example Studio",
        business_address="Lagos, Nigeria",
        business_tax_id="TIN-123",
        client_name="Example Client",
        client_email="client@example.com",
        currency="NGN",
        issue_date=date(2026, 11, 16),
        due_date=date(2026, 11, 30),
        subtotal_minor=100000,
        discount_minor=0,
        tax_minor=7500,
        total_minor=107500,
        wht_minor=0,
        net_payable_minor=107500,
        items=[
            InvoiceDocumentLineItem(
                description="Consulting",
                quantity=1,
                unit_price_minor=100000,
                total_minor=100000,
                formatted_unit_price="₦1,000.00",
                formatted_total="₦1,000.00",
            )
        ],
        formatted_issue_date="November 16, 2026",
        formatted_due_date="November 30, 2026",
        formatted_subtotal="₦1,000.00",
        formatted_tax="₦75.00",
        formatted_total="₦1,075.00",
        formatted_wht="₦0.00",
        formatted_net_payable="₦1,075.00",
    )


def test_invoice_snapshot_is_json_compatible(invoice_document):
    snapshot = serialize_document_snapshot(
        invoice_document,
        captured_at=datetime(2026, 11, 16, tzinfo=timezone.utc),
    )

    assert snapshot["snapshot_schema_version"] == 1
    assert snapshot["document_type"] == "invoice"
    assert snapshot["source_id"] == "inv_test"
    assert snapshot["workspace_id"] == "ws_test"
    assert snapshot["source_version"] == 2
    assert snapshot["document"]["business_name"] == "Example Studio"
    assert snapshot["document"]["client_email"] == "client@example.com"
    assert snapshot["document"]["issue_date"] == "2026-11-16"


def test_snapshot_capture_time_must_be_timezone_aware(invoice_document):
    with pytest.raises(ValueError, match="timezone-aware"):
        serialize_document_snapshot(
            invoice_document,
            captured_at=datetime(2026, 11, 16),
        )


def test_snapshot_rejects_unsupported_model():
    with pytest.raises(TypeError, match="Unsupported document snapshot"):
        serialize_document_snapshot(object())  # type: ignore[arg-type]
