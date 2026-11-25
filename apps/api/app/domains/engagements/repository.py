from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_token
from app.domains.engagements.models import Engagement, ScopeChangeRequest


class EngagementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def add(self, engagement: Engagement) -> None:
        self.db.add(engagement)

    async def get_by_id(
        self, workspace_id: str, engagement_id: str, for_update: bool = False
    ) -> Optional[Engagement]:
        query = select(Engagement).where(
            Engagement.workspace_id == workspace_id,
            Engagement.id == engagement_id,
        )
        if for_update:
            query = query.with_for_update()
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_quote_id(self, workspace_id: str, quote_id: str) -> Optional[Engagement]:
        query = select(Engagement).where(
            Engagement.workspace_id == workspace_id,
            Engagement.quote_id == quote_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_workspace(self, workspace_id: str) -> List[Engagement]:
        query = (
            select(Engagement)
            .where(Engagement.workspace_id == workspace_id)
            .order_by(Engagement.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())


class ScopeChangeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def add(self, change_request: ScopeChangeRequest) -> None:
        self.db.add(change_request)

    async def get_by_approval_token(
        self, token: str, for_update: bool = False
    ) -> Optional[ScopeChangeRequest]:
        token_hash = hash_token(token)
        query = select(ScopeChangeRequest).where(
            (ScopeChangeRequest.approval_token_hash == token_hash)
            | (ScopeChangeRequest.approval_token == token)
        )
        if for_update:
            query = query.with_for_update()
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_engagement(
        self, workspace_id: str, engagement_id: str
    ) -> List[ScopeChangeRequest]:
        query = (
            select(ScopeChangeRequest)
            .where(
                ScopeChangeRequest.workspace_id == workspace_id,
                ScopeChangeRequest.engagement_id == engagement_id,
            )
            .order_by(ScopeChangeRequest.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
