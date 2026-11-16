from app.core.money import format_money
from app.domains.documents.schemas import (
    InvoiceDocument,
    InvoiceDocumentLineItem,
)
from app.domains.invoices.models import Invoice


def _format_date(value) -> str:
    return value.strftime("%B %d, %Y") if value else "—"


def build_invoice_document(
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
) -> InvoiceDocument:
    """Build a renderer-independent invoice snapshot.

    The invoice domain remains authoritative for all financial values.
    This builder performs presentation formatting only and does not
    query the database, mutate the invoice, or recalculate totals.
    """
    currency = invoice.currency
    client = invoice.client

    items = [
        InvoiceDocumentLineItem(
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
            formatted_unit_price=format_money(
                item.unit_price_minor,
                currency,
            ),
            formatted_total=format_money(
                item.total_minor,
                currency,
            ),
        )
        for item in (invoice.items or [])
    ]

    return InvoiceDocument(
        source_id=invoice.id,
        workspace_id=invoice.workspace_id,
        invoice_number=invoice.invoice_number or "DRAFT",
        version=max(1, invoice.version or 1),
        business_name=business_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
        business_logo_url=business_logo_url,
        client_name=client_name or (client.name if client else "Client"),
        client_email=client_email or (client.email if client else None),
        client_address=client_address or (client.address if client else None),
        client_tax_id=client_tax_id or (client.tax_id if client else None),
        currency=currency,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        subtotal_minor=invoice.subtotal_minor,
        discount_minor=invoice.discount_minor,
        tax_minor=invoice.tax_minor,
        total_minor=invoice.total_minor,
        wht_minor=invoice.wht_minor,
        net_payable_minor=invoice.net_payable_minor,
        items=items,
        formatted_issue_date=_format_date(invoice.issue_date),
        formatted_due_date=_format_date(invoice.due_date),
        formatted_subtotal=format_money(invoice.subtotal_minor, currency),
        formatted_tax=format_money(invoice.tax_minor, currency),
        formatted_total=format_money(invoice.total_minor, currency),
        formatted_wht=format_money(invoice.wht_minor, currency),
        formatted_net_payable=format_money(
            invoice.net_payable_minor,
            currency,
        ),
    )
