from datetime import date
from types import SimpleNamespace

import pytest

from app.domains.documents.builders.receipts import build_receipt_document
from app.domains.documents.renderers.html import render_receipt_document_html


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
