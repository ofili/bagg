"""Shared SQLAlchemy repository primitives.

Domain repositories should expose business-oriented persistence operations and
keep SQLAlchemy statements out of routers and application workflows.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class SQLAlchemyRepository(Generic[ModelT]):
    """Small, deliberately boring base for domain-specific repositories."""

    def __init__(self, session: AsyncSession, model: type[ModelT]):
        self.session = session
        self.model = model

    async def get(self, identity: Any, *, for_update: bool = False) -> ModelT | None:
        statement = select(self.model).where(self.model.id == identity)
        if for_update:
            statement = statement.with_for_update()
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    def add(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)

    async def flush(self) -> None:
        await self.session.flush()

    async def refresh(self, entity: ModelT) -> None:
        await self.session.refresh(entity)
