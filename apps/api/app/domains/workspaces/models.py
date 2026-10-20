from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("ws_"))
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, default="My Workspace")
    business_name = Column(String, nullable=False, default="My Business")
    logo_url = Column(String, nullable=True)
    brand_color = Column(String, nullable=False, default="#10B981")
    country = Column(String, nullable=False, default="NG")
    default_currency = Column(String, nullable=False, default="NGN")
    tax_id = Column(String, nullable=True)
    address = Column(String, nullable=True)
    tier = Column(String, nullable=False, default="free")
    invoice_prefix = Column(String, nullable=False, default="INV-")
    next_invoice_number = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", back_populates="workspaces")
    clients = relationship("Client", back_populates="workspace", cascade="all, delete-orphan")
