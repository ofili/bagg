from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class AbuseReport(Base):
    __tablename__ = "abuse_reports"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("abus_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    reporter_email = Column(String, nullable=True)
    reporter_name = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    share_token = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, reviewed, dismissed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    workspace_restricted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
