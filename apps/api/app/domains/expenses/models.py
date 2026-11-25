import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
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
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.references import generate_bagg_reference


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Expense(Base):
    """Represents an engagement-related expense/pass-through cost (FR-081, FR-082)."""

    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("exp_"))
    bagg_reference = Column(
        String(48),
        nullable=False,
        unique=True,
        default=lambda: generate_bagg_reference("expense"),
    )
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    engagement_id = Column(
        String,
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        String,
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Financial arithmetic strictly in minor integer units (FR-081)
    amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(3), nullable=False, index=True)
    expense_date = Column(Date, nullable=False, default=date.today)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)  # travel, equipment, props, etc.

    # Visibility & Commercial flags (FR-081, FR-087, AC-025)
    billable = Column(Boolean, nullable=False, default=True)

    # Optional milestone or retainer period attachment
    milestone_id = Column(String(100), nullable=True)
    retainer_period = Column(String(32), nullable=True)

    # Receipt Attachment (FR-089, AC-026)
    receipt_filename = Column(String(255), nullable=True)
    receipt_storage_path = Column(String(500), nullable=True)
    receipt_content_type = Column(String(100), nullable=True)

    # Independent lifecycle states (FR-082)
    # 1. Approval state: not_required, pending_approval, approved, declined
    approval_status = Column(
        String(32),
        nullable=False,
        default="not_required",
        index=True,
    )
    approval_requested_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_name = Column(String(255), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    decline_reason = Column(Text, nullable=True)
    policy_snapshot_at_approval = Column(JSON, nullable=True)

    # 2. Invoicing state: uninvoiced, drafted, invoiced
    invoicing_status = Column(
        String(32),
        nullable=False,
        default="uninvoiced",
        index=True,
    )
    invoice_id = Column(
        String,
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoice_item_id = Column(
        String,
        ForeignKey("invoice_line_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoiced_at = Column(DateTime(timezone=True), nullable=True)

    # 3. Reimbursement state: unreimbursed, reimbursed (AC-024)
    reimbursement_status = Column(
        String(32),
        nullable=False,
        default="unreimbursed",
        index=True,
    )
    reimbursed_at = Column(DateTime(timezone=True), nullable=True)

    # Token for direct client approval link (FR-084)
    approval_token = Column(String, unique=True, index=True, nullable=True)
    approval_token_hash = Column(String, unique=True, index=True, nullable=True)
    approval_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace")
    engagement = relationship("Engagement", lazy="selectin")
    client = relationship("Client", lazy="selectin")
    invoice = relationship("Invoice", foreign_keys=[invoice_id], lazy="selectin")

    __table_args__ = (
        Index("ix_expenses_workspace_engagement", "workspace_id", "engagement_id"),
        Index("ix_expenses_workspace_billable", "workspace_id", "billable"),
        Index("ix_expenses_workspace_approval", "workspace_id", "approval_status"),
        Index("ix_expenses_workspace_invoicing", "workspace_id", "invoicing_status"),
    )
