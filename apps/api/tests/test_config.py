import pytest
from pydantic import ValidationError

from app.core.config import (
    DEFAULT_S3_SECRET_ACCESS_KEY,
    DEFAULT_SECRET_KEY,
    Settings,
)


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
    )

    assert settings.ENVIRONMENT == "Production"
