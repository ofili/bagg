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
