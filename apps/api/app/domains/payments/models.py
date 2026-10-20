from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class PaymentProfile(Base):
    __tablename__ = "payment_profiles"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("pp_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    currency = Column(String, nullable=False, index=True)  # NGN, USD, GBP, EUR, GHS, KES, ZAR

    # Bank Transfer details
    bank_name = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    routing_number = Column(String, nullable=True)

    # Payment Link details (PayPal, Payoneer, Stripe checkout)
    payment_link = Column(String, nullable=True)

    # Mobile Money details (M-Pesa, MTN MoMo, Airtel)
    mobile_money_number = Column(String, nullable=True)

    # Freeform payment instructions
    instructions = Column(String, nullable=True)

    # Default profile for this currency
    is_default = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_payment_profiles_workspace_currency", "workspace_id", "currency"),
    )
