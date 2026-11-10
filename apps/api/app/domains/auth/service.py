import hashlib
import hmac
import re
import secrets
from datetime import UTC, datetime, timedelta, timezone

from sqlalchemy import and_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestException
from app.domains.auth.models import MagicLoginCode, User, UserSession
from app.domains.email.service import enqueue_login_code
from app.domains.workspaces.models import Workspace
from app.integrations.email_outbox import (
    acquire_email_issuance_lock,
    invalidate_previous_otp_messages,
)

OPT_PATTERN = re.compile(r"^[0-9]{6}$")

def hash_code(code: str, secret: str | None = None) -> str:
    """
    Return a keyed HMAC-SHA256 hash of an OTP.

    Production must provide OTP_HASH_SECRET.
    Development falls back to SECRET_KEY.
    """

    signing_secret = secret or settings.OTP_HASH_SECRET or settings.SECRET_KEY

    return hmac.new(
        signing_secret.encode("utf-8"),
        code.strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_session_token(token: str) -> str:
    """
    Hash a high-entropy session token for database storage.

    Session tokens have substantially more entropy than six-digit OTPs,
    so SHA-256 remains appropriate here.
    """

    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


class AuthService:
    SESSION_DAYS = 30
    OTP_MINUTES = 10

    def __init__(self, db: AsyncSession):
        self.db = db

    async def request_magic_code(self, email: str) -> str:
        clean_email = email.lower().strip()

        if not clean_email:
            raise BadRequestException("Invalid email address")

        code = f"{secrets.randbelow(900000) + 100000}"
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)

        # Serialize OTP issuance for this email address. The advisory lock is
        # transaction-scoped, so the caller controls when the challenge and
        # outbox message become visible together.
        await acquire_email_issuance_lock(
            self.db,
            clean_email,
        )

        # Find all existing unused challenges.
        existing_result = await self.db.execute(
            select(MagicLoginCode)
            .where(
                MagicLoginCode.email == clean_email,
                MagicLoginCode.used_at.is_(None),
            )
            .with_for_update()
        )

        existing = existing_result.scalars().all()

        existing_ids = [entry.id for entry in existing]

        # Invalidate existing challenges.
        for old_entry in existing:
            old_entry.used_at = now

        # Invalidate their undelivered emails.
        await invalidate_previous_otp_messages(
            self.db,
            existing_ids,
        )

        # Create the new challenge.
        entry = MagicLoginCode(
            email=clean_email,
            code_hash=hash_code(code),
            token=token,
            expires_at=now + timedelta(minutes=self.OTP_MINUTES),
        )

        self.db.add(entry)

        if settings.ENVIRONMENT != "production":
            print(f"\n=======================================================\n[DEV MAGIC LINK] Email: {clean_email} | Code: {code}\n=======================================================\n", flush=True)

        # Flush to obtain the generated challenge ID.
        await self.db.flush()

        # Persist the encrypted delivery request in the same transaction.
        try:
            enqueue_login_code(
                self.db,
                challenge_id=entry.id,
                recipient=clean_email,
                code=code,
                expires_in_minutes=self.OTP_MINUTES,
            )
            await self.db.flush()
        except Exception:
            if settings.ENVIRONMENT == "production":
                raise

        return code

    async def verify_login(
        self,
        email: str,
        code: str,
    ) -> tuple[User, Workspace, str, bool]:

        clean_email = email.lower().strip()
        now = datetime.now(UTC)

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

        try:
            await acquire_email_issuance_lock(
                self.db,
                clean_email,
            )
            
            result = await self.db.execute(stmt)
            entry = result.scalars().first()

            if entry is None:
                raise BadRequestException("Invalid or expired login code")

            # Consume challenge inside the transaction.
            entry.used_at = now

            user_result = await self.db.execute(
                select(User).where(User.email == clean_email)
            )

            user = user_result.scalars().first()

            if user and not user.is_active:
                await self.db.commit()

                raise BadRequestException("This account is inactive")

            is_new_user = user is None

            if user is None:
                user = User(
                    email=clean_email,
                    is_active=True,
                )

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
                id=hash_session_token(raw_session_token),
                user_id=user.id,
                expires_at=now + timedelta(days=self.SESSION_DAYS),
            )

            self.db.add(session)

            # Challenge consumption, account/workspace creation
            # and session creation commit together.
            await self.db.commit()

            return user, workspace, raw_session_token, is_new_user

        except Exception:
            await self.db.rollback()
            raise

    async def get_user_from_session(
        self,
        raw_session_token: str,
    ) -> tuple[User, Workspace] | None:
        if not raw_session_token:
            return None

        now = datetime.now(timezone.utc)

        session_result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.id == hash_session_token(raw_session_token),
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

        # Absolute expiry: never extend a session during normal use.
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
                UserSession.id == hash_session_token(raw_session_token),
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        await self.db.commit()

    async def revoke_all_sessions(self, user_id: str) -> int:
        """Revoke every active session belonging to a user.

        Returns the number of sessions revoked.
        """
        now = datetime.now(timezone.utc)

        result = await self.db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        await self.db.commit()
        return result.rowcount or 0