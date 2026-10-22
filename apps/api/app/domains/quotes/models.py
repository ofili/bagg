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


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("qot_"))
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True)
    quote_number = Column(String, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, index=True)  # NGN, USD, GBP, EUR, GHS, KES, ZAR
    status = Column(String, nullable=False, default="draft", index=True)  # draft, issued, sent, viewed, accepted, declined, converted, expired

    issue_date = Column(Date, nullable=False, default=date.today)
    expires_at = Column(Date, nullable=False)  # Expiration date (US-QOT-01)

    version = Column(Integer, nullable=False, default=1)
    last_revised_at = Column(DateTime(timezone=True), nullable=True)

    # Financial arithmetic strictly in minor integer units (US-QOT-01)
    subtotal_minor = Column(BigInteger, nullable=False, default=0)
    discount_minor = Column(BigInteger, nullable=False, default=0)
    tax_rate_percent = Column(Float, nullable=False, default=0.0)
    tax_minor = Column(BigInteger, nullable=False, default=0)
    total_minor = Column(BigInteger, nullable=False, default=0)  # Gross Total

    # Withholding Tax (WHT) Tracking
    wht_rate_percent = Column(Float, nullable=False, default=0.0)
    wht_minor = Column(BigInteger, nullable=False, default=0)
    net_payable_minor = Column(BigInteger, nullable=False, default=0)

    # Milestone / Upfront Deposit Settings
    deposit_percentage = Column(Float, nullable=True)
    deposit_amount_minor = Column(BigInteger, nullable=True)

    notes = Column(Text, nullable=True)

    # Share token for public client access (US-QOT-02)
    share_token = Column(String, unique=True, index=True, nullable=True)
    share_token_hash = Column(String, unique=True, index=True, nullable=True)

    # Delivery & Tracking (US-QOT-02)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)

    # Acceptance / Decline (US-QOT-02)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_name = Column(String, nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    decline_reason = Column(Text, nullable=True)

    # Converted Invoice Link (US-QOT-03)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace")
    client = relationship("Client", lazy="selectin")
    invoice = relationship("Invoice", foreign_keys=[invoice_id], lazy="selectin")
    items = relationship(
        "QuoteLineItem",
        back_populates="quote",
        cascade="all, delete-orphan",
        order_by="QuoteLineItem.position",
        lazy="selectin",
    )
    revisions = relationship(
        "QuoteRevision",
        back_populates="quote",
        cascade="all, delete-orphan",
        order_by="QuoteRevision.version",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "quote_number", name="uq_workspace_quote_number"),
        Index("ix_quotes_workspace_status", "workspace_id", "status"),
    )


class QuoteLineItem(Base):
    __tablename__ = "quote_line_items"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("qitem_"))
    quote_id = Column(String, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    description = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price_minor = Column(BigInteger, nullable=False, default=0)
    total_minor = Column(BigInteger, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    quote = relationship("Quote", back_populates="items")


class QuoteRevision(Base):
    __tablename__ = "quote_revisions"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("qrev_"))
    quote_id = Column(String, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    subtotal_minor = Column(BigInteger, nullable=False)
    discount_minor = Column(BigInteger, nullable=False)
    tax_rate_percent = Column(Float, nullable=False)
    tax_minor = Column(BigInteger, nullable=False)
    total_minor = Column(BigInteger, nullable=False)
    wht_rate_percent = Column(Float, nullable=False, default=0.0)
    wht_minor = Column(BigInteger, nullable=False, default=0)
    net_payable_minor = Column(BigInteger, nullable=False)
    deposit_amount_minor = Column(BigInteger, nullable=True)
    items_snapshot = Column(JSON, nullable=False)
    revised_reason = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    quote = relationship("Quote", back_populates="revisions")

    __table_args__ = (
        UniqueConstraint("quote_id", "version", name="uq_quote_version"),
    )
