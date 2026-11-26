import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
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


class Engagement(Base):
    """Represents an agreed body of work between a workspace and a client."""

    __tablename__ = "engagements"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("eng_"))
    bagg_reference = Column(
        String(48),
        nullable=False,
        unique=True,
        default=lambda: generate_bagg_reference("engagement"),
    )
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        String,
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quote_id = Column(
        String,
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        unique=True,
    )

    title = Column(String(255), nullable=False)
    engagement_type = Column(String(32), nullable=False, default="one_off")  # one_off, retainer
    status = Column(
        String(32),
        nullable=False,
        default="active",
        index=True,
    )  # draft, active, on_hold, completed, closed, cancelled
    currency = Column(String(3), nullable=False, index=True)

    start_date = Column(Date, nullable=True)
    target_completion_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Immutable snapshot of the accepted commercial terms (scope, fees, policy)
    commercial_baseline = Column(JSON, nullable=True)

    # Effective caps including accepted change requests (minor integer units)
    baseline_expense_cap_minor = Column(BigInteger, nullable=True)
    effective_expense_cap_minor = Column(BigInteger, nullable=True)
    per_expense_threshold_minor = Column(BigInteger, nullable=True)
    expense_policy_snapshot = Column(JSON, nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspace = relationship("Workspace")
    client = relationship("Client", lazy="selectin")
    quote = relationship("Quote", foreign_keys=[quote_id], lazy="selectin")

    __table_args__ = (
        Index("ix_engagements_workspace_status", "workspace_id", "status"),
        Index("ix_engagements_workspace_client", "workspace_id", "client_id"),
    )


class ScopeChangeRequest(Base):
    """Represents a formal scope or expense-cap change request (BAG-EXP-004, FR-085, AC-019)."""

    __tablename__ = "scope_change_requests"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("scr_"))
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
    expense_id = Column(
        String,
        ForeignKey("expenses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    change_type = Column(String(32), nullable=False, default="expense_cap_increase")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    delta_amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(3), nullable=False)

    status = Column(
        String(32),
        nullable=False,
        default="pending",
        index=True,
    )  # pending, accepted, declined

    # Only the SHA-256 hash is persisted; the raw token is returned once in the
    # link URL and never stored in the database (prevents plaintext leaks in backups).
    approval_token_hash = Column(String, unique=True, index=True, nullable=True)
    approval_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_name = Column(String(255), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    decline_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    engagement = relationship("Engagement", lazy="selectin")

    __table_args__ = (
        Index("ix_scope_changes_workspace_engagement", "workspace_id", "engagement_id"),
    )
