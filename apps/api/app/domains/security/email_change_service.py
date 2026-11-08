import hashlib
import hmac
import json
import secrets
import uuid

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domains.auth.models import User, UserSession
from app.domains.security.email_change_models import (
    EmailChangeRequest,
    EmailChangeAuditEvent,
)
from app.domains.security.email_delivery import enqueue_security_email


class EmailChangeError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class EmailChangeService:
    REQUEST_MINUTES = 30
    CODE_MINUTES = 10
    MAX_ATTEMPTS = 5

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _id(prefix: str) -> str:
        return f"{prefix}{uuid.uuid4().hex}"

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _digest(value: str) -> str:
        secret = settings.OTP_HASH_SECRET

        return hmac.new(
            secret.encode("utf-8"),
            value.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def _new_code() -> str:
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def _constant_time_equal(left: str, right: str) -> bool:
        return hmac.compare_digest(left, right)

    async def _audit(
        self,
        *,
        user_id: Optional[str],
        request_id: Optional[str],
        event_type: str,
        old_email: Optional[str] = None,
        new_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        event = EmailChangeAuditEvent(
            id=self._id("eca_"),
            user_id=user_id,
            request_id=request_id,
            event_type=event_type,
            old_email_hash=(self._digest(old_email) if old_email else None),
            new_email_hash=(self._digest(new_email) if new_email else None),
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=(
                json.dumps(metadata, separators=(",", ":")) if metadata else None
            ),
        )

        self.db.add(event)

    async def _get_locked_user(self, user_id: str) -> User:
        result = await self.db.execute(
            select(User).where(User.id == user_id).with_for_update()
        )

        user = result.scalars().first()

        if user is None or not user.is_active:
            raise EmailChangeError("Account is unavailable.", 404)

        return user

    async def _get_locked_request(
        self,
        *,
        request_id: str,
        user_id: str,
    ) -> EmailChangeRequest:
        result = await self.db.execute(
            select(EmailChangeRequest)
            .where(
                and_(
                    EmailChangeRequest.id == request_id,
                    EmailChangeRequest.user_id == user_id,
                )
            )
            .with_for_update()
        )

        change = result.scalars().first()

        if change is None:
            raise EmailChangeError("Email-change request not found.", 404)

        return change

    @staticmethod
    def _assert_pending(change: EmailChangeRequest) -> None:
        now = datetime.now(timezone.utc)

        if change.completed_at is not None:
            raise EmailChangeError("This request has already been completed.")

        if change.cancelled_at is not None:
            raise EmailChangeError("This request has been cancelled.")

        if change.expires_at <= now:
            raise EmailChangeError("This request has expired.")

    async def _assert_email_available(self, email: str) -> None:
        result = await self.db.execute(
            select(User.id).where(func.lower(User.email) == email)
        )

        if result.scalar_one_or_none() is not None:
            raise EmailChangeError(
                "We could not use that email address. Please try another."
            )

    async def start(
        self,
        *,
        user_id: str,
        proposed_email: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> EmailChangeRequest:
        proposed_email = self._normalize_email(proposed_email)
        now = self._now()

        if not proposed_email:
            raise EmailChangeError("A valid email address is required.")

        try:
            user = await self._get_locked_user(user_id)

            current_email = self._normalize_email(user.email)

            if proposed_email == current_email:
                raise EmailChangeError(
                    "The proposed email address is already your account email."
                )

            await self._assert_email_available(proposed_email)

            # Cancel any previous pending requests for this account.
            existing_result = await self.db.execute(
                select(EmailChangeRequest)
                .where(
                    and_(
                        EmailChangeRequest.user_id == user_id,
                        EmailChangeRequest.completed_at.is_(None),
                        EmailChangeRequest.cancelled_at.is_(None),
                        EmailChangeRequest.expires_at > now,
                    )
                )
                .with_for_update()
            )

            existing_requests = existing_result.scalars().all()

            for existing in existing_requests:
                existing.cancelled_at = now

                await self._audit(
                    user_id=user_id,
                    request_id=existing.id,
                    event_type="email_change.superseded",
                    old_email=current_email,
                    new_email=existing.new_email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

            code = self._new_code()

            change = EmailChangeRequest(
                id=self._id("emc_"),
                user_id=user_id,
                current_email=current_email,
                new_email=proposed_email,
                current_code_hash=self._digest(code),
                current_code_expires_at=now + timedelta(minutes=self.CODE_MINUTES),
                current_attempts=0,
                new_attempts=0,
                expires_at=now + timedelta(minutes=self.REQUEST_MINUTES),
            )

            self.db.add(change)
            await self.db.flush()

            await enqueue_security_email(
                self.db,
                recipient=current_email,
                template="security_email_change_current",
                aggregate_id=change.id,
                payload={
                    "code": code,
                    "expires_in_minutes": self.CODE_MINUTES,
                },
            )

            await self._audit(
                user_id=user_id,
                request_id=change.id,
                event_type="email_change.initiated",
                old_email=current_email,
                new_email=proposed_email,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            await self.db.commit()
            await self.db.refresh(change)

            return change

        except Exception:
            await self.db.rollback()
            raise

    async def verify_current(
        self,
        *,
        user_id: str,
        request_id: str,
        code: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> bool:
        now = self._now()

        try:
            change = await self._get_locked_request(
                request_id=request_id,
                user_id=user_id,
            )

            self._assert_pending(change)

            if change.current_email_verified_at is not None:
                raise EmailChangeError(
                    "The current email address has already been verified."
                )

            if (
                change.current_code_expires_at is None
                or change.current_code_expires_at <= now
            ):
                raise EmailChangeError("The verification code has expired.")

            if change.current_attempts >= self.MAX_ATTEMPTS:
                raise EmailChangeError(
                    "Too many verification attempts. Start a new request."
                )

            expected = change.current_code_hash or ""
            supplied = self._digest(code)

            if not self._constant_time_equal(expected, supplied):
                change.current_attempts += 1

                if change.current_attempts >= self.MAX_ATTEMPTS:
                    change.cancelled_at = now

                await self._audit(
                    user_id=user_id,
                    request_id=change.id,
                    event_type="email_change.current_verification_failed",
                    old_email=change.current_email,
                    new_email=change.new_email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={
                        "attempt": change.current_attempts,
                    },
                )

                # Commit the failed attempt before returning the error.
                await self.db.commit()
                return False

            change.current_email_verified_at = now
            change.current_code_hash = None
            change.current_code_expires_at = None

            new_code = self._new_code()

            change.new_code_hash = self._digest(new_code)
            change.new_code_expires_at = now + timedelta(minutes=self.CODE_MINUTES)
            change.new_attempts = 0

            await enqueue_security_email(
                self.db,
                recipient=change.new_email,
                template="security_email_change_new",
                aggregate_id=change.id,
                payload={
                    "code": new_code,
                    "expires_in_minutes": self.CODE_MINUTES,
                },
            )

            await self._audit(
                user_id=user_id,
                request_id=change.id,
                event_type="email_change.current_verified",
                old_email=change.current_email,
                new_email=change.new_email,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            await self.db.commit()
            return True

        except Exception:
            await self.db.rollback()
            raise

    async def verify_new(
        self,
        *,
        user_id: str,
        request_id: str,
        code: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> bool:
        now = self._now()

        try:
            change = await self._get_locked_request(
                request_id=request_id,
                user_id=user_id,
            )

            self._assert_pending(change)

            if change.current_email_verified_at is None:
                raise EmailChangeError("Verify your current email address first.")

            if change.new_email_verified_at is not None:
                raise EmailChangeError(
                    "The proposed email address has already been verified."
                )

            if change.new_code_expires_at is None or change.new_code_expires_at <= now:
                raise EmailChangeError("The verification code has expired.")

            if change.new_attempts >= self.MAX_ATTEMPTS:
                raise EmailChangeError(
                    "Too many verification attempts. Start a new request."
                )

            expected = change.new_code_hash or ""
            supplied = self._digest(code)

            if not self._constant_time_equal(expected, supplied):
                change.new_attempts += 1

                if change.new_attempts >= self.MAX_ATTEMPTS:
                    change.cancelled_at = now

                await self._audit(
                    user_id=user_id,
                    request_id=change.id,
                    event_type="email_change.new_verification_failed",
                    old_email=change.current_email,
                    new_email=change.new_email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={
                        "attempt": change.new_attempts,
                    },
                )

                await self.db.commit()
                return False

            change.new_email_verified_at = now
            change.new_code_hash = None
            change.new_code_expires_at = None

            await self._audit(
                user_id=user_id,
                request_id=change.id,
                event_type="email_change.new_verified",
                old_email=change.current_email,
                new_email=change.new_email,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            await self.db.commit()
            return True

        except Exception:
            await self.db.rollback()
            raise

    async def complete(
        self,
        *,
        user_id: str,
        request_id: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> None:
        now = self._now()

        try:
            change = await self._get_locked_request(
                request_id=request_id,
                user_id=user_id,
            )

            self._assert_pending(change)

            if change.current_email_verified_at is None:
                raise EmailChangeError(
                    "The current email address has not been verified."
                )

            if change.new_email_verified_at is None:
                raise EmailChangeError(
                    "The proposed email address has not been verified."
                )

            user = await self._get_locked_user(user_id)

            if self._normalize_email(user.email) != change.current_email:
                raise EmailChangeError(
                    "The account email has changed since this request began. "
                    "Start a new request."
                )

            # Final uniqueness check, performed inside the transaction.
            await self._assert_email_available(change.new_email)

            old_email = user.email
            user.email = change.new_email

            change.completed_at = now
            change.current_code_hash = None
            change.new_code_hash = None

            # Revoke every session, including the session used for this request.
            await self.db.execute(
                update(UserSession)
                .where(
                    and_(
                        UserSession.user_id == user_id,
                        UserSession.revoked_at.is_(None),
                    )
                )
                .values(revoked_at=now)
            )

            await self._audit(
                user_id=user_id,
                request_id=change.id,
                event_type="email_change.completed",
                old_email=old_email,
                new_email=change.new_email,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "sessions_revoked": True,
                },
            )

            await self.db.commit()

        except IntegrityError:
            await self.db.rollback()
            raise EmailChangeError(
                "We could not use that email address. Please try another."
            )

        except Exception:
            await self.db.rollback()
            raise

    async def cancel(
        self,
        *,
        user_id: str,
        request_id: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> None:
        try:
            change = await self._get_locked_request(
                request_id=request_id,
                user_id=user_id,
            )

            self._assert_pending(change)

            change.cancelled_at = self._now()
            change.current_code_hash = None
            change.new_code_hash = None

            await self._audit(
                user_id=user_id,
                request_id=change.id,
                event_type="email_change.cancelled",
                old_email=change.current_email,
                new_email=change.new_email,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            await self.db.commit()

        except Exception:
            await self.db.rollback()
            raise

    async def get_status(
        self,
        *,
        user_id: str,
        request_id: str,
    ) -> EmailChangeRequest:
        result = await self.db.execute(
            select(EmailChangeRequest).where(
                and_(
                    EmailChangeRequest.id == request_id,
                    EmailChangeRequest.user_id == user_id,
                )
            )
        )

        change = result.scalars().first()

        if change is None:
            raise EmailChangeError("Email-change request not found.", 404)

        return change
