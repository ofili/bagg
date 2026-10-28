from app.core.money import format_money
from app.domains.documents.schemas import (
    QuoteDocument,
    QuoteDocumentLineItem,
)
from app.domains.quotes.models import Quote


def _format_date(value) -> str:
    return value.strftime("%B %d, %Y") if value else "—"


def _format_percentage(value: float | None) -> str:
    return f"{value:g}%" if value is not None else "—"


def build_quote_document(
    quote: Quote,
    *,
    business_name: str,
    client_name: str | None,
    business_address: str | None = None,
    business_tax_id: str | None = None,
) -> QuoteDocument:
    """Map an authorized, loaded quote to document presentation data.

    This builder does not query the database, mutate the quote, or
    recalculate line-item or aggregate financial values.
    """
    currency = quote.currency

    items = [
        QuoteDocumentLineItem(
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
            formatted_unit_price=format_money(item.unit_price_minor, currency),
            formatted_total=format_money(item.total_minor, currency),
        )
        for item in (quote.items or [])
    ]

    deposit_amount = quote.deposit_amount_minor

    return QuoteDocument(
        source_id=quote.id,
        workspace_id=quote.workspace_id,
        quote_number=quote.quote_number or "DRAFT",
        version=max(1, quote.version or 1),
        status=quote.status,
        currency=currency,
        issue_date=quote.issue_date,
        expires_at=quote.expires_at,
        business_name=business_name,
        business_address=business_address,
        business_tax_id=business_tax_id,
        client_name=client_name or "Client",
        items=items,
        subtotal_minor=quote.subtotal_minor,
        discount_minor=quote.discount_minor,
        tax_rate_percent=quote.tax_rate_percent,
        tax_minor=quote.tax_minor,
        total_minor=quote.total_minor,
        wht_rate_percent=quote.wht_rate_percent,
        wht_minor=quote.wht_minor,
        net_payable_minor=quote.net_payable_minor,
        deposit_percentage=quote.deposit_percentage,
        deposit_amount_minor=deposit_amount,
        notes=quote.notes,
        formatted_issue_date=_format_date(quote.issue_date),
        formatted_expires_at=_format_date(quote.expires_at),
        formatted_subtotal=format_money(quote.subtotal_minor, currency),
        formatted_discount=format_money(quote.discount_minor, currency),
        formatted_tax=format_money(quote.tax_minor, currency),
        formatted_total=format_money(quote.total_minor, currency),
        formatted_wht=format_money(quote.wht_minor, currency),
        formatted_net_payable=format_money(quote.net_payable_minor, currency),
        formatted_deposit=(
            format_money(deposit_amount, currency)
            if deposit_amount is not None
            else None
        ),
        formatted_tax_rate=_format_percentage(quote.tax_rate_percent),
        formatted_wht_rate=_format_percentage(quote.wht_rate_percent),
        formatted_deposit_percentage=(
            _format_percentage(quote.deposit_percentage)
            if quote.deposit_percentage is not None
            else None
        ),
    )
