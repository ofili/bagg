
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Integer,
    Index,
    Text,
    func,
)

from app.core.database import Base


class EmailChangeRequest(Base):
    __tablename__ = "email_change_requests"

    id = Column(String, primary_key=True)

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Snapshot of the account identity when the request was initiated.
    current_email = Column(String, nullable=False)
    new_email = Column(String, nullable=False)

    # HMAC digests only. Never persist the plaintext verification codes.
    current_code_hash = Column(String, nullable=True)
    new_code_hash = Column(String, nullable=True)

    current_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    new_code_expires_at = Column(DateTime(timezone=True), nullable=True)

    current_attempts = Column(Integer, nullable=False, default=0)
    new_attempts = Column(Integer, nullable=False, default=0)

    current_email_verified_at = Column(DateTime(timezone=True), nullable=True)
    new_email_verified_at = Column(DateTime(timezone=True), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=False)

    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

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
        Index(
            "ix_email_change_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_email_change_new_email",
            "new_email",
        ),
        Index(
            "ix_email_change_expires",
            "expires_at",
        ),
    )


class EmailChangeAuditEvent(Base):
    """
    Email-change-specific audit events.

    This is an append-only audit record. It intentionally excludes:
    - Verification codes
    - Session tokens
    - Raw email addresses
    - Authentication secrets
    """

    __tablename__ = "email_change_audit_events"

    id = Column(String, primary_key=True)

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    request_id = Column(
        String,
        ForeignKey("email_change_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_type = Column(String, nullable=False, index=True)

    # Hashes identify the addresses without storing them in the audit log.
    old_email_hash = Column(String, nullable=True)
    new_email_hash = Column(String, nullable=True)

    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)

    # JSON serialized as text to avoid coupling to a particular JSON dialect.
    metadata_json = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_email_change_audit_user_created",
            "user_id",
            "created_at",
        ),
    )
