import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException
from app.domains.security.crypto import (
    constant_time_equal,
    generate_recovery_code,
    generate_verification_code,
    hash_recovery_code,
    hash_verification_code,
    payload_digest,
)
from app.domains.security.models import (
    AccountRecoveryCode,
    SecurityAuditEvent,
    SecurityChallenge,
)
from app.domains.security.repository import SecurityRepository


class SecurityPurpose:
    EMAIL_CHANGE_CURRENT = "email_change_current"
    EMAIL_CHANGE_NEW = "email_change_new"

    PAYMENT_PROFILE_CREATE = "payment_profile_create"
    PAYMENT_PROFILE_UPDATE = "payment_profile_update"
    PAYMENT_PROFILE_DELETE = "payment_profile_delete"

    ACCOUNT_RECOVERY = "account_recovery"
    ACCOUNT_DELETION = "account_deletion"


ALLOWED_PURPOSES = {
    SecurityPurpose.EMAIL_CHANGE_CURRENT,
    SecurityPurpose.EMAIL_CHANGE_NEW,
    SecurityPurpose.PAYMENT_PROFILE_CREATE,
    SecurityPurpose.PAYMENT_PROFILE_UPDATE,
    SecurityPurpose.PAYMENT_PROFILE_DELETE,
    SecurityPurpose.ACCOUNT_RECOVERY,
    SecurityPurpose.ACCOUNT_DELETION,
}


