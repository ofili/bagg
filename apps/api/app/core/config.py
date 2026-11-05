import base64
import binascii

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


DEFAULT_SECRET_KEY = "change-this-in-production-super-secret-key-at-least-32-chars"
DEFAULT_S3_SECRET_ACCESS_KEY = "minioadminpassword"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    DATABASE_URL: str = "postgresql+asyncpg://bagg:baggpassword@localhost:5433/bagg_dev"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://bagg:baggpassword@localhost:5433/bagg_dev"
    REDIS_URL: str = "redis://localhost:6379/0"
    API_BASE_URL: str = "http://localhost:8000"
    WEB_BASE_URL: str = "http://localhost:3000"

    # Internal scheduled jobs / worker endpoints
    INTERNAL_JOB_TOKEN: str | None = None
    EMAIL_ENCRYPTION_KEY: str | None = (
        "Jgmn1HnnF-Q0AYTcEplUDyoWZi_X_Vb6QhvaKmPNiLw="
    )
    EMAIL_WORKER_POLL_SECONDS: int = 2
    EMAIL_WORKER_BATCH_SIZE: int = 10
    EMAIL_WORKER_LEASE_SECONDS: int = 120
    EMAIL_MAX_ATTEMPTS: int = 5

    # Email
    SENDLY_API_KEY: Optional[str] = None
    SENDLY_FROM_EMAIL: Optional[str] = None
    SENDLY_FROM_NAME: Optional[str] = None

    # SMTP fallback (Mailpit locally)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    DEFAULT_FROM_EMAIL: str = "invoices@bagg.app"

    # Dedicated secret for keyed OTP hashing.
    # Must be supplied through deployment secrets in production.
    # Development falls back to SECRET_KEY in hash_code().
    OTP_HASH_SECRET: Optional[str] = None

    # Storage
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY_ID: str = "minioadmin"
    S3_SECRET_ACCESS_KEY: str = DEFAULT_S3_SECRET_ACCESS_KEY
    S3_BUCKET_NAME: str = "bagg-uploads"
    S3_REGION: str = "us-east-1"

    # Payment Processors
    PAYSTACK_SECRET_KEY: Optional[str] = None
    PAYSTACK_PUBLIC_KEY: Optional[str] = None
    PAYSTACK_INVOICE_WEBHOOK_SECRET: Optional[str] = None

    # Explicit trusted reverse-proxy addresses or CIDR ranges.
    # Examples:
    #   10.0.0.10
    #   10.0.0.0/8
    #   172.16.0.0/12
    # Multiple entries are comma-separated.
    TRUSTED_PROXY_IPS: str = ""

    # TODO: Add the actual ingress or reverse-proxy IP ranges to the production environment
    # TRUSTED_PROXY_IPS=10.0.0.0/8,172.16.0.0/12

    # Trusted reverse proxy hop count for X-Forwarded-For stripping.
    # Set to 1 for a single Nginx/Caddy/CF layer in production.
    TRUSTED_PROXY_HOPS: int = 1

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.ENVIRONMENT.strip().lower() != "production":
            return self

        if not self.SECRET_KEY.strip() or self.SECRET_KEY == DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a non-default value in production"
            )
        if (
            not self.S3_SECRET_ACCESS_KEY.strip()
            or self.S3_SECRET_ACCESS_KEY == DEFAULT_S3_SECRET_ACCESS_KEY
        ):
            raise ValueError(
                "S3_SECRET_ACCESS_KEY must be set to a non-default value in production"
            )
        if not self.INTERNAL_JOB_TOKEN or not self.INTERNAL_JOB_TOKEN.strip():
            raise ValueError(
                "INTERNAL_JOB_TOKEN must be set in production"
            )
        if not self.OTP_HASH_SECRET:
            raise ValueError(
                "OTP_HASH_SECRET must be set in production"
            )

        if self.OTP_HASH_SECRET == self.SECRET_KEY:
            raise ValueError(
                "OTP_HASH_SECRET must be different from SECRET_KEY"
            )

        if len(self.OTP_HASH_SECRET) < 32:
            raise ValueError(
                "OTP_HASH_SECRET must contain at least 32 characters in production"
            )
        if not self.EMAIL_ENCRYPTION_KEY:
            raise ValueError(
                "EMAIL_ENCRYPTION_KEY must be configured in production"
            )
        return self

    @field_validator("EMAIL_ENCRYPTION_KEY")
    @staticmethod
    def validate_email_encryption_key(value: str | None) -> str | None:
        if not value:
            return value

        try:
            decoded = base64.urlsafe_b64decode(value.encode("ascii"))
        except (ValueError, UnicodeError, binascii.Error) as exc:
            raise ValueError("EMAIL_ENCRYPTION_KEY must be URL-safe base64") from exc

        if len(decoded) != 32:
            raise ValueError("EMAIL_ENCRYPTION_KEY must decode to exactly 32 bytes")

        return value

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        """All allowed CORS origins including the proxy-rewrite same-origin path."""
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            self.WEB_BASE_URL,
        ]
        # Deduplicate while preserving order
        seen = set()
        result = []
        for origin in origins:
            if origin not in seen:
                seen.add(origin)
                result.append(origin)
        return result


settings = Settings()
