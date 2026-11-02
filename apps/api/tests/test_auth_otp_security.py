import hashlib
import hmac

from app.core.config import settings
from app.domains.auth.service import (
    hash_code,
    hash_session_token,
)


def test_otp_hash_uses_hmac(monkeypatch):
    secret = "test-otp-secret-that-is-at-least-32-chars"

    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        secret,
    )

    code = "123456"

    expected = hmac.new(
        secret.encode("utf-8"),
        code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    assert hash_code(code) == expected


def test_otp_hash_is_deterministic(monkeypatch):
    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        "test-otp-secret-that-is-at-least-32-chars",
    )

    assert hash_code("123456") == hash_code("123456")


def test_otp_hash_changes_with_secret(monkeypatch):
    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        "first-test-secret-that-is-at-least-32-chars",
    )

    first = hash_code("123456")

    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        "second-test-secret-that-is-at-least-32-chars",
    )

    second = hash_code("123456")

    assert first != second


def test_otp_hash_normalizes_whitespace(monkeypatch):
    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        "test-otp-secret-that-is-at-least-32-chars",
    )

    assert hash_code(" 123456 ") == hash_code("123456")


def test_session_token_hash_remains_sha256():
    token = "example-high-entropy-session-token"

    expected = hashlib.sha256(token.encode("utf-8")).hexdigest()

    assert hash_session_token(token) == expected


def test_session_token_hash_is_not_otp_hash(monkeypatch):
    monkeypatch.setattr(
        settings,
        "OTP_HASH_SECRET",
        "test-otp-secret-that-is-at-least-32-chars",
    )

    token = "example-high-entropy-session-token"

    assert hash_session_token(token) != hash_code(token)