class SecurityService:
    CHALLENGE_MINUTES = 5
    MAX_ATTEMPTS = 5
    RECOVERY_CODE_COUNT = 10

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SecurityRepository(db)

    async def create_challenge(
        self,
        *,
        user_id: str,
        workspace_id: Optional[str],
        purpose: str,
        payload: dict[str, Any],
        destination: str,
    ) -> tuple[SecurityChallenge, str]:
        if purpose not in ALLOWED_PURPOSES:
            raise BadRequestException("Unsupported security operation")

        now = datetime.now(timezone.utc)

        code = generate_verification_code()
        operation_id = secrets.token_urlsafe(24)

        challenge = SecurityChallenge(
            user_id=user_id,
            workspace_id=workspace_id,
            operation_id=operation_id,
            purpose=purpose,
            code_hash=hash_verification_code(
                code,
                purpose=purpose,
                user_id=user_id,
            ),
            payload_hash=payload_digest(payload),
            destination=destination,
            attempts=0,
            max_attempts=self.MAX_ATTEMPTS,
            expires_at=now + timedelta(minutes=self.CHALLENGE_MINUTES),
        )

        self.db.add(challenge)
        await self.db.flush()

        return challenge, code

    async def verify_and_consume(
        self,
        *,
        challenge_id: str,
        user_id: str,
        workspace_id: Optional[str],
        purpose: str,
        payload: dict[str, Any],
        code: str,
    ) -> SecurityChallenge:
        now = datetime.now(timezone.utc)

        result = await self.db.execute(
            select(SecurityChallenge)
            .where(
                and_(
                    SecurityChallenge.id == challenge_id,
                    SecurityChallenge.user_id == user_id,
                    SecurityChallenge.purpose == purpose,
                    SecurityChallenge.workspace_id == workspace_id,
                    SecurityChallenge.consumed_at.is_(None),
                    SecurityChallenge.revoked_at.is_(None),
                    SecurityChallenge.expires_at > now,
                )
            )
            .with_for_update()
        )

        challenge = result.scalars().first()

        if challenge is None:
            raise BadRequestException(
                "Invalid or expired security challenge"
            )

        if challenge.attempts >= challenge.max_attempts:
            raise BadRequestException(
                "Security challenge attempt limit exceeded"
            )

        challenge.attempts += 1

        expected_hash = hash_verification_code(
            code,
            purpose=purpose,
            user_id=user_id,
        )

        if not constant_time_equal(
            challenge.code_hash,
            expected_hash,
        ):
            await self.db.flush()
            raise BadRequestException("Invalid verification code")

        expected_payload_hash = payload_digest(payload)

        if not constant_time_equal(
            challenge.payload_hash,
            expected_payload_hash,
        ):
            challenge.revoked_at = now
            await self.db.flush()

            raise BadRequestException(
                "The operation has changed. Request a new verification code."
            )

        challenge.consumed_at = now

        await self.db.flush()

        return challenge

    async def revoke_user_challenges(
        self,
        *,
        user_id: str,
    ) -> int:
        now = datetime.now(timezone.utc)

        result = await self.db.execute(
            update(SecurityChallenge)
            .where(
                SecurityChallenge.user_id == user_id,
                SecurityChallenge.consumed_at.is_(None),
                SecurityChallenge.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )

        return result.rowcount or 0

    async def create_recovery_codes(
        self,
        *,
        user_id: str,
    ) -> list[str]:
        now = datetime.now(timezone.utc)

        await self.db.execute(
            update(AccountRecoveryCode)
            .where(
                AccountRecoveryCode.user_id == user_id,
                AccountRecoveryCode.used_at.is_(None),
                AccountRecoveryCode.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )

        raw_codes: list[str] = []

        for _ in range(self.RECOVERY_CODE_COUNT):
            code = generate_recovery_code()
            raw_codes.append(code)

            self.db.add(
                AccountRecoveryCode(
                    user_id=user_id,
                    code_hash=hash_recovery_code(code),
                )
            )

        await self.db.flush()

        return raw_codes

    async def consume_recovery_code(
        self,
        *,
        user_id: str,
        code: str,
    ) -> AccountRecoveryCode:
        now = datetime.now(timezone.utc)
        code_hash = hash_recovery_code(code)

        result = await self.db.execute(
            select(AccountRecoveryCode)
            .where(
                AccountRecoveryCode.user_id == user_id,
                AccountRecoveryCode.code_hash == code_hash,
                AccountRecoveryCode.used_at.is_(None),
                AccountRecoveryCode.revoked_at.is_(None),
            )
            .with_for_update()
        )

        recovery_code = result.scalars().first()

        if recovery_code is None:
            raise BadRequestException(
                "Invalid or already used recovery code"
            )

        recovery_code.used_at = now

        await self.db.flush()

        return recovery_code

    async def write_audit_event(
        self,
        *,
        event_type: str,
        outcome: str,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        correlation_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> SecurityAuditEvent:
        event = SecurityAuditEvent(
            user_id=user_id,
            workspace_id=workspace_id,
            event_type=event_type,
            outcome=outcome,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            metadata_json=metadata or {},
        )

        self.db.add(event)
        await self.db.flush()

        return event

    async def require_consumed_step_up(
        self,
        *,
        user,
        workspace,
        challenge_id: str,
        purpose: str,
        payload: dict[str, Any],
    ) -> SecurityChallenge:
        """
        Authorise one exact protected operation using a recently verified
        challenge.

        The challenge is locked and marked revoked in the same transaction
        as the protected mutation. This makes the authorisation single-use:
        a failed mutation rolls back both the mutation and challenge use.
        """

        now = datetime.now(timezone.utc)
        verification_cutoff = now - timedelta(
            minutes=self.CHALLENGE_MINUTES
        )

        result = await self.db.execute(
            select(SecurityChallenge)
            .where(
                and_(
                    SecurityChallenge.id == challenge_id,
                    SecurityChallenge.user_id == user.id,
                    SecurityChallenge.workspace_id == workspace.id,
                    SecurityChallenge.purpose == purpose,
                    SecurityChallenge.consumed_at.is_not(None),
                    SecurityChallenge.consumed_at >= verification_cutoff,
                    SecurityChallenge.revoked_at.is_(None),
                    SecurityChallenge.expires_at > now,
                )
            )
            .with_for_update()
        )

        challenge = result.scalars().first()

        if challenge is None:
            raise BadRequestException(
                "A valid, recently verified security challenge is required"
            )

        if not constant_time_equal(
            challenge.payload_hash,
            payload_digest(payload),
        ):
            raise BadRequestException(
                "Security verification does not match this operation"
            )

        # A verified challenge is spent when it authorises the mutation.
        # This update is deliberately not committed here. The caller's
        # payment-profile transaction commits it with the actual mutation.
        challenge.revoked_at = now

        await self.db.flush()

        return challenge

    async def verify_challenge_code(
        self,
        *,
        challenge_id: str,
        user_id: str,
        workspace_id: Optional[str],
        code: str,
    ) -> SecurityChallenge:
        """
        Verify a challenge using its server-stored purpose and payload hash.

        The browser supplies only the challenge ID and code. The operation
        details remain server-owned.
        """

        now = datetime.now(timezone.utc)

        result = await self.db.execute(
            select(SecurityChallenge)
            .where(
                and_(
                    SecurityChallenge.id == challenge_id,
                    SecurityChallenge.user_id == user_id,
                    SecurityChallenge.workspace_id == workspace_id,
                    SecurityChallenge.consumed_at.is_(None),
                    SecurityChallenge.revoked_at.is_(None),
                    SecurityChallenge.expires_at > now,
                )
            )
            .with_for_update()
        )

        challenge = result.scalars().first()

        if challenge is None:
            raise BadRequestException(
                "Invalid or expired security challenge"
            )

        if challenge.attempts >= challenge.max_attempts:
            raise BadRequestException(
                "Security challenge attempt limit exceeded"
            )

        challenge.attempts += 1

        expected_hash = hash_verification_code(
            code,
            purpose=challenge.purpose,
            user_id=user_id,
        )

        if not constant_time_equal(
            challenge.code_hash,
            expected_hash,
        ):
            await self.db.flush()
            raise BadRequestException("Invalid verification code")

        challenge.consumed_at = now

        await self.db.flush()

        return challenge
