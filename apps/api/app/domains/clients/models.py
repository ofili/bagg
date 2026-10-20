from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("cl_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)  # Optional for phone-only / WhatsApp clients (US-CLI-01)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    preferred_currency = Column(String, nullable=False, default="NGN")
    default_payment_terms_days = Column(Integer, nullable=False, default=14)
    tax_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace", back_populates="clients")

    __table_args__ = (
        Index("ix_clients_workspace_name", "workspace_id", "name"),
    )
