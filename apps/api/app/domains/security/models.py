import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_security_id(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class SecurityChallenge(Base):
    __tablename__ = "security_challenges"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_security_id("sch_"),
    )

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    operation_id = Column(
        String,
        nullable=False,
        index=True,
    )

    purpose = Column(
        String(80),
        nullable=False,
        index=True,
    )

    code_hash = Column(
        String(64),
        nullable=False,
    )

    payload_hash = Column(
        String(64),
        nullable=False,
    )

    destination = Column(
        String(320),
        nullable=False,
    )

    attempts = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    max_attempts = Column(
        Integer,
        nullable=False,
        default=5,
        server_default="5",
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    consumed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_security_challenge_user_purpose",
            "user_id",
            "purpose",
            "created_at",
        ),
        Index(
            "ix_security_challenge_operation",
            "operation_id",
            "purpose",
        ),
    )


class AccountRecoveryCode(Base):
    __tablename__ = "account_recovery_codes"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_security_id("rcc_"),
    )

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    code_hash = Column(
        String(64),
        nullable=False,
        unique=True,
    )

    used_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_recovery_codes_user_used",
            "user_id",
            "used_at",
        ),
    )


class SecurityAuditEvent(Base):
    __tablename__ = "security_audit_events"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_security_id("aud_"),
    )

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    outcome = Column(
        String(30),
        nullable=False,
    )

    resource_type = Column(
        String(80),
        nullable=True,
    )

    resource_id = Column(
        String(160),
        nullable=True,
    )

    ip_address = Column(
        String(64),
        nullable=True,
    )

    user_agent = Column(
        String(500),
        nullable=True,
    )

    correlation_id = Column(
        String(120),
        nullable=True,
        index=True,
    )

    metadata_json = Column(
        "metadata",
        JSON,
        nullable=False,
        default=dict,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    __table_args__ = (
        Index(
            "ix_security_audit_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_security_audit_type_created",
            "event_type",
            "created_at",
        ),
    )