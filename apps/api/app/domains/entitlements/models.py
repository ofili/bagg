"""Persisted, time-bounded administrative entitlement overrides."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Index,
    JSON,
    String,
    text,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_entitlement_override_id() -> str:
    return f"eov_{uuid.uuid4().hex}"


class EntitlementOverride(Base):
    """Administrative override of one workspace entitlement.

    Historical records are retained when an override expires or is revoked.
    The effective entitlement is determined by the resolver, not this model.
    """

    __tablename__ = "entitlement_overrides"

    id = Column(
        String(40),
        primary_key=True,
        default=generate_entitlement_override_id,
    )

    # Deliberately no cascading FK: retain the governance record if a
    # workspace is deleted.
    workspace_id = Column(String(64), nullable=False)

    entitlement_key = Column(String(120), nullable=False)
    override_value = Column(JSON, nullable=False)

    reason = Column(String(1000), nullable=False)

    # active, revoked, expired
    status = Column(
        String(16),
        nullable=False,
        default="active",
        server_default="active",
    )

    created_by_admin_id = Column(String(160), nullable=False)

    effective_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Overrides must always have an expiry.
    expires_at = Column(DateTime(timezone=True), nullable=False)

    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_admin_id = Column(String(160), nullable=True)
    revocation_reason = Column(String(1000), nullable=True)

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
            "status IN ('active', 'revoked', 'expired')",
            name="ck_entitlement_overrides_status",
        ),
        CheckConstraint(
            "length(trim(reason)) > 0",
            name="ck_entitlement_overrides_reason",
        ),
        CheckConstraint(
            "expires_at > effective_at",
            name="ck_entitlement_overrides_expiry",
        ),
        CheckConstraint(
            "(status != 'revoked') OR "
            "(revoked_at IS NOT NULL AND revoked_by_admin_id IS NOT NULL)",
            name="ck_entitlement_overrides_revocation",
        ),
        Index(
            "ix_entitlement_overrides_workspace_status",
            "workspace_id",
            "status",
        ),
        Index(
            "ix_entitlement_overrides_workspace_key",
            "workspace_id",
            "entitlement_key",
        ),
        Index(
            "ix_entitlement_overrides_expiry",
            "status",
            "expires_at",
        ),
        # Historical revoked/expired rows are allowed. Only one active
        # override for a workspace/key can exist at a time.
        Index(
            "uq_entitlement_overrides_active_key",
            "workspace_id",
            "entitlement_key",
            unique=True,
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'"),
        ),
    )
