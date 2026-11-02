import pytest

from sqlalchemy import select

from app.domains.auth.models import MagicLoginCode
from app.integrations.email_models import EmailOutbox
from app.domains.auth.service import AuthService


@pytest.mark.asyncio
async def test_otp_and_outbox_are_created_together(
    db_session,
):
    service = AuthService(db_session)

    await service.request_magic_code("test@example.com")

    challenges = (
        (
            await db_session.execute(
                select(MagicLoginCode).where(MagicLoginCode.email == "test@example.com")
            )
        )
        .scalars()
        .all()
    )

    assert len(challenges) == 1

    messages = (
        (
            await db_session.execute(
                select(EmailOutbox).where(EmailOutbox.aggregate_id == challenges[0].id)
            )
        )
        .scalars()
        .all()
    )

    assert len(messages) == 1
    assert messages[0].status == "pending"
    assert messages[0].encrypted_payload is not None


@pytest.mark.asyncio
async def test_transaction_rollback_removes_both_records(
    db_session,
):
    service = AuthService(db_session)

    with pytest.raises(RuntimeError):
        async with db_session.begin():
            await service.request_magic_code("rollback@example.com")
            raise RuntimeError("rollback")

    # Verify using a separate session after rollback.
    # Neither the challenge nor the outbox message should exist.
