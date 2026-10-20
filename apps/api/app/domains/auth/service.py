import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.models import User, MagicLoginCode, UserSession
from app.domains.workspaces.models import Workspace
from app.integrations.email import EmailSender
from app.core.errors import BadRequestException, NotFoundException


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_sender = EmailSender()

    async def request_magic_code(self, email: str) -> str:
        """
        Generates a 6-digit login code and email token with 10-minute validity.
        Sends email and returns raw code for local development ease.
        """
        clean_email = email.lower().strip()
        code = f"{secrets.randbelow(900000) + 100000}"  # 6-digit number
        token = secrets.token_urlsafe(32)
        code_hash = hash_code(code)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        magic_entry = MagicLoginCode(
            email=clean_email,
            code_hash=code_hash,
            token=token,
            expires_at=expires_at,
        )
        self.db.add(magic_entry)
        await self.db.commit()

        # Send via email sender
        await self.email_sender.send_invoice_email(
            to_email=clean_email,
            invoice_number="Login Code",
            share_url=f"Your Bagg 6-digit login code is: {code}"
        )

        return code

    async def verify_login(self, email: str, code: str) -> Tuple[User, Workspace, str]:
        """
        Verifies login code. If valid, onboards new user + workspace or returns existing,
        then creates a 30-day session.
        """
        clean_email = email.lower().strip()
        hashed = hash_code(code)
        now = datetime.now(timezone.utc)

        stmt = select(MagicLoginCode).where(
            and_(
                MagicLoginCode.email == clean_email,
                MagicLoginCode.code_hash == hashed,
                MagicLoginCode.used_at.is_(None),
                MagicLoginCode.expires_at > now,
            )
        ).order_by(MagicLoginCode.created_at.desc())

        result = await self.db.execute(stmt)
        entry = result.scalars().first()

        if not entry:
            raise BadRequestException("Invalid or expired login code")

        # Mark code as used
        entry.used_at = now

        # Get or create User
        user_stmt = select(User).where(User.email == clean_email)
        user_res = await self.db.execute(user_stmt)
        user = user_res.scalars().first()

        if not user:
            user = User(email=clean_email, is_active=True)
            self.db.add(user)
            await self.db.flush()

            # Create default workspace (US-ONB-01)
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
        else:
            ws_stmt = select(Workspace).where(Workspace.owner_id == user.id)
            ws_res = await self.db.execute(ws_stmt)
            workspace = ws_res.scalars().first()
            if not workspace:
                workspace = Workspace(
                    owner_id=user.id,
                    name="My Workspace",
                    business_name="My Business",
                    default_currency="NGN"
                )
                self.db.add(workspace)
                await self.db.flush()

        # Create session
        raw_session_token = secrets.token_urlsafe(32)
        session_hash = hash_code(raw_session_token)
        session = UserSession(
            id=session_hash,
            user_id=user.id,
            expires_at=now + timedelta(days=30),
        )
        self.db.add(session)
        await self.db.commit()

        return user, workspace, raw_session_token

    async def get_user_from_session(self, raw_session_token: str) -> Optional[Tuple[User, Workspace]]:
        if not raw_session_token:
            return None

        session_hash = hash_code(raw_session_token)
        now = datetime.now(timezone.utc)

        stmt = select(UserSession).where(
            and_(
                UserSession.id == session_hash,
                UserSession.expires_at > now
            )
        )
        res = await self.db.execute(stmt)
        session = res.scalars().first()

        if not session:
            return None

        user_stmt = select(User).where(User.id == session.user_id)
        user_res = await self.db.execute(user_stmt)
        user = user_res.scalars().first()

        if not user:
            return None

        ws_stmt = select(Workspace).where(Workspace.owner_id == user.id)
        ws_res = await self.db.execute(ws_stmt)
        workspace = ws_res.scalars().first()

        return user, workspace
