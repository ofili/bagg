import hmac
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.core.share_secrets import (
    KEY_VERSION,
    decrypt_share_token,
    encrypt_share_token,
)
from app.domains.sharing.secret_models import DocumentShareSecret

logger = logging.getLogger(__name__)

DOCUMENT_ID_FIELDS = {
    "invoice": "invoice_id",
    "quote": "quote_id",
    "receipt": "receipt_id",
}


def _document_field(document_type: str):
    field_name = DOCUMENT_ID_FIELDS.get(document_type)

    if field_name is None:
        raise ValueError("Unsupported share-secret document type")

    return getattr(DocumentShareSecret, field_name)


async def store_share_token(
    db: AsyncSession,
    *,
    document_type: str,
    document_id: str,
    token: str,
    expected_hash: str,
) -> DocumentShareSecret:
    """Persist an encrypted token.

    The caller must hold the corresponding document row lock and update
    its share_token_hash in the same transaction.
    """
    if not token or not expected_hash:
        raise ValueError("Token and token hash are required")

    if not hmac.compare_digest(hash_token(token), expected_hash):
        raise ValueError("Share token does not match the supplied hash")

    field = _document_field(document_type)

    result = await db.execute(
        select(DocumentShareSecret).where(field == document_id).with_for_update()
    )
    secret = result.scalar_one_or_none()

    encrypted_token = encrypt_share_token(
        document_type,
        document_id,
        token,
    )

    if secret is None:
        secret = DocumentShareSecret(
            id=f"shs_{uuid.uuid4().hex}",
            document_type=document_type,
            **{field.key: document_id},
            encrypted_token=encrypted_token,
            key_version=KEY_VERSION,
        )
        db.add(secret)
    else:
        secret.encrypted_token = encrypted_token
        secret.key_version = KEY_VERSION

    await db.flush()
    return secret


async def resolve_share_token(
    db: AsyncSession,
    *,
    document_type: str,
    document_id: str,
    expected_hash: str | None,
) -> str | None:
    """Resolve a token only when its decrypted value matches the document hash.

    Missing secrets and authentication failures fail closed. Configuration
    failures are allowed to propagate so they are not mistaken for missing
    public links.
    """
    if not expected_hash:
        return None

    field = _document_field(document_type)

    result = await db.execute(select(DocumentShareSecret).where(field == document_id))
    secret = result.scalar_one_or_none()

    if secret is None:
        return None

    if secret.document_type != document_type:
        return None

    try:
        token = decrypt_share_token(
            document_type,
            document_id,
            secret.encrypted_token,
            secret.key_version,
        )
    except ValueError:
        logger.warning(
            "Unable to authenticate document share secret",
            extra={
                "document_type": document_type,
                "document_id": document_id,
            },
        )
        return None

    if not hmac.compare_digest(hash_token(token), expected_hash):
        logger.warning(
            "Document share secret does not match document token hash",
            extra={
                "document_type": document_type,
                "document_id": document_id,
            },
        )
        return None

    return token


async def delete_share_token(
    db: AsyncSession,
    *,
    document_type: str,
    document_id: str,
) -> bool:
    """Delete a stored secret as part of token revocation or document recall."""
    field = _document_field(document_type)

    result = await db.execute(
        select(DocumentShareSecret).where(field == document_id).with_for_update()
    )
    secret = result.scalar_one_or_none()

    if secret is None:
        return False

    await db.delete(secret)
    await db.flush()
    return True
