from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Optional
from datetime import date, datetime
from app.core.money import validate_currency


class LineItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    position: int = 0
    description: str = Field(..., min_length=1)
    quantity: int = Field(default=1, ge=1)
    unit_price_minor: int = Field(default=0, ge=0)
    total_minor: Optional[int] = None


class InvoiceCreate(BaseModel):
    client_id: str
    currency: str = "NGN"
    issue_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    items: List[LineItemSchema] = []
    discount_minor: int = Field(default=0, ge=0)
    tax_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    notes: Optional[str] = None
    payment_profile_id: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        clean = v.upper().strip()
        if not validate_currency(clean):
            raise ValueError(f"Currency '{v}' is not supported. Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR.")
        return clean


class InvoiceUpdate(BaseModel):
    client_id: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    items: Optional[List[LineItemSchema]] = None
    discount_minor: Optional[int] = Field(None, ge=0)
    tax_rate_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    notes: Optional[str] = None
    payment_profile_id: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    client_id: str
    client_name: Optional[str] = None
    invoice_number: str
    sequence_number: int
    currency: str
    status: str
    issue_date: date
    due_date: date
    items: List[LineItemSchema] = []
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    amount_paid_minor: int = 0
    payment_profile_id: Optional[str] = None
    notes: Optional[str] = None
    share_token: Optional[str] = None
    version: int = 1
    created_at: datetime
    updated_at: datetime
