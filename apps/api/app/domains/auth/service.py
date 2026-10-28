import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException
from app.domains.auth.models import MagicLoginCode, User, UserSession
from app.domains.workspaces.models import Workspace
from app.integrations.email import EmailSender


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


class AuthService:
    SESSION_DAYS = 30
    OTP_MINUTES = 10

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_sender = EmailSender()

    async def request_magic_code(self, email: str) -> None:
        clean_email = email.lower().strip()
        code = f"{secrets.randbelow(900000) + 100000}"
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)

        entry = MagicLoginCode(
            email=clean_email,
            code_hash=hash_code(code),
            token=token,
            expires_at=now + timedelta(minutes=self.OTP_MINUTES),
        )
        self.db.add(entry)
        await self.db.commit()

        delivered = await self.email_sender.send_login_code_email(
            to_email=clean_email,
            code=code,
            expires_in_minutes=self.OTP_MINUTES,
        )

        if not delivered:
            # Invalidate the code if delivery failed; never leave a usable code
            # that the user was not actually sent.
            await self.db.execute(
                update(MagicLoginCode)
                .where(MagicLoginCode.id == entry.id)
                .values(used_at=datetime.now(timezone.utc))
            )
            await self.db.commit()
            raise RuntimeError("Unable to deliver sign-in email")

    async def verify_login(
        self,
        email: str,
        code: str,
    ) -> tuple[User, Workspace, str]:
        clean_email = email.lower().strip()
        now = datetime.now(timezone.utc)

        stmt = (
            select(MagicLoginCode)
            .where(
                and_(
                    MagicLoginCode.email == clean_email,
                    MagicLoginCode.code_hash == hash_code(code),
                    MagicLoginCode.used_at.is_(None),
                    MagicLoginCode.expires_at > now,
                )
            )
            .order_by(MagicLoginCode.created_at.desc())
            .with_for_update()
        )

        result = await self.db.execute(stmt)
        entry = result.scalars().first()

        if entry is None:
            raise BadRequestException("Invalid or expired login code")

        # Consume the code while holding the row lock. Concurrent verification
        # requests will re-check the row after the first transaction commits.
        entry.used_at = now

        user_result = await self.db.execute(
            select(User).where(User.email == clean_email)
        )
        user = user_result.scalars().first()

        if user and not user.is_active:
            await self.db.commit()
            raise BadRequestException("This account is inactive")

        if user is None:
            user = User(email=clean_email, is_active=True)
            self.db.add(user)
            await self.db.flush()

        workspace_result = await self.db.execute(
            select(Workspace)
            .where(Workspace.owner_id == user.id)
            .order_by(Workspace.created_at.asc())
        )
        workspace = workspace_result.scalars().first()

        if workspace is None:
            workspace = Workspace(
                owner_id=user.id,
                name="My Workspace",
                business_name="My Business",
                brand_color="#10B981",
                country="NG",
                default_currency="NGN",
            )
            self.db.add(workspace)
            await self.db.flush()

        raw_session_token = secrets.token_urlsafe(32)
        session = UserSession(
            id=hash_code(raw_session_token),
            user_id=user.id,
            expires_at=now + timedelta(days=self.SESSION_DAYS),
        )
        self.db.add(session)
        await self.db.commit()

        return user, workspace, raw_session_token

    async def get_user_from_session(
        self,
        raw_session_token: str,
    ) -> Optional[tuple[User, Workspace]]:
        if not raw_session_token:
            return None

        now = datetime.now(timezone.utc)
        session_result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.id == hash_code(raw_session_token),
                    UserSession.expires_at > now,
                    UserSession.revoked_at.is_(None),
                )
            )
        )
        session = session_result.scalars().first()

        if session is None:
            return None

        user_result = await self.db.execute(
            select(User).where(User.id == session.user_id)
        )
        user = user_result.scalars().first()

        if user is None or not user.is_active:
            return None

        workspace_result = await self.db.execute(
            select(Workspace)
            .where(Workspace.owner_id == user.id)
            .order_by(Workspace.created_at.asc())
        )
        workspace = workspace_result.scalars().first()

        if workspace is None:
            return None

        return user, workspace

    async def revoke_session(self, raw_session_token: str) -> None:
        if not raw_session_token:
            return

        await self.db.execute(
            update(UserSession)
            .where(
                UserSession.id == hash_code(raw_session_token),
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.commit()
