from app.domains.documents.builders.invoices import build_invoice_document
from app.domains.documents.builders.quotes import build_quote_document
from app.domains.documents.builders.receipts import build_receipt_document
from app.domains.documents.renderers.html import (
    render_invoice_document_html,
    render_quote_document_html,
    render_receipt_document_html,
)
from app.domains.documents.renderers.reportlab_pdf import (
    ReportLabDocumentRenderer,
)
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.receipts.models import Receipt

_pdf_renderer = ReportLabDocumentRenderer()


def render_invoice_html(
    invoice: Invoice,
    *,
    business_name: str = "Bagg",
    business_address: str | None = None,
    business_tax_id: str | None = None,
    business_logo_url: str | None = None,
    client_name: str | None = None,
    client_email: str | None = None,
    client_address: str | None = None,
    client_tax_id: str | None = None,
) -> str:
    """Render an authorized invoice as HTML for browser preview."""
    document = build_invoice_document(
        invoice,
        business_name=business_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
        business_logo_url=business_logo_url,
        client_name=client_name,
        client_email=client_email,
        client_address=client_address,
        client_tax_id=client_tax_id,
    )
    return render_invoice_document_html(document)


def render_invoice_pdf(
    invoice: Invoice,
    *,
    business_name: str = "Bagg",
    business_address: str | None = None,
    business_tax_id: str | None = None,
    business_logo_url: str | None = None,
    client_name: str | None = None,
    client_email: str | None = None,
    client_address: str | None = None,
    client_tax_id: str | None = None,
) -> bytes:
    """Render an authorized invoice snapshot as a PDF."""
    document = build_invoice_document(
        invoice,
        business_name=business_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
        business_logo_url=business_logo_url,
        client_name=client_name,
        client_email=client_email,
        client_address=client_address,
        client_tax_id=client_tax_id,
    )
    return _pdf_renderer.render(document)


def render_receipt_html(
    receipt: Receipt,
    *,
    business_name: str,
    client_name: str | None,
    invoice_number: str | None,
) -> str:
    """Render an authorized receipt as HTML for browser preview."""
    document = build_receipt_document(
        receipt,
        business_name=business_name,
        client_name=client_name,
        invoice_number=invoice_number,
    )
    return render_receipt_document_html(document)


def render_receipt_pdf(
    receipt: Receipt,
    *,
    business_name: str,
    client_name: str | None,
    invoice_number: str | None,
) -> bytes:
    """Render an authorized receipt snapshot as a PDF."""
    document = build_receipt_document(
        receipt,
        business_name=business_name,
        client_name=client_name,
        invoice_number=invoice_number,
    )
    return _pdf_renderer.render(document)


def render_quote_html(
    quote: Quote,
    *,
    business_name: str,
    client_name: str | None,
    business_address: str | None = None,
    business_tax_id: str | None = None,
) -> str:
    """Render an authorized quote as HTML for browser preview."""
    document = build_quote_document(
        quote,
        business_name=business_name,
        client_name=client_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
    )
    return render_quote_document_html(document)


def render_quote_pdf(
    quote: Quote,
    *,
    business_name: str,
    client_name: str | None,
    business_address: str | None = None,
    business_tax_id: str | None = None,
) -> bytes:
    """Render an authorized quote snapshot as a PDF."""
    document = build_quote_document(
        quote,
        business_name=business_name,
        client_name=client_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
    )
    return _pdf_renderer.render(document)
