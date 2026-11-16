from datetime import date
from types import SimpleNamespace

from app.domains.documents.builders.invoices import build_invoice_document
from app.domains.documents.builders.quotes import build_quote_document
from app.domains.documents.builders.receipts import build_receipt_document


def make_line_item(
    *,
    description="Consulting",
    quantity=2,
    unit_price_minor=500000,
    total_minor=1000000,
):
    return SimpleNamespace(
        description=description,
        quantity=quantity,
        unit_price_minor=unit_price_minor,
        total_minor=total_minor,
    )


def test_invoice_builder_preserves_financial_values():
    invoice = SimpleNamespace(
        id="inv_123",
        workspace_id="ws_123",
        invoice_number="INV-001",
        version=2,
        currency="NGN",
        issue_date=date(2026, 11, 1),
        due_date=date(2026, 11, 30),
        subtotal_minor=1000000,
        discount_minor=50000,
        tax_minor=75000,
        total_minor=1025000,
        wht_minor=50000,
        net_payable_minor=975000,
        items=[make_line_item()],
    )

    document = build_invoice_document(invoice)

    assert document.document_type == "invoice"
    assert document.source_id == "inv_123"
    assert document.workspace_id == "ws_123"
    assert document.invoice_number == "INV-001"
    assert document.version == 2

    assert document.subtotal_minor == 1000000
    assert document.discount_minor == 50000
    assert document.tax_minor == 75000
    assert document.total_minor == 1025000
    assert document.wht_minor == 50000
    assert document.net_payable_minor == 975000

    assert len(document.items) == 1
    assert document.items[0].description == "Consulting"
    assert document.items[0].quantity == 2
    assert document.items[0].total_minor == 1000000


def test_invoice_builder_uses_safe_draft_number_when_missing():
    invoice = SimpleNamespace(
        id="inv_123",
        workspace_id="ws_123",
        invoice_number=None,
        version=1,
        currency="NGN",
        issue_date=None,
        due_date=None,
        subtotal_minor=0,
        discount_minor=0,
        tax_minor=0,
        total_minor=0,
        wht_minor=0,
        net_payable_minor=0,
        items=[],
    )

    document = build_invoice_document(invoice)

    assert document.invoice_number == "DRAFT"
    assert document.formatted_issue_date == "—"
    assert document.formatted_due_date == "—"


def test_quote_builder_preserves_commercial_terms():
    quote = SimpleNamespace(
        id="qot_123",
        workspace_id="ws_123",
        quote_number="QUO-001",
        version=3,
        status="issued",
        currency="NGN",
        issue_date=date(2026, 11, 1),
        expires_at=date(2026, 11, 30),
        subtotal_minor=2000000,
        discount_minor=100000,
        tax_rate_percent=7.5,
        tax_minor=142500,
        total_minor=2042500,
        wht_rate_percent=5.0,
        wht_minor=100000,
        net_payable_minor=1942500,
        deposit_percentage=50.0,
        deposit_amount_minor=1021250,
        notes="Payment terms: 50% upfront.",
        items=[make_line_item(total_minor=2000000)],
    )

    document = build_quote_document(
        quote,
        business_name="Example Studio",
        client_name="Example Client",
        business_address="Lagos, Nigeria",
        business_tax_id="TIN-123",
    )

    assert document.document_type == "quote"
    assert document.source_id == "qot_123"
    assert document.workspace_id == "ws_123"
    assert document.quote_number == "QUO-001"
    assert document.version == 3
    assert document.status == "issued"

    assert document.business_name == "Example Studio"
    assert document.business_address == "Lagos, Nigeria"
    assert document.business_tax_id == "TIN-123"
    assert document.client_name == "Example Client"

    assert document.subtotal_minor == 2000000
    assert document.discount_minor == 100000
    assert document.tax_minor == 142500
    assert document.total_minor == 2042500
    assert document.wht_minor == 100000
    assert document.net_payable_minor == 1942500
    assert document.deposit_percentage == 50.0
    assert document.deposit_amount_minor == 1021250
    assert document.notes == "Payment terms: 50% upfront."


