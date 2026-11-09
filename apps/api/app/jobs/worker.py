import asyncio
import logging
import os
import random
import socket
import uuid

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select, text

import app.models  # noqa: F401  (registers every SQLAlchemy model)

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.domains.auth.models import MagicLoginCode
from app.domains.reminders.models import ReminderJob
from app.domains.security.models import SecurityChallenge
from app.integrations.email_models import (
    EmailOutbox,
    EmailDeliveryAttempt,
)
from app.integrations.email_outbox import (
    decrypt_email_payload,
)
from app.integrations.email_delivery import (
    deliver_email,
    DeliveryOutcome,
)

logger = logging.getLogger("bagg-worker")

WORKER_ID = f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:8]}"

RETRY_DELAYS = [30, 120, 600, 1800]


def utcnow():
    return datetime.now(timezone.utc)


async def claim_batch() -> list[str]:
    now = utcnow()

    lease_expiry = now - timedelta(seconds=settings.EMAIL_WORKER_LEASE_SECONDS)

    claimed_ids = []

    async with AsyncSessionLocal() as db:
        async with db.begin():

            stmt = (
                select(EmailOutbox)
                .where(
                    or_(
                        and_(
                            EmailOutbox.status == "pending",
                            EmailOutbox.available_at <= now,
                        ),
                        and_(
                            EmailOutbox.status == "processing",
                            EmailOutbox.locked_at < lease_expiry,
                        ),
                    )
                )
                .order_by(
                    EmailOutbox.available_at.asc(),
                    EmailOutbox.created_at.asc(),
                )
                .limit(settings.EMAIL_WORKER_BATCH_SIZE)
                .with_for_update(skip_locked=True)
            )

            result = await db.execute(stmt)
            messages = result.scalars().all()

            for message in messages:
                message.status = "processing"
                message.locked_at = now
                message.locked_by = WORKER_ID
                message.attempts += 1
                message.updated_at = now

                claimed_ids.append(message.id)

    return claimed_ids


async def acquire_delivery_lock(
    email: str,
):
    """
    Acquire a PostgreSQL session-level advisory lock.

    The connection is committed after acquiring the lock.
    This keeps the lock without retaining an open transaction.
    """
    connection = await engine.connect()

    try:
        await connection.execute(
            text("""
                SELECT pg_advisory_lock(
                    hashtextextended(:email, 0)
                )
                """),
            {"email": email},
        )

        await connection.commit()

        return connection

    except Exception:
        await connection.close()
        raise


async def release_delivery_lock(connection, email: str):
    try:
        await connection.execute(
            text("""
                SELECT pg_advisory_unlock(
                    hashtextextended(:email, 0)
                )
                """),
            {"email": email},
        )
        await connection.commit()

    finally:
        await connection.close()


async def is_current_otp(
    db,
    message: EmailOutbox,
    recipient: str,
) -> bool:
    now = utcnow()

    if message.message_type == "login_otp":
        challenge_result = await db.execute(
            select(MagicLoginCode)
            .where(MagicLoginCode.id == message.aggregate_id)
            .with_for_update()
        )

        challenge = challenge_result.scalars().first()

        if challenge is None:
            return False

        if challenge.email != recipient:
            return False

        if challenge.used_at is not None:
            return False

        if challenge.expires_at <= now:
            return False

        current_result = await db.execute(
            select(MagicLoginCode.id)
            .where(
                MagicLoginCode.email == recipient,
                MagicLoginCode.used_at.is_(None),
                MagicLoginCode.expires_at > now,
            )
            .order_by(MagicLoginCode.created_at.desc())
            .limit(1)
        )

        return current_result.scalar_one_or_none() == challenge.id

    if message.message_type == "security_step_up":
        challenge_result = await db.execute(
            select(SecurityChallenge)
            .where(SecurityChallenge.id == message.aggregate_id)
            .with_for_update()
        )

        challenge = challenge_result.scalars().first()

        if challenge is None:
            return False

        if challenge.destination != recipient:
            return False

        if challenge.consumed_at is not None:
            return False

        if challenge.revoked_at is not None:
            return False

        if challenge.expires_at <= now:
            return False

        current_result = await db.execute(
            select(SecurityChallenge.id)
            .where(
                SecurityChallenge.user_id == challenge.user_id,
                SecurityChallenge.purpose == challenge.purpose,
                SecurityChallenge.destination == recipient,
                SecurityChallenge.consumed_at.is_(None),
                SecurityChallenge.revoked_at.is_(None),
                SecurityChallenge.expires_at > now,
            )
            .order_by(SecurityChallenge.created_at.desc())
            .limit(1)
        )

        return current_result.scalar_one_or_none() == challenge.id

    return False


async def mark_superseded(message_id: str):
    async with AsyncSessionLocal() as db:
        async with db.begin():
            message = await db.get(
                EmailOutbox,
                message_id,
                with_for_update=True,
            )

            if message is None:
                return

            message.status = "superseded"
            message.encrypted_payload = None
            message.locked_at = None
            message.locked_by = None
            message.updated_at = utcnow()

            if message.message_type == "invoice_reminder":
                reminder = await db.get(
                    ReminderJob,
                    message.aggregate_id,
                    with_for_update=True,
                )

                if reminder is not None and reminder.status != "sent":
                    reminder.status = "cancelled"
                    reminder.updated_at = utcnow()


async def record_result(
    message_id: str,
    attempt_number: int,
    result,
):
    now = utcnow()

    async with AsyncSessionLocal() as db:
        async with db.begin():
            message = await db.get(
                EmailOutbox,
                message_id,
                with_for_update=True,
            )

            if message is None:
                return

            # A cancellation or superseding operation may have won the race.
            if message.status == "superseded":
                return

            message.last_provider = result.provider
            message.locked_at = None
            message.locked_by = None
            message.updated_at = now

            db.add(
                EmailDeliveryAttempt(
                    outbox_id=message.id,
                    attempt_number=attempt_number,
                    provider=result.provider,
                    outcome=result.outcome.value,
                    error_code=result.error_code,
                )
            )

            terminal_failure = False

            if result.outcome == DeliveryOutcome.ACCEPTED:
                message.status = "sent"
                message.sent_at = now
                message.encrypted_payload = None
                message.last_error_code = None

            elif result.outcome == DeliveryOutcome.PERMANENT:
                message.status = "failed"
                message.failed_at = now
                message.encrypted_payload = None
                message.last_error_code = result.error_code
                terminal_failure = True

            elif message.attempts >= settings.EMAIL_MAX_ATTEMPTS:
                message.status = "failed"
                message.failed_at = now
                message.encrypted_payload = None
                message.last_error_code = (
                    result.error_code or "maximum_attempts_exceeded"
                )
                terminal_failure = True

            else:
                message.status = "pending"
                message.last_error_code = result.error_code

                delay_index = min(
                    message.attempts - 1,
                    len(RETRY_DELAYS) - 1,
                )

                base_delay = RETRY_DELAYS[delay_index]
                jitter = random.uniform(0, base_delay * 0.2)

                message.available_at = now + timedelta(seconds=base_delay + jitter)

            # Keep the reminder domain's state aligned with the terminal
            # result of its associated outbox message.
            if message.message_type == "invoice_reminder":
                reminder = await db.get(
                    ReminderJob,
                    message.aggregate_id,
                    with_for_update=True,
                )

                if reminder is not None and reminder.status != "cancelled":
                    if message.status == "sent":
                        reminder.status = "sent"
                        reminder.sent_at = now
                        reminder.error_message = None

                    elif terminal_failure:
                        reminder.status = "failed"
                        reminder.error_message = (
                            result.error_code or "email_delivery_failed"
                        )

                    else:
                        # Retryable or ambiguous provider outcomes remain
                        # queued. The outbox worker owns the retry lifecycle.
                        reminder.status = "queued"

                    reminder.updated_at = now

            if message.status == "failed":
                logger.error(
                    "Email delivery permanently failed",
                    extra={
                        "message_id": message.id,
                        "message_type": message.message_type,
                        "provider": result.provider,
                        "attempt": message.attempts,
                        "error_code": result.error_code,
                    },
                )


async def process_message(message_id: str):

    async with AsyncSessionLocal() as db:
        message = await db.get(EmailOutbox, message_id)

        if (
            message is None
            or message.status != "processing"
            or message.locked_by != WORKER_ID
        ):
            return

        if not message.encrypted_payload:
            return

        message_type = message.message_type
        aggregate_id = message.aggregate_id
        attempt_number = message.attempts
        encrypted_payload = message.encrypted_payload
        selected_provider = message.provider

        try:
            payload = decrypt_email_payload(
                message.id,
                message_type,
                encrypted_payload,
            )
        except Exception:
            result = type(
                "Result",
                (),
                {
                    "outcome": DeliveryOutcome.PERMANENT,
                    "provider": selected_provider or "unknown",
                    "error_code": "payload_decryption_failed",
                },
            )()

            await record_result(
                message_id,
                attempt_number,
                result,
            )
            return

    recipient = payload.get("to_email")
    subject = payload.get("subject")
    html = payload.get("html")

    if not all(
        isinstance(value, str) and value.strip() for value in (recipient, subject, html)
    ):
        result = type(
            "Result",
            (),
            {
                "outcome": DeliveryOutcome.PERMANENT,
                "provider": selected_provider or "unknown",
                "error_code": "invalid_email_payload",
            },
        )()

        await record_result(message_id, attempt_number, result)
        return

    lock_connection = None

    try:
        if message_type in {"login_otp", "security_step_up"}:
            lock_connection = await acquire_delivery_lock(recipient)

            async with AsyncSessionLocal() as db:
                async with db.begin():

                    current_message = await db.get(
                        EmailOutbox,
                        message_id,
                        with_for_update=True,
                    )

                    if (
                        current_message is None
                        or current_message.status != "processing"
                    ):
                        return

                    valid = await is_current_otp(
                        db,
                        current_message,
                        recipient,
                    )

                    if not valid:
                        current_message.status = "superseded"
                        current_message.encrypted_payload = None
                        current_message.locked_at = None
                        current_message.locked_by = None
                        current_message.updated_at = utcnow()
                        return

        if selected_provider is None:
            selected_provider = "sendly" if settings.SENDLY_API_KEY else "smtp"

            async with AsyncSessionLocal() as db:
                async with db.begin():
                    current_message = await db.get(
                        EmailOutbox,
                        message_id,
                        with_for_update=True,
                    )

                    if (
                        current_message is None
                        or current_message.status != "processing"
                    ):
                        return

                    if current_message.provider is None:
                        current_message.provider = selected_provider
                    else:
                        selected_provider = current_message.provider

        # Recheck that this message is still owned by this worker.
        # A payment or recall may have cancelled a queued reminder while
        # this worker was preparing the email.
        async with AsyncSessionLocal() as db:
            current_message = await db.get(
                EmailOutbox,
                message_id,
                with_for_update=True,
            )

            if (
                current_message is None
                or current_message.status != "processing"
                or current_message.locked_by != WORKER_ID
            ):
                return

        result = await deliver_email(
            to_email=recipient,
            subject=subject,
            html=html,
            provider=selected_provider,
        )

        await record_result(
            message_id,
            attempt_number,
            result,
        )

    except Exception:
        # Do not log exception messages: they may contain PII.
        logger.exception(
            "Email worker processing error",
            extra={"message_id": message_id},
        )

    finally:
        if lock_connection is not None:
            await release_delivery_lock(
                lock_connection,
                recipient,
            )


async def main():
    logger.info(
        "Bagg email worker started",
        extra={"worker_id": WORKER_ID},
    )

    while True:
        try:
            message_ids = await claim_batch()

            if not message_ids:
                await asyncio.sleep(settings.EMAIL_WORKER_POLL_SECONDS)
                continue

            for message_id in message_ids:
                await process_message(message_id)

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception("Email worker loop failed")
            await asyncio.sleep(5)


import logging

logger = logging.getLogger("bagg.email")


def log_delivery_event(
    *,
    message_id: str,
    message_type: str,
    provider: str | None,
    attempt: int,
    event: str,
    error_code: str | None = None,
):
    logger.info(
        "Email delivery event",
        extra={
            "message_id": message_id,
            "message_type": message_type,
            "provider": provider,
            "attempt": attempt,
            "event": event,
            "error_code": error_code,
        },
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
