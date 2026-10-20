from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

class LineItemSchema(BaseModel):
    id: Optional[str] = None
    description: str
    quantity: int = Field(default=1, ge=1)
    unit_price_minor: int = Field(default=0, ge=0)
    total_minor: Optional[int] = None

class InvoiceCreate(BaseModel):
    client_id: str
    currency: str = "NGN"
    issue_date: date
    due_date: date
    items: List[LineItemSchema]
    discount_minor: int = 0
    tax_rate_percent: float = 0.0
    notes: Optional[str] = None
    payment_profile_id: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    workspace_id: str
    client_id: str
    invoice_number: str
    currency: str
    status: str
    issue_date: date
    due_date: date
    items: List[LineItemSchema]
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    amount_paid_minor: int = 0
    notes: Optional[str] = None
    share_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime
