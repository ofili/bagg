from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class ReminderJob(Base):
    __tablename__ = "reminder_jobs"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("rem_"))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_type = Column(String, nullable=False)  # upcoming_3d, due_today, overdue_3d, overdue_7d, custom
    due_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String, nullable=False, default="pending", index=True)  # pending, claimed, sent, cancelled, failed
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="reminders", lazy="selectin")

    __table_args__ = (
        Index("ix_reminder_jobs_status_due", "status", "due_at"),
    )
