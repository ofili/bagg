from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audit.models import AuditEvent
from app.domains.audit.repository import AuditRepository

ALLOWED_ACTOR_TYPES = {
    "user",
    "admin",
    "client",
    "system",
    "webhook",
    "service",
}

ALLOWED_OUTCOMES = {
    "success",
    "failure",
    "denied",
    "partial",
}


def _validate_text(
    value: str,
    *,
    field: str,
    max_length: int,
) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")

    normalized = value.strip()

    if len(normalized) > max_length:
        raise ValueError(f"{field} cannot exceed {max_length} characters")

    return normalized


def _validate_json_object(
    value: dict[str, Any] | None,
    *,
    field: str,
) -> dict[str, Any] | None:
    if value is None:
        return None

    if not isinstance(value, dict):
        raise ValueError(f"{field} must be a dictionary")

    try:
        # Validate serializability and reject NaN/Infinity.
        json.dumps(value, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must contain JSON-serializable values") from exc

    # Avoid retaining a caller-owned mutable dictionary.
    return json.loads(json.dumps(value, allow_nan=False))


async def record_audit_event(
    db: AsyncSession,
    *,
    workspace_id: str,
    actor_type: str,
    action: str,
    entity_type: str,
    entity_id: str,
    outcome: str = "success",
    actor_id: str | None = None,
    before_state: dict[str, Any] | None = None,
    after_state: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    correlation_id: str | None = None,
    occurred_at: datetime | None = None,
) -> AuditEvent:
    """Record one business audit event in the caller's transaction.

    This function flushes but never commits. The business mutation and its
    audit event must be committed or rolled back together.

    Callers are responsible for supplying allowlisted before/after fields
    and metadata. Never include credentials, tokens, payment secrets, or
    unrestricted personal data.
    """

    workspace_id = _validate_text(
        workspace_id,
        field="workspace_id",
        max_length=64,
    )

    actor_type = _validate_text(
        actor_type,
        field="actor_type",
        max_length=24,
    ).lower()

    if actor_type not in ALLOWED_ACTOR_TYPES:
        raise ValueError("Unsupported actor_type")

    if actor_id is not None:
        actor_id = _validate_text(
            actor_id,
            field="actor_id",
            max_length=160,
        )

    action = _validate_text(
        action,
        field="action",
        max_length=120,
    )

    entity_type = _validate_text(
        entity_type,
        field="entity_type",
        max_length=80,
    )

    entity_id = _validate_text(
        entity_id,
        field="entity_id",
        max_length=160,
    )

    outcome = _validate_text(
        outcome,
        field="outcome",
        max_length=30,
    ).lower()

    if outcome not in ALLOWED_OUTCOMES:
        raise ValueError("Unsupported audit outcome")

    if correlation_id is not None:
        correlation_id = _validate_text(
            correlation_id,
            field="correlation_id",
            max_length=120,
        )

    timestamp = occurred_at or datetime.now(timezone.utc)

    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("occurred_at must be timezone-aware")

    before = _validate_json_object(
        before_state,
        field="before_state",
    )

    after = _validate_json_object(
        after_state,
        field="after_state",
    )

    details = _validate_json_object(
        metadata if metadata is not None else {},
        field="metadata",
    )

    event = AuditEvent(
        workspace_id=workspace_id,
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        outcome=outcome,
        before_state=before,
        after_state=after,
        metadata_json=details,
        correlation_id=correlation_id,
        occurred_at=timestamp,
    )

    db.add(event)
    await db.flush()

    return event


async def list_audit_events(
    db: AsyncSession,
    *,
    workspace_id: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    occurred_after: datetime | None = None,
    occurred_before: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditEvent]:
    """Return audit events scoped to one workspace."""

    return await AuditRepository(db).list_events(
        workspace_id=workspace_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        occurred_after=occurred_after,
        occurred_before=occurred_before,
        limit=limit,
        offset=offset,
    )
