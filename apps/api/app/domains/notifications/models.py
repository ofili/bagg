from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("ntf_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(String, nullable=False)  # "client_comment", "business_reply", "payment_claimed", "document_viewed"
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    document_type = Column(String, nullable=False)  # "invoice" | "quote"
    document_id = Column(String, nullable=False, index=True)
    document_number = Column(String, nullable=False)
    comment_id = Column(String, nullable=True)
    link_url = Column(String, nullable=False)  # e.g. "/invoices/inv_123#comments"

    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workspace = relationship("Workspace")
    recipient = relationship("User")
