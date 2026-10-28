from datetime import date
from types import SimpleNamespace

from app.domains.documents.builders.invoices import build_invoice_document
from app.domains.documents.service import render_invoice_html


def make_invoice():
    item = SimpleNamespace(
        description="<script>alert('x')</script>",
        quantity=2,
        unit_price_minor=50000,
        total_minor=100000,
    )

    return SimpleNamespace(
        id="inv_test_001",
        workspace_id="ws_test_001",
        invoice_number="INV-0001",
        version=1,
        currency="NGN",
        issue_date=date(2026, 10, 28),
        due_date=date(2026, 11, 11),
        subtotal_minor=100000,
        discount_minor=0,
        tax_minor=7500,
        total_minor=107500,
        wht_minor=0,
        net_payable_minor=107500,
        items=[item],
    )


def test_invoice_builder_preserves_authoritative_financial_values():
    invoice = make_invoice()

    document = build_invoice_document(invoice)

    assert document.source_id == invoice.id
    assert document.workspace_id == invoice.workspace_id
    assert document.total_minor == 107500
    assert document.tax_minor == 7500
    assert document.net_payable_minor == 107500
    assert document.items[0].total_minor == 100000


def test_invoice_html_renderer_escapes_user_controlled_content():
    html = render_invoice_html(make_invoice())

    assert "INV-0001" in html
    assert "Subtotal:" in html
    assert "Total:" in html

    # The user's description must not become executable HTML.
    assert "<script>alert('x')</script>" not in html
    assert "&lt;script&gt;" in html
