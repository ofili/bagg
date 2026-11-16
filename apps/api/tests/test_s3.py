from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from app.domains.documents.storage import s3 as s3_module
from app.domains.documents.storage.s3 import S3DocumentStorage


@pytest.fixture
def mock_s3_client(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(
        s3_module.boto3,
        "client",
        MagicMock(return_value=client),
    )
    return client


@pytest.fixture
def storage(mock_s3_client, monkeypatch):
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_BUCKET_NAME",
        "test-bagg-documents",
    )
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_ENDPOINT_URL",
        "http://localhost:9000",
    )
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_REGION",
        "us-east-1",
    )
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_ACCESS_KEY_ID",
        "test-access-key",
    )
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_SECRET_ACCESS_KEY",
        "test-secret-key",
    )
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_ADDRESSING_STYLE",
        "path",
    )

    return S3DocumentStorage()


def test_storage_initialises_s3_client(mock_s3_client, monkeypatch):
    monkeypatch.setattr(
        s3_module.settings,
        "DOCUMENTS_S3_BUCKET_NAME",
        "test-bagg-documents",
    )

    storage = S3DocumentStorage()

    assert storage.bucket == "test-bagg-documents"
    s3_module.boto3.client.assert_called_once()


def test_put_uploads_pdf(storage, mock_s3_client):
    content = b"%PDF-1.7 test"

    result = storage.put(
        key="workspaces/ws_1/documents/invoice/inv_1/v1/g1.pdf",
        content=content,
    )

    mock_s3_client.put_object.assert_called_once_with(
        Bucket="test-bagg-documents",
        Key="workspaces/ws_1/documents/invoice/inv_1/v1/g1.pdf",
        Body=content,
        ContentType="application/pdf",
    )

    assert result.storage_key.endswith("v1/g1.pdf")
    assert result.content_type == "application/pdf"
    assert result.content_length == len(content)


def test_put_supports_custom_content_type(storage, mock_s3_client):
    storage.put(
        key="documents/test.bin",
        content=b"test",
        content_type="application/octet-stream",
    )

    assert (
        mock_s3_client.put_object.call_args.kwargs["ContentType"]
        == "application/octet-stream"
    )


@pytest.mark.parametrize(
    "key",
    [
        "",
        "/absolute/path.pdf",
        "../secret.pdf",
        "documents/../secret.pdf",
        "documents/sub/../../secret.pdf",
    ],
)
def test_put_rejects_invalid_storage_key(storage, mock_s3_client, key):
    with pytest.raises(ValueError, match="Invalid document storage key"):
        storage.put(key=key, content=b"%PDF-test")

    mock_s3_client.put_object.assert_not_called()


def test_put_rejects_empty_content(storage, mock_s3_client):
    with pytest.raises(ValueError, match="empty document"):
        storage.put(key="documents/empty.pdf", content=b"")

    mock_s3_client.put_object.assert_not_called()


def test_get_returns_object_bytes(storage, mock_s3_client):
    body = MagicMock()
    body.read.return_value = b"%PDF-1.7 test"
    mock_s3_client.get_object.return_value = {"Body": body}

    result = storage.get("documents/invoice.pdf")

    assert result == b"%PDF-1.7 test"
    mock_s3_client.get_object.assert_called_once_with(
        Bucket="test-bagg-documents",
        Key="documents/invoice.pdf",
    )


def test_delete_removes_object(storage, mock_s3_client):
    storage.delete("documents/invoice.pdf")

    mock_s3_client.delete_object.assert_called_once_with(
        Bucket="test-bagg-documents",
        Key="documents/invoice.pdf",
    )


def test_ensure_bucket_does_not_recreate_existing_bucket(
    storage,
    mock_s3_client,
):
    storage.ensure_bucket()

    mock_s3_client.head_bucket.assert_called_once_with(Bucket="test-bagg-documents")
    mock_s3_client.create_bucket.assert_not_called()


