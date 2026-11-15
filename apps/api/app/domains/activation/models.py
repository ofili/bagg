import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class ProductEvent(Base):
    """
    Append-only product and activation event.

    milestone_key is NULL for ordinary events. For milestone events it
    provides a workspace-scoped uniqueness boundary, ensuring that a
    milestone is recorded once even when multiple requests race.
    """

    __tablename__ = "product_events"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("evt_"),
    )

    event_id = Column(
        String(128),
        nullable=False,
        unique=True,
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_name = Column(
        String(120),
        nullable=False,
        index=True,
    )

    event_version = Column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    source = Column(
        String(32),
        nullable=False,
        default="api",
        server_default="api",
    )

    properties = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    # NULL for ordinary events; unique per workspace for milestones.
    milestone_key = Column(
        String(100),
        nullable=True,
    )

    occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "milestone_key",
            name="uq_product_events_workspace_milestone",
        ),
        Index(
            "ix_product_events_workspace_name_occurred",
            "workspace_id",
            "event_name",
            "occurred_at",
        ),
        Index(
            "ix_product_events_workspace_occurred",
            "workspace_id",
            "occurred_at",
        ),
    )
