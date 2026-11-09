from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundException
from app.domains.auth.models import User
from app.domains.users.schemas import ProfileUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_me(
        self,
        user_id: str,
        payload: ProfileUpdate,
    ) -> User:
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .with_for_update()
        )
        user = result.scalar_one_or_none()

        if user is None:
            raise NotFoundException("User not found")

        changes = payload.model_dump(exclude_unset=True)

        for field, value in changes.items():
            setattr(user, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except Exception:
            await self.db.rollback()
            raise