def test_quote_builder_uses_client_fallback():
    quote = SimpleNamespace(
        id="qot_123",
        workspace_id="ws_123",
        quote_number="QUO-001",
        version=1,
        status="draft",
        currency="NGN",
        issue_date=date(2026, 11, 1),
        expires_at=date(2026, 11, 30),
        subtotal_minor=0,
        discount_minor=0,
        tax_rate_percent=0.0,
        tax_minor=0,
        total_minor=0,
        wht_rate_percent=0.0,
        wht_minor=0,
        net_payable_minor=0,
        deposit_percentage=None,
        deposit_amount_minor=None,
        notes=None,
        items=[],
    )

    document = build_quote_document(
        quote,
        business_name="Example Studio",
        client_name=None,
    )

    assert document.client_name == "Client"
    assert document.business_address is None
    assert document.business_tax_id is None
    assert document.deposit_amount_minor is None


def test_paystack_receipt_preserves_provider_confirmation_provenance():
    receipt = SimpleNamespace(
        id="rcp_123",
        workspace_id="ws_123",
        receipt_number="RCP-001",
        currency="NGN",
        payment_date=date(2026, 11, 10),
        payment_method="card",
        reference="PAY-123",
        payer_name="Example Client",
        amount_paid_minor=500000,
        balance_remaining_minor=0,
        verification_code="BAGG-12345678",
        confirmation_source="webhook_paystack",
    )

    document = build_receipt_document(
        receipt,
        business_name="Example Studio",
        client_name="Example Client",
        invoice_number="INV-001",
    )

    assert document.document_type == "receipt"
    assert document.source_id == "rcp_123"
    assert document.workspace_id == "ws_123"
    assert document.receipt_number == "RCP-001"
    assert document.invoice_number == "INV-001"
    assert document.amount_paid_minor == 500000
    assert document.balance_remaining_minor == 0
    assert document.confirmation_source == "webhook_paystack"
    assert document.confirmation_stamp == "PAYSTACK-VERIFIED"
    assert "Paystack" in document.confirmation_heading


def test_manual_receipt_does_not_claim_paystack_verification():
    receipt = SimpleNamespace(
        id="rcp_456",
        workspace_id="ws_123",
        receipt_number="RCP-002",
        currency="NGN",
        payment_date=date(2026, 11, 10),
        payment_method="bank_transfer",
        reference="BANK-123",
        payer_name="Example Client",
        amount_paid_minor=500000,
        balance_remaining_minor=100000,
        verification_code="BAGG-87654321",
        confirmation_source="issuer_confirmed",
    )

    document = build_receipt_document(
        receipt,
        business_name="Example Studio",
        client_name="Example Client",
        invoice_number="INV-002",
    )

    assert document.confirmation_stamp == "BUSINESS-CONFIRMED"
    assert "business" in document.confirmation_heading.lower()
    assert "not independently verified" in document.confirmation_disclaimer.lower()


def test_receipt_builder_uses_fallback_display_values():
    receipt = SimpleNamespace(
        id="rcp_789",
        workspace_id="ws_123",
        receipt_number="RCP-003",
        currency="NGN",
        payment_date=date(2026, 11, 10),
        payment_method=None,
        reference=None,
        payer_name=None,
        amount_paid_minor=100000,
        balance_remaining_minor=0,
        verification_code=None,
        confirmation_source=None,
    )

    document = build_receipt_document(
        receipt,
        business_name="Example Studio",
        client_name=None,
        invoice_number=None,
    )

    assert document.payment_method == "Bank Transfer"
    assert document.reference == "N/A"
    assert document.payer_name == "Client"
    assert document.invoice_number == "INV"
    assert document.verification_code == "N/A"
    assert document.confirmation_source == "legacy"
