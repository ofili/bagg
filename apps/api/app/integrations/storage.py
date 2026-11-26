import secrets
import boto3
from botocore.config import Config
from app.core.config import settings


class StorageService:
    """S3-compatible object storage service generating SigV4 presigned URLs (AC-026)."""

    def __init__(self) -> None:
        self.bucket = settings.S3_BUCKET_NAME
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
            ),
        )

    def get_presigned_upload_url(
        self,
        filename: str,
        workspace_id: str,
        engagement_id: str,
        expires_seconds: int = 900,
    ) -> dict:
        """Returns an S3 SigV4 presigned PUT URL for expense receipts (AC-026)."""
        clean_name = filename.strip().replace(" ", "_")
        key = (
            f"workspaces/{workspace_id}/engagements/{engagement_id}"
            f"/receipts/{secrets.token_hex(6)}_{clean_name}"
        )
        upload_url = self.client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )
        return {
            "upload_url": upload_url,
            "file_url": f"{settings.S3_ENDPOINT_URL}/{self.bucket}/{key}",
            "storage_path": key,
            "fields": {},
        }

    def get_presigned_download_url(
        self,
        storage_path: str,
        expires_seconds: int = 900,
    ) -> str:
        """Returns an S3 SigV4 presigned GET URL with short-lived expiration (AC-026)."""
        if not storage_path:
            return ""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": storage_path},
            ExpiresIn=expires_seconds,
        )
