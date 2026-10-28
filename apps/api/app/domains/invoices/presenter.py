from datetime import date
from typing import Optional
from urllib.parse import quote

from app.core.money import format_money
from app.domains.invoices.models import Invoice
from app.domains.invoices.schemas import (
    InvoiceReceiptSummary,
    InvoiceResponse,
    LineItemSchema,
)
from app.domains.lifecycle.service import (
    effective_invoice_status,
    invoice_days_overdue,
    invoice_is_overdue,
    invoice_payment_state,
    user_facing_invoice_status,
)
from app.domains.payments.schemas import PaymentClaimResponse


def generate_whatsapp_share_url(
    phone: Optional[str],
    client_name: str,
    invoice_number: str,
    total_formatted: str,
    business_name: str,
    share_url: str,
    due_date: date,
) -> str:
    """Generates a pre-filled 1-click WhatsApp message URL (US-DEL-02)."""
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = (
        f"Hi {client_name}, here is your invoice {invoice_number} for {total_formatted} "
        f"from {business_name}: {share_url}. Due on {due_date}. Thanks!"
    )
    return f"https://wa.me/{clean_phone}?text={quote(message)}"


def map_invoice_to_response(
    inv: Invoice,
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    client_email: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = "http://localhost:3000",
) -> InvoiceResponse:
    items_out = [
        LineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (inv.items or [])
    ]

    c_name = client_name
    c_phone = client_phone
    c_email = client_email
    if "client" in inv.__dict__ and inv.client:
        if not c_name:
            c_name = inv.client.name
        if not c_phone:
            c_phone = inv.client.phone
        if not c_email:
            c_email = inv.client.email

    share_url = f"{base_url}/i/{inv.share_token}" if inv.share_token else ""
    formatted_tot = format_money(inv.total_minor, inv.currency)
    wa_url = (
        generate_whatsapp_share_url(
            phone=c_phone,
            client_name=c_name or "Client",
            invoice_number=inv.invoice_number,
            total_formatted=formatted_tot,
            business_name=business_name,
            share_url=share_url,
            due_date=inv.due_date,
        )
        if inv.share_token
        else None
    )

    latest_claim = None
    if "claims" in inv.__dict__ and inv.claims:
        latest_claim = PaymentClaimResponse.model_validate(inv.claims[0])

    latest_receipt = None
    if "receipts" in inv.__dict__ and inv.receipts:
        latest_receipt = InvoiceReceiptSummary.model_validate(inv.receipts[0])

    net_payable = (
        inv.net_payable_minor
        if (inv.net_payable_minor and inv.net_payable_minor > 0)
        else inv.total_minor
    )
    balance_due = max(0, net_payable - (inv.amount_paid_minor or 0))

    return InvoiceResponse(
        id=inv.id,
        workspace_id=inv.workspace_id,
        client_id=inv.client_id,
        client_name=c_name,
        client_email=c_email,
        invoice_number=inv.invoice_number,
        sequence_number=inv.sequence_number,
        quote_id=inv.quote_id,
        currency=inv.currency,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        items=items_out,
        subtotal_minor=inv.subtotal_minor,
        discount_minor=inv.discount_minor,
        tax_rate_percent=inv.tax_rate_percent,
        tax_minor=inv.tax_minor,
        total_minor=inv.total_minor,
        wht_rate_percent=inv.wht_rate_percent or 0.0,
        wht_minor=inv.wht_minor or 0,
        net_payable_minor=net_payable,
        wht_credit_note_number=inv.wht_credit_note_number,
        deposit_percentage=inv.deposit_percentage,
        deposit_amount_minor=inv.deposit_amount_minor,
        deposit_due_date=inv.deposit_due_date,
        amount_paid_minor=inv.amount_paid_minor or 0,
        remaining_minor=max(0, net_payable - (inv.amount_paid_minor or 0)),
        balance_due_minor=balance_due,
        direct_checkout_enabled=(
            inv.direct_checkout_enabled
            if inv.direct_checkout_enabled is not None
            else True
        ),
        direct_payment_reference=inv.direct_payment_reference,
        payment_processing_at=inv.payment_processing_at,
        payment_state=invoice_payment_state(inv),
        effective_status=effective_invoice_status(inv),
        user_facing_status=user_facing_invoice_status(inv),
        is_overdue=invoice_is_overdue(inv),
        days_overdue=invoice_days_overdue(inv),
        paid_at=inv.paid_at,
        payment_profile_id=inv.payment_profile_id,
        notes=inv.notes,
        share_token=inv.share_token,
        sent_at=inv.sent_at,
        email_delivery_status=inv.email_delivery_status,
        pdf_url=inv.pdf_url,
        version=inv.version,
        last_revised_at=inv.last_revised_at,
        whatsapp_share_url=wa_url,
        latest_claim=latest_claim,
        latest_receipt=latest_receipt,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )
