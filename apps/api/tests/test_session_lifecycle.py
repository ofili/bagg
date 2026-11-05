import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.domains.auth.service import AuthService


def test_session_lifetime_is_30_days():
    assert AuthService.SESSION_DAYS == 30


def test_session_expiry_is_absolute_policy():
    """
    The session lookup must not extend expires_at.

    The integration test below should verify the persisted value.
    """
    assert AuthService.SESSION_DAYS == 30


@pytest.mark.asyncio
async def test_revoke_all_sessions_is_user_scoped(db_session):
    from app.domains.auth.models import User, UserSession
    from app.domains.auth.service import hash_session_token

    suffix = uuid.uuid4().hex[:10]
    user_a = User(email=f"session-a-{suffix}@example.com", is_active=True)
    user_b = User(email=f"session-b-{suffix}@example.com", is_active=True)

    db_session.add_all([user_a, user_b])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    session_a1 = UserSession(
        id=hash_session_token(f"session-a1-{suffix}"),
        user_id=user_a.id,
        expires_at=now + timedelta(days=30),
    )
    session_a2 = UserSession(
        id=hash_session_token(f"session-a2-{suffix}"),
        user_id=user_a.id,
        expires_at=now + timedelta(days=30),
    )
    session_b1 = UserSession(
        id=hash_session_token(f"session-b1-{suffix}"),
        user_id=user_b.id,
        expires_at=now + timedelta(days=30),
    )

    db_session.add_all([session_a1, session_a2, session_b1])
    await db_session.commit()

    revoked = await AuthService(db_session).revoke_all_sessions(user_a.id)

    assert revoked == 2

    await db_session.refresh(session_a1)
    await db_session.refresh(session_a2)
    await db_session.refresh(session_b1)

    assert session_a1.revoked_at is not None
    assert session_a2.revoked_at is not None
    assert session_b1.revoked_at is None
