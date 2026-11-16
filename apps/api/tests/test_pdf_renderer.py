from datetime import date

import pytest

from app.domains.documents.renderers.reportlab_pdf import (
    ReportLabDocumentRenderer,
)
from app.domains.documents.schemas import (
    InvoiceDocument,
    InvoiceDocumentLineItem,
    QuoteDocument,
    QuoteDocumentLineItem,
    ReceiptDocument,
)


@pytest.fixture
def renderer():
    return ReportLabDocumentRenderer()


@pytest.fixture
def invoice_document():
    return InvoiceDocument(
        source_id="inv_123",
        workspace_id="ws_123",
        invoice_number="INV-001",
        version=1,
        currency="NGN",
        issue_date=date(2026, 11, 1),
        due_date=date(2026, 11, 30),
        subtotal_minor=1000000,
        discount_minor=0,
        tax_minor=75000,
        total_minor=1075000,
        wht_minor=0,
        net_payable_minor=1075000,
        items=[
            InvoiceDocumentLineItem(
                description="Software engineering consultancy",
                quantity=2,
                unit_price_minor=500000,
                total_minor=1000000,
                formatted_unit_price="₦5,000.00",
                formatted_total="₦10,000.00",
            )
        ],
        formatted_issue_date="November 01, 2026",
        formatted_due_date="November 30, 2026",
        formatted_subtotal="₦10,000.00",
        formatted_tax="₦750.00",
        formatted_total="₦10,750.00",
        formatted_wht="₦0.00",
        formatted_net_payable="₦10,750.00",
    )


@pytest.fixture
def quote_document():
    return QuoteDocument(
        source_id="qot_123",
        workspace_id="ws_123",
        quote_number="QUO-001",
        version=2,
        status="issued",
        currency="NGN",
        issue_date=date(2026, 11, 1),
        expires_at=date(2026, 11, 30),
        business_name="Example Creative Studio",
        business_address="Lagos, Nigeria",
        business_tax_id="TIN-123456",
        client_name="Example Client",
        items=[
            QuoteDocumentLineItem(
                description="Brand identity design",
                quantity=1,
                unit_price_minor=2000000,
                total_minor=2000000,
                formatted_unit_price="₦20,000.00",
                formatted_total="₦20,000.00",
            )
        ],
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
        notes="50% deposit required before work begins.",
        formatted_issue_date="November 01, 2026",
        formatted_expires_at="November 30, 2026",
        formatted_subtotal="₦20,000.00",
        formatted_discount="₦1,000.00",
        formatted_tax="₦1,425.00",
        formatted_total="₦20,425.00",
        formatted_wht="₦1,000.00",
        formatted_net_payable="₦19,425.00",
        formatted_deposit="₦10,212.50",
        formatted_tax_rate="7.5%",
        formatted_wht_rate="5%",
        formatted_deposit_percentage="50%",
    )


@pytest.fixture
def receipt_document():
    return ReceiptDocument(
        source_id="rcp_123",
        workspace_id="ws_123",
        receipt_number="RCP-001",
        invoice_number="INV-001",
        currency="NGN",
        payment_date=date(2026, 11, 10),
        payment_method="Bank Transfer",
        reference="PAY-123456",
        payer_name="Example Client",
        business_name="Example Creative Studio",
        amount_paid_minor=500000,
        balance_remaining_minor=500000,
        verification_code="BAGG-12345678",
        confirmation_source="webhook_paystack",
        confirmation_heading="Payment verified by Paystack",
        confirmation_stamp="PAYSTACK-VERIFIED",
        confirmation_disclaimer=(
            "This receipt records a transaction verified through Paystack "
            "and recorded by Bagg."
        ),
        formatted_payment_date="November 10, 2026",
        formatted_amount_paid="₦5,000.00",
        formatted_balance_remaining="₦5,000.00",
    )


def assert_valid_pdf(content: bytes):
    assert isinstance(content, bytes)
    assert content.startswith(b"%PDF-")
    assert len(content) > 500
    assert b"%%EOF" in content[-1024:]


def test_renderer_returns_invoice_pdf(renderer, invoice_document):
    result = renderer.render(invoice_document)

    assert_valid_pdf(result)


def test_renderer_returns_quote_pdf(renderer, quote_document):
    result = renderer.render(quote_document)

    assert_valid_pdf(result)


def test_renderer_returns_receipt_pdf(renderer, receipt_document):
    result = renderer.render(receipt_document)

    assert_valid_pdf(result)


def test_renderer_exposes_identity(renderer):
    assert renderer.renderer_name == "reportlab"
    assert renderer.renderer_version


def test_renderer_rejects_unsupported_document(renderer):
    with pytest.raises(TypeError, match="Unsupported document type"):
        renderer.render({"document_type": "invoice"})


def test_invoice_renderer_handles_unicode(renderer, invoice_document):
    invoice_document.items[0].description = "Design for Zoë Müller — Lagos"

    result = renderer.render(invoice_document)

    assert_valid_pdf(result)


def test_renderer_handles_long_multipage_invoice(renderer, invoice_document):
    invoice_document.items = [
        InvoiceDocumentLineItem(
            description=f"Professional service item {index}",
            quantity=1,
            unit_price_minor=100000,
            total_minor=100000,
            formatted_unit_price="₦1,000.00",
            formatted_total="₦1,000.00",
        )
        for index in range(1, 151)
    ]

    result = renderer.render(invoice_document)

    assert_valid_pdf(result)

    # The PDF should contain multiple page objects.
    assert result.count(b"/Type /Page") >= 2


def test_receipt_preserves_payment_confirmation_copy(
    renderer,
    receipt_document,
):
    result = renderer.render(receipt_document)

    assert_valid_pdf(result)

    # The receipt's source data remains untouched by rendering.
    assert receipt_document.confirmation_stamp == "PAYSTACK-VERIFIED"
    assert "Paystack" in receipt_document.confirmation_heading
