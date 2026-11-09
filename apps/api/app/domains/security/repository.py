from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.security.models import SecurityChallenge


class SecurityRepository:
    """Persistence operations for security challenges."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_consumed_challenge(
        self,
        *,
        challenge_id: str,
        user_id: str,
        workspace_id: str | None,
        purpose: str,
        now: datetime,
    ) -> SecurityChallenge | None:
        result = await self.db.execute(
            select(SecurityChallenge).where(
                SecurityChallenge.id == challenge_id,
                SecurityChallenge.user_id == user_id,
                SecurityChallenge.workspace_id == workspace_id,
                SecurityChallenge.purpose == purpose,
                SecurityChallenge.consumed_at.is_not(None),
                SecurityChallenge.revoked_at.is_(None),
                SecurityChallenge.expires_at > now,
            )
        )

        return result.scalar_one_or_none()