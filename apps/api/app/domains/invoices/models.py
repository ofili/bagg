from datetime import datetime, date, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Text,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("inv_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_number = Column(String, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, index=True)  # NGN, USD, GBP, EUR, GHS, KES, ZAR
    status = Column(String, nullable=False, default="draft", index=True)  # draft, sent, viewed, payment_claimed, paid, cancelled

    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False)

    # Financial arithmetic strictly in minor integer units (US-INV-02)
    subtotal_minor = Column(BigInteger, nullable=False, default=0)
    discount_minor = Column(BigInteger, nullable=False, default=0)
    tax_rate_percent = Column(Float, nullable=False, default=0.0)
    tax_minor = Column(BigInteger, nullable=False, default=0)
    total_minor = Column(BigInteger, nullable=False, default=0)
    amount_paid_minor = Column(BigInteger, nullable=False, default=0)

    payment_profile_id = Column(String, ForeignKey("payment_profiles.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    # Share token for public client access (US-DEL-01)
    share_token = Column(String, unique=True, index=True, nullable=True)
    share_token_hash = Column(String, unique=True, index=True, nullable=True)

    # Delivery & Tracking (US-DEL-03, US-DEL-04, US-CLV-01)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    email_delivery_status = Column(String, nullable=True)  # queued, delivered, bounced, opened
    pdf_url = Column(String, nullable=True)

    # Version tracking for immutable revisions (US-DEL-05)
    version = Column(Integer, nullable=False, default=1)
    last_revised_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace")
    client = relationship("Client", lazy="selectin")
    payment_profile = relationship("PaymentProfile", lazy="selectin")
    items = relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceLineItem.position",
        lazy="selectin",
    )
    revisions = relationship(
        "InvoiceRevision",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceRevision.version",
        lazy="selectin",
    )
    comments = relationship(
        "InvoiceComment",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceComment.created_at",
        lazy="selectin",
    )
    claims = relationship(
        "PaymentClaim",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="PaymentClaim.created_at.desc()",
        lazy="selectin",
    )
    reminders = relationship(
        "ReminderJob",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="ReminderJob.due_at",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "invoice_number", name="uq_workspace_invoice_number"),
        Index("ix_invoices_workspace_status", "workspace_id", "status"),
    )


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("item_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    description = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price_minor = Column(BigInteger, nullable=False, default=0)
    total_minor = Column(BigInteger, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="items")


class InvoiceRevision(Base):
    __tablename__ = "invoice_revisions"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("rev_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    subtotal_minor = Column(BigInteger, nullable=False)
    discount_minor = Column(BigInteger, nullable=False)
    tax_rate_percent = Column(Float, nullable=False)
    tax_minor = Column(BigInteger, nullable=False)
    total_minor = Column(BigInteger, nullable=False)
    items_snapshot = Column(JSON, nullable=False)
    revised_reason = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="revisions")
