from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.models import User
from app.domains.users.schemas import ProfileUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_me(self, user_id: str, user_dict: ProfileUpdate):
        user_result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user = await self.db.execute(
            update(User).where(User.id == user_id).values(user_dict.model_dump(exclude_unset=True))
        )
        await self.db.commit()
        await self.db.refresh(user)

        return user
