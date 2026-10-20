from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("sub_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    tier = Column(String, nullable=False, default="free")  # free, creator_pro, professional
    status = Column(String, nullable=False, default="active", index=True)  # active, past_due, canceled, downgraded
    plan_code = Column(String, nullable=True)
    currency = Column(String, nullable=False, default="NGN")
    amount_minor = Column(BigInteger, nullable=False, default=0)
    billing_interval = Column(String, nullable=False, default="annual")  # annual, monthly
    processor = Column(String, nullable=False, default="paystack")  # paystack, mor
    processor_subscription_code = Column(String, nullable=True)
    processor_customer_code = Column(String, nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    grace_period_end = Column(DateTime(timezone=True), nullable=True)
    dunning_attempts = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace", lazy="selectin")


class CreditLedgerEntry(Base):
    __tablename__ = "credit_ledger_entries"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("cred_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # positive = credit, negative = debit
    balance_after = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)  # pack_purchase, send_deduction, failed_refund, initial_grant
    description = Column(String, nullable=True)
    reference = Column(String, nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workspace = relationship("Workspace", lazy="selectin")

    __table_args__ = (
        Index("ix_credit_ledger_workspace_created", "workspace_id", "created_at"),
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("wh_"))
    processor = Column(String, nullable=False, index=True)  # paystack, flutterwave, mor
    event_type = Column(String, nullable=False, index=True)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    payload = Column(JSON, nullable=False)
    processed = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
