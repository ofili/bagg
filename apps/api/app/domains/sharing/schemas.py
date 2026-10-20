from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.domains.invoices.schemas import InvoiceResponse
from app.domains.payments.schemas import PaymentProfileResponse

class CommentCreate(BaseModel):
    line_item_id: Optional[str] = None
    author_name: str
    message: str

class CommentResponse(BaseModel):
    id: str
    invoice_id: str
    line_item_id: Optional[str] = None
    author_name: str
    message: str
    created_at: datetime

class PublicInvoiceView(BaseModel):
    invoice: InvoiceResponse
    payment_profile: Optional[PaymentProfileResponse] = None
    comments: List[CommentResponse] = []
    is_revised: bool = False
    revision_banner: Optional[str] = None
    revisions_count: int = 0
