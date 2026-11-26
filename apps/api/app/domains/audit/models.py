import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Index,
    JSON,
    String,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_audit_id() -> str:
    return f"aevt_{uuid.uuid4().hex}"


class AuditEvent(Base):
    """Append-only record of a commercially or operationally significant action.

    Snapshots and metadata must contain only explicitly selected, non-sensitive
    fields. Do not pass ORM model dictionaries or unrestricted request payloads.
    """

    __tablename__ = "audit_events"

    id = Column(
        String,
        primary_key=True,
        default=generate_audit_id,
    )

    # Deliberately not a cascading FK: historical audit attribution must
    # survive workspace deletion.
    workspace_id = Column(
        String(64),
        nullable=False,
    )

    # user, admin, client, system, webhook, service
    actor_type = Column(
        String(24),
        nullable=False,
    )

    # User ID, client ID, provider identity, service identity, etc.
    actor_id = Column(
        String(160),
        nullable=True,
    )

    # Stable machine-readable action, e.g. invoice.updated.
    action = Column(
        String(120),
        nullable=False,
    )

    # Stable entity type, e.g. invoice, payment_profile, subscription.
    entity_type = Column(
        String(80),
        nullable=False,
    )

    entity_id = Column(
        String(160),
        nullable=False,
    )

    # success, failure, denied, partial
    outcome = Column(
        String(30),
        nullable=False,
        default="success",
        server_default="success",
    )

    before_state = Column(
        JSON,
        nullable=True,
    )

    after_state = Column(
        JSON,
        nullable=True,
    )

    metadata_json = Column(
        "metadata",
        JSON,
        nullable=False,
        default=dict,
    )

    correlation_id = Column(
        String(120),
        nullable=True,
    )

    occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_audit_events_workspace_occurred",
            "workspace_id",
            "occurred_at",
        ),
        Index(
            "ix_audit_events_workspace_entity",
            "workspace_id",
            "entity_type",
            "entity_id",
            "occurred_at",
        ),
        Index(
            "ix_audit_events_workspace_action",
            "workspace_id",
            "action",
            "occurred_at",
        ),
        Index(
            "ix_audit_events_correlation",
            "correlation_id",
        ),
    )
