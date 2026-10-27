from pydantic import model_validator
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
        return self


settings = Settings()
