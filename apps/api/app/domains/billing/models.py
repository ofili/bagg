from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    CheckConstraint,
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
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("sub_"))
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    tier = Column(
        String, nullable=False, default="free"
    )  # free, creator_pro, professional
    status = Column(
        String, nullable=False, default="active", index=True
    )  # active, past_due, canceled, downgraded
    plan_code = Column(String, nullable=True)
    processor_plan_code = Column(String(128), nullable=True)
    currency = Column(String, nullable=False, default="NGN")
    amount_minor = Column(BigInteger, nullable=False, default=0)
    billing_interval = Column(
        String, nullable=False, default="annual"
    )  # annual, monthly
    processor = Column(String, nullable=False, default="paystack")  # paystack, mor
    processor_subscription_code = Column(String, nullable=True)
    processor_customer_code = Column(String, nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    grace_period_end = Column(DateTime(timezone=True), nullable=True)
    dunning_attempts = Column(Integer, nullable=False, default=0)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace = relationship("Workspace", lazy="selectin")

    __table_args__ = (
        Index(
            "ix_subscriptions_cancel_period",
            "cancel_at_period_end",
            "current_period_end",
        ),
        Index("ix_subscriptions_grace_expiry", "status", "grace_period_end"),
    )


class CreditLedgerEntry(Base):
    __tablename__ = "credit_ledger_entries"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("cred_"))
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Integer, nullable=False)  # positive = credit, negative = debit
    balance_after = Column(Integer, nullable=False)
    reason = Column(
        String, nullable=False
    )  # pack_purchase, send_deduction, send_refund, initial_grant
    description = Column(String, nullable=True)
    reference = Column(String, nullable=True, index=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

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

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BillingCheckout(Base):
    """Server-created purchase intent; webhook metadata alone never grants value."""

    __tablename__ = "billing_checkouts"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("bco_"))
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    provider = Column(String(32), nullable=False, default="paystack")
    provider_reference = Column(String(128), nullable=False, unique=True)
    purchase_type = Column(String(32), nullable=False)
    plan_code = Column(String(64), nullable=True)
    processor_plan_code = Column(String(128), nullable=True)
    credits = Column(Integer, nullable=True)
    currency = Column(String(3), nullable=False)
    amount_minor = Column(BigInteger, nullable=False)
    status = Column(String(24), nullable=False, default="initializing")
    provider_transaction_id = Column(String(128), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    billing_interval = Column(String(16), nullable=True)
    idempotency_key = Column(String(128), nullable=True)
    authorization_url = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace = relationship("Workspace", lazy="selectin")

    __table_args__ = (
        CheckConstraint(
            "amount_minor > 0", name="ck_billing_checkouts_amount_positive"
        ),
        CheckConstraint(
            "purchase_type IN ('subscription', 'credit_pack')",
            name="ck_billing_checkouts_purchase_type",
        ),
        CheckConstraint(
            "status IN ('initializing', 'pending', 'succeeded', 'failed')",
            name="ck_billing_checkouts_status",
        ),
        UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_billing_checkout_workspace_idempotency",
        ),
        Index("ix_billing_checkouts_workspace_status", "workspace_id", "status"),
    )
