import base64
import json
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from sqlalchemy import select

from app.core.config import settings


def _encryption_key() -> bytes:
    configured = settings.EMAIL_ENCRYPTION_KEY

    if not configured:
        if settings.ENVIRONMENT != "production":
            return b"bagg_dev_email_key_32bytes_long!"
        raise RuntimeError("Email encryption key is not configured")

    key = base64.urlsafe_b64decode(configured.encode("ascii"))

    if len(key) != 32:
        if settings.ENVIRONMENT != "production":
            return b"bagg_dev_email_key_32bytes_long!"
        raise RuntimeError("Invalid email encryption key")

    return key


def encrypt_email_payload(
    message_id: str,
    message_type: str,
    payload: dict,
) -> str:
    nonce = secrets.token_bytes(12)

    aad = f"{message_id}:{message_type}".encode("utf-8")

    plaintext = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode("utf-8")

    ciphertext = AESGCM(_encryption_key()).encrypt(
        nonce,
        plaintext,
        aad,
    )

    envelope = b"\x01" + nonce + ciphertext

    return base64.urlsafe_b64encode(envelope).decode("ascii")


def decrypt_email_payload(
    message_id: str,
    message_type: str,
    encrypted_payload: str,
) -> dict:
    envelope = base64.urlsafe_b64decode(encrypted_payload.encode("ascii"))

    if len(envelope) < 30 or envelope[0] != 1:
        raise ValueError("Invalid email payload envelope")

    nonce = envelope[1:13]
    ciphertext = envelope[13:]

    aad = f"{message_id}:{message_type}".encode("utf-8")

    try:
        plaintext = AESGCM(_encryption_key()).decrypt(
            nonce,
            ciphertext,
            aad,
        )
    except InvalidTag:
        raise ValueError("Email payload authentication failed") from None

    payload = json.loads(plaintext.decode("utf-8"))

    if not isinstance(payload, dict):
        raise ValueError("Invalid email payload")

    return payload


import uuid

from datetime import datetime, timezone

from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email_models import (
    EmailOutbox,
)


def enqueue_email(
    db: AsyncSession,
    *,
    message_type: str,
    aggregate_id: str,
    payload: dict,
) -> EmailOutbox:

    message_id = f"eml_{uuid.uuid4().hex}"

    message = EmailOutbox(
        id=message_id,
        message_type=message_type,
        aggregate_id=aggregate_id,
        encrypted_payload=encrypt_email_payload(
            message_id,
            message_type,
            payload,
        ),
        status="pending",
        attempts=0,
        available_at=datetime.now(timezone.utc),
    )

    db.add(message)

    return message


async def get_active_document_email(
    db: AsyncSession,
    *,
    message_type: str,
    aggregate_id: str,
) -> EmailOutbox | None:
    """Return an already queued or processing document email.

    Callers must hold the corresponding invoice or quote row lock. That
    serializes concurrent dispatch requests for the same document.
    """
    result = await db.execute(
        select(EmailOutbox)
        .where(
            EmailOutbox.message_type == message_type,
            EmailOutbox.aggregate_id == aggregate_id,
            EmailOutbox.status.in_(["pending", "processing"]),
        )
        .order_by(EmailOutbox.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_document_email(
    db: AsyncSession,
    *,
    message_type: str,
    aggregate_id: str,
) -> EmailOutbox | None:
    """Return the newest outbox message for a document, in any state.

    Callers must hold the corresponding invoice or quote row lock so the
    result cannot change between this read and the dispatch decision.
    """
    result = await db.execute(
        select(EmailOutbox)
        .where(
            EmailOutbox.message_type == message_type,
            EmailOutbox.aggregate_id == aggregate_id,
        )
        .order_by(
            EmailOutbox.created_at.desc(),
            EmailOutbox.id.desc(),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def should_meter_document_send(
    db: AsyncSession,
    *,
    message_type: str,
    aggregate_id: str,
    is_first_dispatch: bool,
) -> bool:
    """Decide whether a new document dispatch consumes the send allowance.

    An active pending/processing message is handled by the caller before this
    check. Resends are unmetered only when the most recent completed message
    for the document was delivered successfully. A retry after a terminal
    failure is metered again because the failed message's deduction was
    refunded. A first email after a link share is also metered because no
    outbox message exists yet.
    """
    if is_first_dispatch:
        return True

    latest = await get_latest_document_email(
        db,
        message_type=message_type,
        aggregate_id=aggregate_id,
    )

    return latest is None or latest.status != "sent"


async def supersede_active_document_emails(
    db: AsyncSession,
    *,
    message_type: str,
    aggregate_id: str,
) -> int:
    """Cancel pending or processing outbox messages for a document.

    Used when a recall or revision invalidates the document's share link.
    The target set is selected with ``SKIP LOCKED`` inside the same UPDATE, so
    a caller holding the document row lock never waits on the worker's outbox
    lock. A message already owned by the worker may still be delivered, but its
    link is revoked and the worker will not overwrite the reset delivery state.
    """
    target_ids = (
        select(EmailOutbox.id)
        .where(
            EmailOutbox.message_type == message_type,
            EmailOutbox.aggregate_id == aggregate_id,
            EmailOutbox.status.in_(["pending", "processing"]),
        )
        .with_for_update(skip_locked=True)
    )

    update_result = await db.execute(
        update(EmailOutbox)
        .where(EmailOutbox.id.in_(target_ids))
        .values(
            status="superseded",
            encrypted_payload=None,
            locked_at=None,
            locked_by=None,
            updated_at=datetime.now(timezone.utc),
        )
    )
    return update_result.rowcount or 0


async def acquire_email_issuance_lock(
    db: AsyncSession,
    email: str,
) -> None:
    """
    PostgreSQL transaction-scoped lock.

    All OTP issuance for the same normalized email address
    must acquire this lock.
    """
    await db.execute(
        text("""
            SELECT pg_advisory_xact_lock(
                hashtextextended(:email, 0)
            )
            """),
        {"email": email},
    )


async def invalidate_previous_otp_messages(
    db: AsyncSession,
    challenge_ids: list[str],
) -> None:

    if not challenge_ids:
        return

    await db.execute(
        update(EmailOutbox)
        .where(
            EmailOutbox.message_type == "login_otp",
            EmailOutbox.aggregate_id.in_(challenge_ids),
            EmailOutbox.status.in_(["pending", "processing"]),
        )
        .values(
            status="superseded",
            encrypted_payload=None,
            locked_at=None,
            locked_by=None,
            updated_at=datetime.now(timezone.utc),
        )
    )
