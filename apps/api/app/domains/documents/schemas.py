from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class InvoiceDocumentLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    quantity: int = Field(ge=0)
    unit_price_minor: int
    total_minor: int

    # Presentation values consumed by the existing Jinja2 template.
    formatted_unit_price: str
    formatted_total: str


class InvoiceDocument(BaseModel):
    """Renderer-independent representation of an invoice.

    Financial values remain in integer minor units. This model is not a
    financial authority and must never recalculate invoice totals.
    """

    model_config = ConfigDict(extra="forbid")

    document_type: Literal["invoice"] = "invoice"
    source_id: str
    workspace_id: str
    invoice_number: str
    version: int = Field(ge=1)

    currency: str
    issue_date: date | None = None
    due_date: date | None = None

    subtotal_minor: int
    discount_minor: int
    tax_minor: int
    total_minor: int
    wht_minor: int
    net_payable_minor: int

    items: list[InvoiceDocumentLineItem]

    # Values formatted for display; never use these for arithmetic.
    formatted_issue_date: str
    formatted_due_date: str
    formatted_subtotal: str
    formatted_tax: str
    formatted_total: str
    formatted_wht: str
    formatted_net_payable: str


class ReceiptDocument(BaseModel):
    """Renderer-independent representation of an issued receipt.

    The receipt and invoice domains remain authoritative for payment facts.
    This schema contains presentation data only.
    """

    model_config = ConfigDict(extra="forbid")

    document_type: Literal["receipt"] = "receipt"
    source_id: str
    workspace_id: str
    receipt_number: str
    invoice_number: str

    currency: str
    payment_date: date
    payment_method: str
    reference: str
    payer_name: str
    business_name: str

    amount_paid_minor: int
    balance_remaining_minor: int

    verification_code: str
    confirmation_source: str
    confirmation_heading: str
    confirmation_stamp: str
    confirmation_disclaimer: str

    formatted_payment_date: str
    formatted_amount_paid: str
    formatted_balance_remaining: str
