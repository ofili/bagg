from datetime import date
from types import SimpleNamespace

import pytest

from app.domains.documents.builders.receipts import build_receipt_document
from app.domains.documents.renderers.html import render_receipt_document_html
from app.domains.documents.builders.quotes import build_quote_document
from app.domains.documents.renderers.html import render_quote_document_html

def make_receipt(**overrides):
    values = {
        "id": "rcp_test123",
        "workspace_id": "ws_test123",
        "receipt_number": "REC-0042",
        "currency": "NGN",
        "payment_date": date(2026, 10, 28),
        "payment_method": "bank_transfer",
        "reference": "TRF-123456",
        "payer_name": "Payer Limited",
        "amount_paid_minor": 25000000,
        "balance_remaining_minor": 12500000,
        "verification_code": "BAGG-A1B2C3D4",
        "confirmation_source": "issuer_manual",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def render_receipt(
    receipt, *, business_name="Example Business", client_name="Payer Limited"
):
    document = build_receipt_document(
        receipt,
        business_name=business_name,
        client_name=client_name,
        invoice_number="INV-0012",
    )
    return render_receipt_document_html(document)


def test_receipt_document_preserves_financial_values_and_identifiers():
    receipt = make_receipt()

    document = build_receipt_document(
        receipt,
        business_name="Example Business",
        client_name="Payer Limited",
        invoice_number="INV-0012",
    )

    assert document.source_id == "rcp_test123"
    assert document.workspace_id == "ws_test123"
    assert document.receipt_number == "REC-0042"
    assert document.invoice_number == "INV-0012"
    assert document.amount_paid_minor == 25000000
    assert document.balance_remaining_minor == 12500000
    assert document.formatted_payment_date == "October 28, 2026"
    assert document.formatted_amount_paid
    assert document.formatted_balance_remaining


def test_receipt_html_contains_receipt_facts_and_confirmation_disclaimer():
    html = render_receipt(make_receipt())

    assert "REC-0042" in html
    assert "INV-0012" in html
    assert "BAGG-A1B2C3D4" in html
    assert "Payer Limited" in html
    assert "Example Business" in html
    assert "Payment confirmed by business" in html
    assert "Bagg has not independently verified bank settlement." in html
    assert "PAID &amp; VERIFIED" in html or "PAID & VERIFIED" in html


def test_paystack_confirmation_uses_paystack_disclaimer():
    html = render_receipt(make_receipt(confirmation_source="webhook_paystack"))

    assert "Payment verified by Paystack" in html
    assert "PAYSTACK-VERIFIED" in html
    assert "verified through Paystack" in html


def test_other_confirmation_source_uses_generic_disclaimer():
    html = render_receipt(make_receipt(confirmation_source="legacy"))

    assert "Payment confirmation recorded" in html
    assert "RECORD-STAMPED" in html
    assert "confirmation source shown on this receipt" in html


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("business_name", '<img src=x onerror="alert(1)">'),
        ("payer_name", '<script>alert("payer")</script>'),
    ],
)
def test_receipt_html_escapes_untrusted_text(field, value):
    receipt_overrides = {}
    business_name = "Example Business"
    client_name = "Payer Limited"

    if field == "business_name":
        business_name = value
    else:
        client_name = value

    html = render_receipt(
        make_receipt(**receipt_overrides),
        business_name=business_name,
        client_name=client_name,
    )

    assert value not in html
    assert "&lt;" in html
    assert "&gt;" in html


def make_quote(**overrides):
    item = SimpleNamespace(
        description="Consulting services",
        quantity=2,
        unit_price_minor=15000000,
        total_minor=30000000,
    )

    values = {
        "id": "qot_test123",
        "workspace_id": "ws_test123",
        "quote_number": "QOT-0042",
        "version": 2,
        "status": "sent",
        "currency": "NGN",
        "issue_date": date(2026, 10, 1),
        "expires_at": date(2026, 10, 31),
        "items": [item],
        "subtotal_minor": 30000000,
        "discount_minor": 2000000,
        "tax_rate_percent": 7.5,
        "tax_minor": 2100000,
        "total_minor": 30100000,
        "wht_rate_percent": 5.0,
        "wht_minor": 1500000,
        "net_payable_minor": 28600000,
        "deposit_percentage": 50.0,
        "deposit_amount_minor": 15050000,
        "notes": "Payment terms: 50% upfront.",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def render_quote(
    quote,
    *,
    business_name="Example Business",
    client_name="Client Limited",
    business_address=None,
    business_tax_id=None,
):
    document = build_quote_document(
        quote,
        business_name=business_name,
        client_name=client_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
    )
    return render_quote_document_html(document)


def test_quote_document_preserves_authoritative_financial_values():
    quote = make_quote()

    document = build_quote_document(
        quote,
        business_name="Example Business",
        client_name="Client Limited",
    )

    assert document.source_id == "qot_test123"
    assert document.workspace_id == "ws_test123"
    assert document.quote_number == "QOT-0042"
    assert document.version == 2
    assert document.subtotal_minor == 30000000
    assert document.discount_minor == 2000000
    assert document.tax_minor == 2100000
    assert document.total_minor == 30100000
    assert document.wht_minor == 1500000
    assert document.net_payable_minor == 28600000
    assert document.deposit_amount_minor == 15050000
    assert document.items[0].total_minor == 30000000


def test_quote_html_contains_commercial_facts_and_terms():
    html = render_quote(make_quote())

    assert "QOT-0042" in html
    assert "Version 2" in html
    assert "Example Business" in html
    assert "Client Limited" in html
    assert "Consulting services" in html
    assert "October 01, 2026" in html
    assert "October 31, 2026" in html
    assert "Notes and terms" in html
    assert "Payment terms: 50% upfront." in html
    assert "WHT" in html
    assert "Net payable" in html


def test_quote_html_escapes_untrusted_text():
    malicious = '<script>alert("quote")</script>'
    html = render_quote(
        make_quote(notes=malicious),
        business_name='<img src=x onerror="alert(1)">',
        client_name=malicious,
    )

    assert "<script>" not in html
    assert '<img src=x onerror="alert(1)">' not in html
    assert "&lt;script&gt;" in html
    assert "&lt;img" in html


def test_quote_document_supports_missing_optional_commercial_terms():
    quote = make_quote(
        deposit_percentage=None,
        deposit_amount_minor=None,
        notes=None,
        wht_rate_percent=0.0,
        wht_minor=0,
    )

    document = build_quote_document(
        quote,
        business_name="Example Business",
        client_name=None,
    )
    html = render_quote_document_html(document)

    assert document.client_name == "Client"
    assert document.formatted_deposit is None
    assert document.notes is None
    assert "Notes and terms" not in html
