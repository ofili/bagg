from datetime import datetime
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class RecurringInvoiceSchedule(Base):
    __tablename__ = "recurring_invoice_schedules"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("ris_"),
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
    created_by_user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    payment_profile_id = Column(
        String,
        ForeignKey("payment_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )

    name = Column(String(160), nullable=False)
    currency = Column(String(3), nullable=False)

    # daily, weekly, monthly, quarterly, yearly
    frequency = Column(String(16), nullable=False)
    interval = Column(Integer, nullable=False, default=1)

    start_date = Column(Date, nullable=False)
    next_run_date = Column(Date, nullable=False)

    # Preserved independently of next_run_date so that a schedule
    # starting on the 29th, 30th or 31st returns to that day when
    # a later month supports it.
    anchor_day = Column(Integer, nullable=False)
    anchor_month = Column(Integer, nullable=False)

    # never, after_count, on_date
    end_rule = Column(String(16), nullable=False, default="never")
    end_after_count = Column(Integer, nullable=True)
    end_date = Column(Date, nullable=True)

    # draft, auto_issue
    issue_mode = Column(
        String(16),
        nullable=False,
        default="draft",
        server_default="draft",
    )

    # Generate a draft this many days before its period date.
    draft_lead_days = Column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
    )

    # Due date = generated invoice issue date + this offset.
    due_date_offset_days = Column(
        Integer,
        nullable=False,
        default=14,
        server_default="14",
    )

    review_reminder_days = Column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    # Optional policy: pause when the most recent preceding invoice
    # remains unpaid this many days after its due date.
    pause_if_previous_overdue_days = Column(Integer, nullable=True)

    timezone = Column(
        String(64),
        nullable=False,
        default="Africa/Lagos",
        server_default="Africa/Lagos",
    )

    # Immutable-at-generation snapshot of the schedule's current terms.
    items = Column(JSON, nullable=False)
    discount_minor = Column(BigInteger, nullable=False, default=0)
    tax_rate_percent = Column(Float, nullable=False, default=0.0)
    wht_rate_percent = Column(Float, nullable=False, default=0.0)
    deposit_percentage = Column(Float, nullable=True)
    deposit_amount_minor = Column(BigInteger, nullable=True)
    direct_checkout_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    notes = Column(Text, nullable=True)

    # active, paused, cancelled, completed
    status = Column(
        String(16),
        nullable=False,
        default="active",
        server_default="active",
    )

    generated_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    paused_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # A schedule may be paused and resumed with an explicit missed-period
    # policy. These fields preserve the pause boundary for that decision.
    pause_started_on = Column(Date, nullable=True)
    resume_policy = Column(String(24), nullable=True)

    # Review reminders are tracked per generated invoice, not merely
    # per schedule, to prevent repeated notifications after worker retries.
    last_review_reminder_invoice_id = Column(String, nullable=True)
    last_review_reminder_at = Column(DateTime(timezone=True), nullable=True)

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

    workspace = relationship("Workspace")
    client = relationship("Client")
    created_by = relationship("User")
    payment_profile = relationship("PaymentProfile")

    invoices = relationship(
        "Invoice",
        back_populates="recurring_schedule",
        passive_deletes=True,
    )

    revisions = relationship(
        "RecurringInvoiceScheduleRevision",
        back_populates="schedule",
        cascade="all, delete-orphan",
        order_by="RecurringInvoiceScheduleRevision.version",
        lazy="selectin",
    )

    __table_args__ = (
        Index(
            "ix_recurring_schedules_workspace_status",
            "workspace_id",
            "status",
        ),
        Index(
            "ix_recurring_schedules_status_next_run",
            "status",
            "next_run_date",
        ),
        Index(
            "ix_recurring_schedules_client",
            "workspace_id",
            "client_id",
        ),
    )


class RecurringInvoiceScheduleRevision(Base):
    __tablename__ = "recurring_invoice_schedule_revisions"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("risr_"),
    )

    schedule_id = Column(
        String,
        ForeignKey(
            "recurring_invoice_schedules.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    version = Column(Integer, nullable=False)
    effective_from = Column(Date, nullable=False)

    currency = Column(String(3), nullable=False)
    items_snapshot = Column(JSON, nullable=False)

    discount_minor = Column(BigInteger, nullable=False, default=0)
    tax_rate_percent = Column(Float, nullable=False, default=0.0)
    wht_rate_percent = Column(Float, nullable=False, default=0.0)
    deposit_percentage = Column(Float, nullable=True)
    deposit_amount_minor = Column(BigInteger, nullable=True)
    direct_checkout_enabled = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)

    change_reason = Column(String(255), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    schedule = relationship(
        "RecurringInvoiceSchedule",
        back_populates="revisions",
    )

    __table_args__ = (
        UniqueConstraint(
            "schedule_id",
            "version",
            name="uq_recurring_schedule_revision_version",
        ),
        Index(
            "ix_recurring_schedule_revisions_effective",
            "schedule_id",
            "effective_from",
        ),
    )