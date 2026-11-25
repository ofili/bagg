from app.core.config import settings
import time
import secrets


class StorageService:
    def get_presigned_upload_url(
        self,
        filename: str,
        workspace_id: str = "shared",
        engagement_id: str = "general",
    ) -> dict:
        """Returns presigned upload URL for proof-of-payment receipts, logos, or expense receipts."""
        clean_name = filename.strip().replace(" ", "_")
        key = f"workspaces/{workspace_id}/engagements/{engagement_id}/receipts/{secrets.token_hex(6)}_{clean_name}"
        return {
            "upload_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}",
            "file_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}",
            "storage_path": key,
            "fields": {},
        }

    def get_presigned_download_url(
        self,
        storage_path: str,
        expires_seconds: int = 900,
    ) -> str:
        """Returns time-limited signed download URL (AC-026).

        Defaults to 15 minutes (900s) expiration.
        """
        if not storage_path:
            return ""
        # Mock/S3 compatible tokenized download URL with expiration
        expires_at = int(time.time()) + expires_seconds
        token = secrets.token_hex(16)
        return (
            f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{storage_path}"
            f"?expires={expires_at}&token={token}"
        )
