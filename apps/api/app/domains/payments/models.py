import uuid
from datetime import date

from sqlalchemy import Column, String, Boolean, DateTime, Date, BigInteger, ForeignKey, Index, Text, JSON, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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


class PaymentClaim(Base):
    __tablename__ = "payment_claims"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("claim_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_minor = Column(BigInteger, nullable=False)
    payment_date = Column(Date, nullable=False, default=date.today)
    reference = Column(String, nullable=True)
    proof_file_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending", index=True)  # pending, confirmed, rejected
    rejection_reason = Column(Text, nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="claims")


class InvoicePaymentAttempt(Base):
    """
    Durable record of a gateway checkout attempt.

    A payment attempt is never deleted when an invoice is recalled.
    The provider reference remains the authoritative lookup key for
    a later success webhook.

    Statuses:
      initializing - attempt persisted, gateway initialization in progress
      pending      - checkout initialized; awaiting provider outcome
      processing   - provider/browser indicates processing
      succeeded    - successful payment recorded as a receipt
      failed       - provider definitively rejected/failed the payment
      invalidated  - Bagg no longer presents this checkout as payable
      reconciliation_required - success arrived after invalidation
    """

    __tablename__ = "invoice_payment_attempts"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("ipat_"),
    )

    invoice_id = Column(
        String,
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    provider = Column(String(32), nullable=False, default="paystack")
    provider_reference = Column(String(128), nullable=False)
    status = Column(
        String(40),
        nullable=False,
        default="initializing",
        index=True,
    )

    amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(3), nullable=False)

    # The revision that was active when this checkout was created.
    invoice_version = Column(Integer, nullable=False, default=1)

    checkout_url = Column(Text, nullable=True)

    # Paystack's verified transaction ID, when available.
    provider_transaction_id = Column(String(128), nullable=True)

    provider_status = Column(String(64), nullable=True)
    provider_channel = Column(String(64), nullable=True)
    provider_paid_at = Column(DateTime(timezone=True), nullable=True)

    initialized_at = Column(DateTime(timezone=True), nullable=True)
    processing_at = Column(DateTime(timezone=True), nullable=True)
    invalidated_at = Column(DateTime(timezone=True), nullable=True)
    succeeded_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Links the successful attempt to its authoritative receipt.
    receipt_id = Column(
        String,
        ForeignKey("receipts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # True when a success was received after local checkout invalidation.
    reconciliation_required = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    reconciliation_reason = Column(Text, nullable=True)

    # Keep the provider response for audit/reconciliation. Do not store
    # card details, authorization codes, or secrets here.
    provider_payload = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_reference",
            name="uq_invoice_payment_attempt_provider_reference",
        ),
        Index(
            "ix_invoice_payment_attempt_invoice_status",
            "invoice_id",
            "status",
        ),
        Index(
            "ix_invoice_payment_attempt_workspace_created",
            "workspace_id",
            "created_at",
        ),
    )

