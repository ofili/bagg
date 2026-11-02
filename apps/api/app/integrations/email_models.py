import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    Index,
    func,
)
from app.core.database import Base


def generate_email_id() -> str:
    return f"eml_{uuid.uuid4().hex}"


def generate_attempt_id() -> str:
    return f"eat_{uuid.uuid4().hex}"


class EmailOutbox(Base):
    __tablename__ = "email_outbox"

    id = Column(
        String,
        primary_key=True,
        default=generate_email_id,
    )

    provider = Column(String(50), nullable=True)

    message_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(100), nullable=False)

    encrypted_payload = Column(Text, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    attempts = Column(Integer, nullable=False, default=0, server_default="0")

    available_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String(100), nullable=True)

    sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    last_provider = Column(String(50), nullable=True)
    last_error_code = Column(String(100), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_email_outbox_status_available",
            "status",
            "available_at",
        ),
        Index(
            "ix_email_outbox_aggregate_type",
            "aggregate_id",
            "message_type",
        ),
        Index(
            "ix_email_outbox_created_at",
            "created_at",
        ),
        Index(
            "ix_email_outbox_processing_lease",
            "status",
            "locked_at",
        ),
    )


class EmailDeliveryAttempt(Base):
    __tablename__ = "email_delivery_attempts"

    id = Column(
        String,
        primary_key=True,
        default=generate_attempt_id,
    )

    outbox_id = Column(
        String,
        ForeignKey("email_outbox.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    attempt_number = Column(Integer, nullable=False)
    provider = Column(String(50), nullable=False)
    outcome = Column(String(30), nullable=False)
    error_code = Column(String(100), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_email_attempt_outbox_number",
            "outbox_id",
            "attempt_number",
            unique=True,
        ),
    )
