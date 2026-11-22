from datetime import datetime, date, timezone
from sqlalchemy import (
    CheckConstraint,
    Column,
    String,
    Integer,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

from app.core.references import generate_bagg_reference

def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


def generate_verification_code() -> str:
    return f"BAGG-{uuid.uuid4().hex[:8].upper()}"


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("rcp_"))
    bagg_reference = Column(
        String(48),
        nullable=False,
        unique=True,
        default=lambda: generate_bagg_reference("receipt"),
    )
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_claim_id = Column(String, ForeignKey("payment_claims.id", ondelete="SET NULL"), nullable=True, index=True)

    receipt_number = Column(String, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, index=True)  # NGN, USD, GBP, EUR, GHS, KES, ZAR
    amount_paid_minor = Column(BigInteger, nullable=False)
    balance_remaining_minor = Column(BigInteger, nullable=False, default=0)

    payment_date = Column(Date, nullable=False, default=date.today)
    payment_method = Column(String, nullable=False, default="bank_transfer")  # bank_transfer, card, mobile_money, cash, manual
    reference = Column(String, nullable=True)
    payer_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Explicit confirmation provenance: who or what proved the funds arrived.
    confirmation_source = Column(String, nullable=False, default="legacy")
    confirmed_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    provider = Column(String, nullable=True)  # paystack, flutterwave, bank, cash
    provider_reference = Column(String, nullable=True, index=True)
    evidence_classification = Column(
        String(32),
        nullable=False,
        default="legacy_unclassified",
        server_default="legacy_unclassified",
    )

    reversals = relationship(
        "ReceiptReversal",
        back_populates="receipt",
        order_by="ReceiptReversal.created_at",
        lazy="selectin",
    )

    # Verification Stamp (US-RCP-01)
    is_verified = Column(Boolean, nullable=False, default=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_code = Column(String, nullable=False, default=generate_verification_code)

    # Share token for public client access (US-RCP-02)
    share_token = Column(String, unique=True, index=True, nullable=True)
    share_token_hash = Column(String, unique=True, index=True, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace")
    client = relationship("Client", lazy="selectin")
    invoice = relationship("Invoice", back_populates="receipts", lazy="selectin")
    claim = relationship("PaymentClaim", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("workspace_id", "receipt_number", name="uq_workspace_receipt_number"),
        UniqueConstraint(
            "workspace_id",
            "provider_reference",
            name="uq_workspace_receipt_provider_reference",
        ),
        Index("ix_receipts_workspace_client", "workspace_id", "client_id"),
        Index("ix_receipts_invoice", "invoice_id"),
    )


class ReceiptReversal(Base):
    __tablename__ = "receipt_reversals"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("rvr_"),
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_id = Column(
        String,
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    receipt_id = Column(
        String,
        ForeignKey("receipts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    amount_minor = Column(BigInteger, nullable=False)
    reversal_type = Column(String(24), nullable=False)
    status = Column(String(16), nullable=False, default="posted")
    reason = Column(Text, nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    evidence_reference = Column(String(512), nullable=True)

    reversed_by_user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    posted_at = Column(DateTime(timezone=True), nullable=True)

    receipt = relationship("Receipt", back_populates="reversals")

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_receipt_reversals_workspace_idempotency",
        ),
        CheckConstraint(
            "amount_minor > 0",
            name="ck_receipt_reversals_amount_positive",
        ),
        CheckConstraint(
            "reversal_type IN ('correction', 'refund', 'chargeback')",
            name="ck_receipt_reversals_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'posted', 'failed')",
            name="ck_receipt_reversals_status",
        ),
        Index(
            "ix_receipt_reversals_receipt_status",
            "receipt_id",
            "status",
        ),
        Index(
            "ix_receipt_reversals_invoice_created",
            "invoice_id",
            "created_at",
        ),
    )
