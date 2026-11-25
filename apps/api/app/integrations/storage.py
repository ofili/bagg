import hmac
import hashlib
import time
import secrets
from app.core.config import settings


class StorageService:
    @staticmethod
    def _generate_hmac(path: str, expires_at: int) -> str:
        secret = settings.SECRET_KEY.encode("utf-8")
        msg = f"{path}:{expires_at}".encode("utf-8")
        return hmac.new(secret, msg, hashlib.sha256).hexdigest()

    @classmethod
    def verify_download_signature(cls, path: str, expires_at: int, signature: str) -> bool:
        if int(time.time()) > expires_at:
            return False
        expected = cls._generate_hmac(path, expires_at)
        return hmac.compare_digest(expected, signature)

    def get_presigned_upload_url(
        self,
        filename: str,
        workspace_id: str,
        engagement_id: str,
        expires_seconds: int = 900,
    ) -> dict:
        """Returns HMAC-signed upload URL for proof-of-payment receipts, logos, or expense receipts."""
        clean_name = filename.strip().replace(" ", "_")
        key = f"workspaces/{workspace_id}/engagements/{engagement_id}/receipts/{secrets.token_hex(6)}_{clean_name}"
        expires_at = int(time.time()) + expires_seconds
        sig = self._generate_hmac(key, expires_at)
        return {
            "upload_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}?expires={expires_at}&sig={sig}",
            "file_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}",
            "storage_path": key,
            "fields": {},
        }

    def get_presigned_download_url(
        self,
        storage_path: str,
        expires_seconds: int = 900,
    ) -> str:
        """Returns time-limited HMAC-signed download URL (AC-026).

        Defaults to 15 minutes (900s) expiration.
        """
        if not storage_path:
            return ""
        expires_at = int(time.time()) + expires_seconds
        sig = self._generate_hmac(storage_path, expires_at)
        return (
            f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{storage_path}"
            f"?expires={expires_at}&sig={sig}"
        )
