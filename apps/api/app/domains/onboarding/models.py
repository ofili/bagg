import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    text,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class OnboardingProgress(Base):
    __tablename__ = "onboarding_progress"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("onb_"),
    )

    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    schema_version = Column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    status = Column(
        String(24),
        nullable=False,
        default="not_started",
        server_default="not_started",
    )

    current_step = Column(
        String(64),
        nullable=True,
        default="business_profile",
    )

    completed_steps = Column(
        JSON,
        nullable=False,
        default=list,
        server_default=text("'[]'::json"),
    )

    skipped_steps = Column(
        JSON,
        nullable=False,
        default=list,
        server_default=text("'[]'::json"),
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_activity_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

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
        CheckConstraint(
            "status IN ('not_started', 'in_progress', 'completed')",
            name="ck_onboarding_progress_status",
        ),
        Index(
            "ix_onboarding_progress_status",
            "status",
        ),
    )