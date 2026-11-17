from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.responses import Response

from app.core.security import hash_token
from app.domains.documents import delivery


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDB:
    def __init__(self, value):
        self.execute = AsyncMock(return_value=FakeResult(value))


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("document_type", "document"),
    [
        (
            "invoice",
            SimpleNamespace(
                id="inv_123",
                workspace_id="ws_123",
                status="issued",
                share_token=None,
                share_token_hash=hash_token("valid-token"),
            ),
        ),
        (
            "quote",
            SimpleNamespace(
                id="qot_123",
                workspace_id="ws_123",
                status="sent",
                share_token=None,
                share_token_hash=hash_token("valid-token"),
            ),
        ),
        (
            "receipt",
            SimpleNamespace(
                id="rcp_123",
                workspace_id="ws_123",
                is_verified=True,
                share_token=None,
                share_token_hash=hash_token("valid-token"),
            ),
        ),
    ],
)
async def test_public_document_pdf_resolves_token_and_delivers_artifact(
    monkeypatch,
    document_type,
    document,
):
    db = FakeDB(document)
    expected_response = Response(
        content=b"%PDF-1.7 test",
        media_type="application/pdf",
    )

    deliver = AsyncMock(return_value=expected_response)
    monkeypatch.setattr(
        delivery,
        "deliver_issued_document",
        deliver,
    )

    response = await delivery.deliver_public_document(
        db,
        token="valid-token",
        document_type=document_type,
    )

    assert response is expected_response

    deliver.assert_awaited_once_with(
        db,
        workspace_id="ws_123",
        document_type=document_type,
        source_id=document.id,
    )


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_unknown_document_type():
    db = FakeDB(None)

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="valid-token",
            document_type="unknown",
        )

    assert exc.value.status_code == 404
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_invalid_token():
    db = FakeDB(None)

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="invalid-token",
            document_type="invoice",
        )

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_draft_invoice(monkeypatch):
    document = SimpleNamespace(
        id="inv_123",
        workspace_id="ws_123",
        status="draft",
        share_token=None,
        share_token_hash=hash_token("valid-token"),
    )
    db = FakeDB(document)

    deliver = AsyncMock()
    monkeypatch.setattr(
        delivery,
        "deliver_issued_document",
        deliver,
    )

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="valid-token",
            document_type="invoice",
        )

    assert exc.value.status_code == 404
    deliver.assert_not_awaited()


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_draft_quote(monkeypatch):
    document = SimpleNamespace(
        id="qot_123",
        workspace_id="ws_123",
        status="draft",
        share_token=None,
        share_token_hash=hash_token("valid-token"),
    )
    db = FakeDB(document)

    deliver = AsyncMock()
    monkeypatch.setattr(
        delivery,
        "deliver_issued_document",
        deliver,
    )

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="valid-token",
            document_type="quote",
        )

    assert exc.value.status_code == 404
    deliver.assert_not_awaited()


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_unverified_receipt(monkeypatch):
    document = SimpleNamespace(
        id="rcp_123",
        workspace_id="ws_123",
        is_verified=False,
        share_token=None,
        share_token_hash=hash_token("valid-token"),
    )
    db = FakeDB(document)

    deliver = AsyncMock()
    monkeypatch.setattr(
        delivery,
        "deliver_issued_document",
        deliver,
    )

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="valid-token",
            document_type="receipt",
        )

    assert exc.value.status_code == 404
    deliver.assert_not_awaited()


@pytest.mark.asyncio
async def test_public_document_pdf_rejects_missing_document_identity(
    monkeypatch,
):
    document = SimpleNamespace(
        id=None,
        workspace_id="ws_123",
        status="issued",
        share_token=None,
        share_token_hash=hash_token("valid-token"),
    )
    db = FakeDB(document)

    deliver = AsyncMock()
    monkeypatch.setattr(
        delivery,
        "deliver_issued_document",
        deliver,
    )

    with pytest.raises(HTTPException) as exc:
        await delivery.deliver_public_document(
            db,
            token="valid-token",
            document_type="invoice",
        )

    assert exc.value.status_code == 503
    deliver.assert_not_awaited()
