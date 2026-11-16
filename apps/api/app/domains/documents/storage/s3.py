from __future__ import annotations

from dataclasses import dataclass

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


@dataclass(frozen=True)
class StoredDocument:
    storage_key: str
    content_type: str
    content_length: int
    etag: str | None = None


class S3DocumentStorage:
    """Private S3-compatible object storage for generated documents."""

    def __init__(self):
        self.bucket = settings.DOCUMENTS_S3_BUCKET_NAME

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.DOCUMENTS_S3_ENDPOINT_URL or None,
            region_name=settings.DOCUMENTS_S3_REGION,
            aws_access_key_id=settings.DOCUMENTS_S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.DOCUMENTS_S3_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": (settings.DOCUMENTS_S3_ADDRESSING_STYLE)},
            ),
        )

    def ensure_bucket(self) -> None:
        """Create the bucket if it does not exist.

        Call from an explicit infrastructure/bootstrap command, not
        automatically on every API request.
        """
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code not in {"404", "NoSuchBucket", "NotFound"}:
                raise

        if settings.DOCUMENTS_S3_REGION == "us-east-1":
            self.client.create_bucket(Bucket=self.bucket)
        else:
            self.client.create_bucket(
                Bucket=self.bucket,
                CreateBucketConfiguration={
                    "LocationConstraint": settings.DOCUMENTS_S3_REGION
                },
            )

    def put(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str = "application/pdf",
    ) -> StoredDocument:
        if not key or key.startswith("/") or ".." in key.split("/"):
            raise ValueError("Invalid document storage key")

        if not content:
            raise ValueError("Cannot store an empty document")

        # self.client.put_object(
        #     Bucket=self.bucket,
        #     Key=key,
        #     Body=content,
        #     ContentType=content_type,
        #     ServerSideEncryption=(
        #         "AES256" if not settings.DOCUMENTS_S3_ENDPOINT_URL else None
        #     ),
        # )

        arguments = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": content,
            "ContentType": content_type,
        }

        # Enable this for AWS S3. Configure equivalent encryption
        # at the bucket/provider level for other S3-compatible services.
        if not settings.S3_ENDPOINT_URL:
            arguments["ServerSideEncryption"] = "AES256"

        self.client.put_object(**arguments)

        return StoredDocument(
            storage_key=key,
            content_type=content_type,
            content_length=len(content),
        )

    def get(self, key: str) -> bytes:
        response = self.client.get_object(
            Bucket=self.bucket,
            Key=key,
        )
        return response["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(
            Bucket=self.bucket,
            Key=key,
        )
