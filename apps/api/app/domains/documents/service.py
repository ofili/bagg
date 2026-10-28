from app.domains.documents.builders.invoices import build_invoice_document
from app.domains.documents.builders.receipts import build_receipt_document
from app.domains.documents.renderers.html import (
    render_invoice_document_html,
    render_receipt_document_html,
)
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt


def render_invoice_html(invoice: Invoice) -> str:
    """Render an already-authorized invoice as HTML.

    No database access, persistence, or business-state mutation occurs here.
    """
    document = build_invoice_document(invoice)
    return render_invoice_document_html(document)


def render_receipt_html(
    receipt: Receipt,
    *,
    business_name: str,
    client_name: str | None,
    invoice_number: str | None,
) -> str:
    """Render an already-authorized receipt as HTML.

    The caller supplies related display values from its authorized query.
    No database access, persistence, or business-state mutation occurs here.
    """
    document = build_receipt_document(
        receipt,
        business_name=business_name,
        client_name=client_name,
        invoice_number=invoice_number,
    )
    return render_receipt_document_html(document)