def test_ensure_bucket_creates_missing_us_east_1_bucket(
    storage,
    mock_s3_client,
):
    mock_s3_client.head_bucket.side_effect = ClientError(
        {
            "Error": {
                "Code": "404",
                "Message": "Not Found",
            }
        },
        "HeadBucket",
    )

    storage.ensure_bucket()

    mock_s3_client.create_bucket.assert_called_once_with(Bucket="test-bagg-documents")


def test_ensure_bucket_propagates_non_not_found_errors(
    storage,
    mock_s3_client,
):
    mock_s3_client.head_bucket.side_effect = ClientError(
        {
            "Error": {
                "Code": "AccessDenied",
                "Message": "Access denied",
            }
        },
        "HeadBucket",
    )

    with pytest.raises(ClientError):
        storage.ensure_bucket()

    mock_s3_client.create_bucket.assert_not_called()


def test_storage_does_not_set_public_read_acl(storage, mock_s3_client):
    storage.put(
        key="documents/private.pdf",
        content=b"%PDF-1.7 test",
    )

    arguments = mock_s3_client.put_object.call_args.kwargs

    assert "ACL" not in arguments
    assert arguments["Bucket"] == "test-bagg-documents"


from app.domains.documents.storage.s3 import ImmutableDocumentConflict


def test_put_if_absent_uses_conditional_write(storage, mock_s3_client):
    content = b"%PDF-1.7 immutable document"

    mock_s3_client.put_object.return_value = {"ETag": '"abc123"'}

    result = storage.put_if_absent(
        key="workspaces/ws_1/documents/invoice/inv_1/v1/g1.pdf",
        content=content,
    )

    arguments = mock_s3_client.put_object.call_args.kwargs

    assert arguments["IfNoneMatch"] == "*"
    assert arguments["Body"] == content
    assert arguments["ContentType"] == "application/pdf"
    assert result.content_length == len(content)


def test_put_if_absent_accepts_existing_identical_content(
    storage,
    mock_s3_client,
):
    content = b"%PDF-1.7 immutable document"

    mock_s3_client.put_object.side_effect = ClientError(
        {
            "Error": {
                "Code": "PreconditionFailed",
                "Message": "Object already exists",
            },
            "ResponseMetadata": {"HTTPStatusCode": 412},
        },
        "PutObject",
    )

    body = MagicMock()
    body.read.return_value = content
    mock_s3_client.get_object.return_value = {"Body": body}

    result = storage.put_if_absent(
        key="documents/invoice.pdf",
        content=content,
    )

    assert result.content_length == len(content)
    mock_s3_client.get_object.assert_called_once_with(
        Bucket="test-bagg-documents",
        Key="documents/invoice.pdf",
    )


def test_put_if_absent_rejects_existing_different_content(
    storage,
    mock_s3_client,
):
    mock_s3_client.put_object.side_effect = ClientError(
        {
            "Error": {
                "Code": "PreconditionFailed",
                "Message": "Object already exists",
            },
            "ResponseMetadata": {"HTTPStatusCode": 412},
        },
        "PutObject",
    )

    body = MagicMock()
    body.read.return_value = b"%PDF-1.7 original document"
    mock_s3_client.get_object.return_value = {"Body": body}

    with pytest.raises(ImmutableDocumentConflict):
        storage.put_if_absent(
            key="documents/invoice.pdf",
            content=b"%PDF-1.7 different document",
        )


def test_put_if_absent_propagates_unexpected_storage_errors(
    storage,
    mock_s3_client,
):
    mock_s3_client.put_object.side_effect = ClientError(
        {
            "Error": {
                "Code": "AccessDenied",
                "Message": "Access denied",
            }
        },
        "PutObject",
    )

    with pytest.raises(ClientError):
        storage.put_if_absent(
            key="documents/invoice.pdf",
            content=b"%PDF-1.7 document",
        )

    mock_s3_client.get_object.assert_not_called()


def test_put_if_absent_rejects_invalid_key(storage, mock_s3_client):
    with pytest.raises(ValueError, match="Invalid document storage key"):
        storage.put_if_absent(
            key="documents/../invoice.pdf",
            content=b"%PDF-1.7 document",
        )

    mock_s3_client.put_object.assert_not_called()
