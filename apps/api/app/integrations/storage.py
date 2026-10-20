from app.core.config import settings

class StorageService:
    def get_presigned_upload_url(self, filename: str) -> dict:
        """Returns mock/S3 presigned upload URL for proof-of-payment receipts or logos."""
        return {
            "upload_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{filename}",
            "file_url": f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{filename}",
            "fields": {}
        }
