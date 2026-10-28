from app.domains.documents.builders.invoices import build_invoice_document
from app.domains.documents.renderers.html import render_invoice_document_html
from app.domains.invoices.models import Invoice


def render_invoice_html(invoice: Invoice) -> str:
    """Render an already-authorized invoice as HTML.

    No database access, persistence, or business-state mutation occurs here.
    """
    document = build_invoice_document(invoice)
    return render_invoice_document_html(document)
