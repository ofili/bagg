import pytest
from pydantic import ValidationError

from app.core.config import (
    DEFAULT_S3_SECRET_ACCESS_KEY,
    DEFAULT_SECRET_KEY,
    Settings,
)


OTP_HASH_SECRET = ("independent-otp-secret-with-at-least-32-chars",)
INTERNAL_JOB_TOKEN = ("test-internal-job-token",)

def test_development_allows_local_defaults():
    settings = Settings(_env_file=None, ENVIRONMENT="development")

    assert settings.SECRET_KEY == DEFAULT_SECRET_KEY
    assert settings.S3_SECRET_ACCESS_KEY == DEFAULT_S3_SECRET_ACCESS_KEY


def test_production_rejects_default_secret_key():
    with pytest.raises(ValidationError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY=DEFAULT_SECRET_KEY,
            S3_SECRET_ACCESS_KEY="production-minio-secret",
        )


def test_production_rejects_default_minio_secret():
    with pytest.raises(ValidationError, match="S3_SECRET_ACCESS_KEY must be set"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="a" * 48,
            S3_SECRET_ACCESS_KEY=DEFAULT_S3_SECRET_ACCESS_KEY,
        )


@pytest.mark.parametrize("secret", ["", "   "])
def test_production_rejects_blank_secret_key(secret):
    with pytest.raises(ValidationError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY=secret,
            S3_SECRET_ACCESS_KEY="production-minio-secret",
        )


def test_production_accepts_non_default_secrets():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="Production",
        SECRET_KEY="a" * 48,
        S3_SECRET_ACCESS_KEY="production-minio-secret",
        INTERNAL_JOB_TOKEN="production-internal-job-token",
        OTP_HASH_SECRET="production-otp-hash-secret-123456789",
    )

    assert settings.ENVIRONMENT == "Production"


def test_production_rejects_missing_internal_job_token():
    with pytest.raises(
        ValidationError,
        match="INTERNAL_JOB_TOKEN must be set",
    ):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="a" * 48,
            S3_SECRET_ACCESS_KEY="production-minio-secret",
            INTERNAL_JOB_TOKEN=None,
        )


def test_production_rejects_missing_otp_hash_secret():
    with pytest.raises(
        ValidationError,
        match="OTP_HASH_SECRET",
    ):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="production-secret-key-123456789",
            S3_SECRET_ACCESS_KEY="production-minio-secret",
            INTERNAL_JOB_TOKEN="test-internal-job-token",
        )


def test_production_rejects_short_otp_hash_secret():
    with pytest.raises(
        ValidationError,
        match="OTP_HASH_SECRET",
    ):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="production-secret-key-123456789",
            S3_SECRET_ACCESS_KEY="production-minio-secret",
            INTERNAL_JOB_TOKEN="test-internal-job-token",
            OTP_HASH_SECRET="too-short",
        )


def test_production_rejects_reused_otp_secret():
    shared_secret = "production-secret-key-123456789"

    with pytest.raises(
        ValidationError,
        match="different from SECRET_KEY",
    ):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY=shared_secret,
            S3_SECRET_ACCESS_KEY="production-minio-secret",
            INTERNAL_JOB_TOKEN="test-internal-job-token",
            OTP_HASH_SECRET=shared_secret,
        )


def test_production_accepts_independent_otp_secret():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="production-secret-key-123456789",
        S3_SECRET_ACCESS_KEY="production-minio-secret",
        INTERNAL_JOB_TOKEN="test-internal-job-token",
        OTP_HASH_SECRET=("independent-otp-secret-with-at-least-32-chars"),
    )

    assert settings.OTP_HASH_SECRET is not None
