import secrets
import hashlib
from typing import Tuple


def generate_share_token() -> Tuple[str, str]:
    """
    Generates a secure, unguessable share token and its SHA256 hash.
    The raw token is returned to the user in the share link (e.g. /i/<token>).
    The hashed token is stored in the database.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def hash_token(token: str) -> str:
    """Returns SHA-256 hash of a token string."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class TransientShareTokenMixin:
    """Keep issued raw tokens in memory only; never persist them."""

    @property
    def share_token(self) -> str | None:
        return self.__dict__.get("_transient_share_token")

    @share_token.setter
    def share_token(self, value: str | None) -> None:
        self.__dict__["_transient_share_token"] = value
