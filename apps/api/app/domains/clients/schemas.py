from pydantic import BaseModel, EmailStr
from typing import Optional

class ClientBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: str = "NGN"
    default_payment_terms_days: int = 14
    tax_id: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: str
    workspace_id: str
    total_invoiced_minor: int = 0
    total_paid_minor: int = 0
    total_outstanding_minor: int = 0
