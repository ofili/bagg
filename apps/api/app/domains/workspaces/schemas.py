from pydantic import BaseModel
from typing import Optional

class WorkspaceBase(BaseModel):
    name: str = "My Workspace"
    business_name: str = "My Business"
    brand_color: Optional[str] = "#10B981"
    default_currency: str = "NGN"
    country: str = "NG"
    tax_id: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: str = "INV-"
    quote_prefix: str = "QOT-"

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    brand_color: Optional[str] = None
    default_currency: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: Optional[str] = None
    quote_prefix: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: str
    next_invoice_number: int = 1
    next_quote_number: int = 1
