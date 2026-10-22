from datetime import date
from typing import Optional
from urllib.parse import quote

from app.core.config import settings
from app.core.money import format_money
from app.domains.quotes.models import Quote
from app.domains.quotes.schemas import (
    PublicQuoteView,
    QuoteLineItemSchema,
    QuoteResponse,
    QuoteSendResponse,
)
from app.domains.workspaces.models import Workspace


def generate_quote_whatsapp_url(
    phone: Optional[str],
    client_name: str,
    quote_number: str,
    total_formatted: str,
    business_name: str,
    share_url: str,
    expires_at: date,
) -> str:
    """Generates a pre-filled 1-click WhatsApp message URL for quote review."""
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = (
        f"Hi {client_name}, here is your quote {quote_number} for {total_formatted} "
        f"from {business_name}: {share_url}. Offer valid until {expires_at}. Thanks!"
    )
    return f"https://wa.me/{clean_phone}?text={quote(message)}"


def map_quote_to_response(
    quote_obj: Quote,
    client_name: Optional[str] = None,
    client_email: Optional[str] = None,
    client_phone: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = settings.WEB_BASE_URL,
) -> QuoteResponse:
    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    c_name = client_name
    c_email = client_email
    c_phone = client_phone
    if "client" in quote_obj.__dict__ and quote_obj.client:
        if not c_name:
            c_name = quote_obj.client.name
        if not c_email:
            c_email = quote_obj.client.email
        if not c_phone:
            c_phone = quote_obj.client.phone

    share_url = (
        f"{base_url}/q/{quote_obj.share_token}" if quote_obj.share_token else None
    )
    formatted_tot = format_money(quote_obj.total_minor, quote_obj.currency)
    wa_url = (
        generate_quote_whatsapp_url(
            phone=c_phone,
            client_name=c_name or "Client",
            quote_number=quote_obj.quote_number,
            total_formatted=formatted_tot,
            business_name=business_name,
            share_url=share_url or "",
            expires_at=quote_obj.expires_at,
        )
        if share_url
        else None
    )

    is_expired = quote_obj.expires_at < date.today() and quote_obj.status not in [
        "accepted",
        "converted",
    ]
    display_status = (
        "expired"
        if is_expired and quote_obj.status in ["draft", "sent", "viewed"]
        else quote_obj.status
    )

    return QuoteResponse(
        id=quote_obj.id,
        workspace_id=quote_obj.workspace_id,
        client_id=quote_obj.client_id,
        client_name=c_name,
        client_email=c_email,
        quote_number=quote_obj.quote_number,
        sequence_number=quote_obj.sequence_number,
        version=quote_obj.version,
        currency=quote_obj.currency,
        status=display_status,
        is_expired=is_expired,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        share_token=quote_obj.share_token,
        share_url=share_url,
        whatsapp_share_url=wa_url,
        sent_at=quote_obj.sent_at,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=display_status,
        created_at=quote_obj.created_at,
        updated_at=quote_obj.updated_at,
    )


def map_public_quote_view(
    quote_obj: Quote,
    client_name: Optional[str],
    workspace: Workspace,
    *,
    status: Optional[str] = None,
    is_expired: Optional[bool] = None,
    effective_status: Optional[str] = None,
    show_badge: Optional[bool] = None,
) -> PublicQuoteView:
    if is_expired is None:
        is_expired = quote_obj.expires_at < date.today() and quote_obj.status not in [
            "accepted",
            "converted",
        ]
    if status is None:
        status = (
            "expired"
            if is_expired and quote_obj.status in ["draft", "sent", "viewed"]
            else quote_obj.status
        )
    if effective_status is None:
        effective_status = quote_obj.status
    if show_badge is None:
        show_badge = workspace.tier == "free"

    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    return PublicQuoteView(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        currency=quote_obj.currency,
        status=status,
        is_expired=is_expired,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=effective_status,
        show_badge=show_badge,
    )


def map_quote_send_response(
    quote_obj: Quote, workspace: Workspace, share_url: str
) -> QuoteSendResponse:
    client = quote_obj.client if "client" in quote_obj.__dict__ else None
    c_name = client.name if client else None
    c_phone = client.phone if client else None

    wa_url = generate_quote_whatsapp_url(
        phone=c_phone,
        client_name=c_name or "Client",
        quote_number=quote_obj.quote_number,
        total_formatted=format_money(quote_obj.total_minor, quote_obj.currency),
        business_name=workspace.business_name,
        share_url=share_url,
        expires_at=quote_obj.expires_at,
    )

    return QuoteSendResponse(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        version=quote_obj.version,
        status=quote_obj.status,
        share_token=quote_obj.share_token,
        share_url=share_url,
        whatsapp_share_url=wa_url,
        sent_at=quote_obj.sent_at,
    )
