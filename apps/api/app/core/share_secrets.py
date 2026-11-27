import base64
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

DOCUMENT_TYPES = {"invoice", "quote", "receipt"}
ENVELOPE_VERSION = 1
KEY_VERSION = "v1"


def _encryption_key() -> bytes:
    configured = settings.SHARE_TOKEN_ENCRYPTION_KEY

    if not configured:
        if settings.is_production:
            raise RuntimeError("Share-token encryption key is not configured")

        # Stable development-only key. Never use in production.
        return b"bagg_dev_share_key_32bytes_long!"

    key = base64.urlsafe_b64decode(configured.encode("ascii"))

    if len(key) != 32:
        raise RuntimeError("Invalid share-token encryption key")

    return key


def _associated_data(document_type: str, document_id: str) -> bytes:
    if document_type not in DOCUMENT_TYPES:
        raise ValueError("Unsupported share-secret document type")

    if not document_id or not document_id.strip():
        raise ValueError("Document ID is required")

    return (
        f"bagg:document-share-secret:{KEY_VERSION}:" f"{document_type}:{document_id}"
    ).encode("utf-8")


def encrypt_share_token(
    document_type: str,
    document_id: str,
    token: str,
) -> str:
    if not token:
        raise ValueError("Share token is required")

    nonce = secrets.token_bytes(12)

    ciphertext = AESGCM(_encryption_key()).encrypt(
        nonce,
        token.encode("utf-8"),
        _associated_data(document_type, document_id),
    )

    envelope = bytes([ENVELOPE_VERSION]) + nonce + ciphertext

    return base64.urlsafe_b64encode(envelope).decode("ascii")


def decrypt_share_token(
    document_type: str,
    document_id: str,
    encrypted_token: str,
    key_version: str,
) -> str:
    if key_version != KEY_VERSION:
        raise ValueError("Unsupported share-secret key version")

    try:
        envelope = base64.urlsafe_b64decode(encrypted_token.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise ValueError("Invalid share-secret envelope") from exc

    if len(envelope) < 30 or envelope[0] != ENVELOPE_VERSION:
        raise ValueError("Invalid share-secret envelope")

    nonce = envelope[1:13]
    ciphertext = envelope[13:]

    try:
        plaintext = AESGCM(_encryption_key()).decrypt(
            nonce,
            ciphertext,
            _associated_data(document_type, document_id),
        )
    except InvalidTag:
        raise ValueError("Share-secret authentication failed") from None

    try:
        token = plaintext.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Invalid share-secret plaintext") from exc

    if not token:
        raise ValueError("Empty share-secret plaintext")

    return token
