"""Explicit transaction boundary for application use cases."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession


class UnitOfWork:
    """Owns one transaction; repositories and services must not commit it."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._transaction = None

    async def __aenter__(self) -> "UnitOfWork":
        self._transaction = await self.session.begin()
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> bool:
        if self._transaction is None:
            return False
        if exc_type is None:
            await self._transaction.commit()
        else:
            await self._transaction.rollback()
        self._transaction = None
        return False
