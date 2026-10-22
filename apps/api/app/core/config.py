from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-this-in-production-super-secret-key-at-least-32-chars"
    DATABASE_URL: str = "postgresql+asyncpg://bagg:baggpassword@localhost:5433/bagg_dev"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://bagg:baggpassword@localhost:5433/bagg_dev"
    REDIS_URL: str = "redis://localhost:6379/0"
    API_BASE_URL: str = "http://localhost:8000"
    WEB_BASE_URL: str = "http://localhost:3000"

    # SMTP / Email
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    DEFAULT_FROM_EMAIL: str = "invoices@bagg.app"

    # Storage
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY_ID: str = "minioadmin"
    S3_SECRET_ACCESS_KEY: str = "minioadminpassword"
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


settings = Settings()
