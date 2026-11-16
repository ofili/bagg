from __future__ import annotations

from dataclasses import dataclass

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class ImmutableDocumentConflict(RuntimeError):
    """An immutable document key already contains different content."""


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
                s3={"addressing_style": settings.DOCUMENTS_S3_ADDRESSING_STYLE},
            ),
        )

    @staticmethod
    def _validate_key(key: str) -> None:
        if (
            not key
            or key.startswith("/")
            or any(part in {".", ".."} for part in key.split("/"))
        ):
            raise ValueError("Invalid document storage key")

    @staticmethod
    def _validate_content(content: bytes) -> None:
        if not content:
            raise ValueError("Cannot store an empty document")

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
        """Upload an object, replacing an existing object at the same key.

        Use put_if_absent for immutable issued document artifacts.
        """
        self._validate_key(key)
        self._validate_content(content)

        arguments = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": content,
            "ContentType": content_type,
        }

        if not settings.DOCUMENTS_S3_ENDPOINT_URL:
            arguments["ServerSideEncryption"] = "AES256"

        response = self.client.put_object(**arguments)

        return StoredDocument(
            storage_key=key,
            content_type=content_type,
            content_length=len(content),
            etag=response.get("ETag"),
        )

    def put_if_absent(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str = "application/pdf",
    ) -> StoredDocument:
        """Create an object only if its key does not already exist.

        If the key already exists with identical bytes, the operation is
        treated as an idempotent retry. Different bytes raise
        ImmutableDocumentConflict.

        This relies on S3-compatible conditional PutObject support for
        IfNoneMatch="*". The configured storage provider must support it.
        """
        self._validate_key(key)
        self._validate_content(content)

        arguments = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": content,
            "ContentType": content_type,
            "IfNoneMatch": "*",
        }

        if not settings.DOCUMENTS_S3_ENDPOINT_URL:
            arguments["ServerSideEncryption"] = "AES256"

        try:
            response = self.client.put_object(**arguments)
            return StoredDocument(
                storage_key=key,
                content_type=content_type,
                content_length=len(content),
                etag=response.get("ETag"),
            )
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")

            if code not in {"PreconditionFailed", "412"} and status != 412:
                raise

        existing_content = self.get(key)

        if existing_content != content:
            raise ImmutableDocumentConflict(
                "An immutable document already exists with different content"
            )

        return StoredDocument(
            storage_key=key,
            content_type=content_type,
            content_length=len(existing_content),
        )

    def get(self, key: str) -> bytes:
        self._validate_key(key)

        response = self.client.get_object(
            Bucket=self.bucket,
            Key=key,
        )
        return response["Body"].read()

    def delete(self, key: str) -> None:
        self._validate_key(key)

        self.client.delete_object(
            Bucket=self.bucket,
            Key=key,
        )
