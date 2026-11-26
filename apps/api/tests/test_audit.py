from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql

from app.domains.audit.models import AuditEvent
from app.domains.audit.repository import AuditRepository
from app.domains.audit.service import record_audit_event


class FakeAsyncSession:
    def __init__(self):
        self.events = []
        self.flush = AsyncMock()

    def add(self, event):
        self.events.append(event)


@pytest.mark.asyncio
async def test_record_audit_event_creates_event_and_flushes():
    db = FakeAsyncSession()

    event = await record_audit_event(
        db,
        workspace_id="ws_test",
        actor_type="user",
        actor_id="usr_test",
        action="invoice.updated",
        entity_type="invoice",
        entity_id="inv_test",
        before_state={"status": "draft", "total_minor": 10000},
        after_state={"status": "draft", "total_minor": 12000},
        metadata={"source": "api"},
        correlation_id="req_test",
    )

    assert isinstance(event, AuditEvent)
    assert event.workspace_id == "ws_test"
    assert event.actor_type == "user"
    assert event.actor_id == "usr_test"
    assert event.action == "invoice.updated"
    assert event.entity_type == "invoice"
    assert event.entity_id == "inv_test"
    assert event.outcome == "success"
    assert event.before_state["total_minor"] == 10000
    assert event.after_state["total_minor"] == 12000
    assert event.metadata_json == {"source": "api"}
    assert event.correlation_id == "req_test"
    assert event.occurred_at.tzinfo is not None

    assert db.events == [event]
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_record_audit_event_accepts_explicit_aware_timestamp():
    db = FakeAsyncSession()
    timestamp = datetime(2026, 11, 26, 10, 30, tzinfo=timezone.utc)

    event = await record_audit_event(
        db,
        workspace_id="ws_test",
        actor_type="system",
        action="receipt.generated",
        entity_type="receipt",
        entity_id="rcp_test",
        occurred_at=timestamp,
    )

    assert event.occurred_at == timestamp


@pytest.mark.asyncio
async def test_record_audit_event_rejects_naive_timestamp():
    db = FakeAsyncSession()

    with pytest.raises(ValueError, match="timezone-aware"):
        await record_audit_event(
            db,
            workspace_id="ws_test",
            actor_type="system",
            action="receipt.generated",
            entity_type="receipt",
            entity_id="rcp_test",
            occurred_at=datetime(2026, 11, 26, 10, 30),
        )

    assert db.events == []
    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_record_audit_event_rejects_unknown_actor_type():
    db = FakeAsyncSession()

    with pytest.raises(ValueError, match="actor_type"):
        await record_audit_event(
            db,
            workspace_id="ws_test",
            actor_type="unknown",
            action="invoice.updated",
            entity_type="invoice",
            entity_id="inv_test",
        )

    assert db.events == []
    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_record_audit_event_rejects_non_json_snapshot():
    db = FakeAsyncSession()

    with pytest.raises(ValueError, match="JSON-serializable"):
        await record_audit_event(
            db,
            workspace_id="ws_test",
            actor_type="user",
            action="invoice.updated",
            entity_type="invoice",
            entity_id="inv_test",
            after_state={"invalid": object()},
        )

    assert db.events == []
    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_audit_repository_always_scopes_query_to_workspace():
    class FakeResult:
        def scalars(self):
            return self

        def all(self):
            return []

    class QuerySession:
        def __init__(self):
            self.statement = None

        async def execute(self, statement):
            self.statement = statement
            return FakeResult()

    db = QuerySession()

    await AuditRepository(db).list_events(
        workspace_id="ws_alpha",
        entity_type="invoice",
        entity_id="inv_123",
        action="invoice.updated",
        limit=25,
        offset=0,
    )

    sql = str(
        db.statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )

    assert "audit_events.workspace_id = 'ws_alpha'" in sql
    assert "audit_events.entity_type = 'invoice'" in sql
    assert "audit_events.entity_id = 'inv_123'" in sql
    assert "audit_events.action = 'invoice.updated'" in sql


@pytest.mark.asyncio
async def test_audit_repository_rejects_missing_workspace():
    db = FakeAsyncSession()

    with pytest.raises(ValueError, match="workspace_id"):
        await AuditRepository(db).list_events(workspace_id="")

    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_audit_repository_validates_pagination():
    db = FakeAsyncSession()

    with pytest.raises(ValueError, match="limit"):
        await AuditRepository(db).list_events(
            workspace_id="ws_test",
            limit=201,
        )

    with pytest.raises(ValueError, match="offset"):
        await AuditRepository(db).list_events(
            workspace_id="ws_test",
            offset=-1,
        )


from sqlalchemy import delete, text, update
from sqlalchemy.exc import DBAPIError


@pytest.mark.asyncio
async def test_audit_event_rejects_database_update(db_session):
    event = AuditEvent(
        workspace_id="ws_audit_test",
        actor_type="system",
        action="test.created",
        entity_type="test",
        entity_id="update_test",
        outcome="success",
        metadata_json={},
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(event)
    await db_session.flush()

    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(
            update(AuditEvent)
            .where(AuditEvent.id == event.id)
            .values(outcome="failure")
        )

    await db_session.rollback()


@pytest.mark.asyncio
async def test_audit_event_rejects_database_delete(db_session):
    event = AuditEvent(
        workspace_id="ws_audit_test",
        actor_type="system",
        action="test.created",
        entity_type="test",
        entity_id="delete_test",
        outcome="success",
        metadata_json={},
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(event)
    await db_session.flush()

    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(delete(AuditEvent).where(AuditEvent.id == event.id))

    await db_session.rollback()


@pytest.mark.asyncio
async def test_audit_event_rejects_truncate(db_session):
    event = AuditEvent(
        workspace_id="ws_audit_test",
        actor_type="system",
        action="test.created",
        entity_type="test",
        entity_id="truncate_test",
        outcome="success",
        metadata_json={},
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(event)
    await db_session.flush()

    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(text("TRUNCATE TABLE audit_events"))

    await db_session.rollback()
