from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class InvoiceComment(Base):
    __tablename__ = "invoice_comments"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("cmt_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    line_item_id = Column(String, ForeignKey("invoice_line_items.id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_from_client = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="comments")
