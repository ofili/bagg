import pytest

from app.domains.security import email_delivery


@pytest.mark.asyncio
async def test_security_email_is_enqueued_in_existing_session(monkeypatch):
    captured = {}

    def fake_enqueue(db, *, message_type, aggregate_id, payload):
        captured.update(
            db=db,
            message_type=message_type,
            aggregate_id=aggregate_id,
            payload=payload,
        )

    monkeypatch.setattr(email_delivery, "enqueue_email", fake_enqueue)
    session = object()

    await email_delivery.enqueue_security_email(
        session,
        recipient="person@example.com",
        template="security_email_change_new",
        aggregate_id="emc_123",
        payload={"code": "123456", "expires_in_minutes": 10},
    )

    assert captured["db"] is session
    assert captured["message_type"] == "security_email_change_new"
    assert captured["aggregate_id"] == "emc_123"
    assert captured["payload"]["to_email"] == "person@example.com"
    assert "123456" in captured["payload"]["html"]
    assert "expires in 10 minutes" in captured["payload"]["html"]


@pytest.mark.asyncio
async def test_security_email_rejects_unknown_template():
    with pytest.raises(ValueError):
        await email_delivery.enqueue_security_email(
            object(),
            recipient="person@example.com",
            template="unknown",
            aggregate_id="emc_123",
            payload={"code": "123456", "expires_in_minutes": 10},
        )
