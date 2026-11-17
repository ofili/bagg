from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.domains.auth.dependencies import get_current_user_and_workspace
from app.domains.documents import router as documents_router_module
from app.main import app

PDF_BYTES = b"%PDF-1.7 test document bytes"

WORKSPACE_ID = "ws_document_api_test"
OTHER_WORKSPACE_ID = "ws_document_api_other"
SOURCE_ID = "inv_document_api_test"
JOB_ID = "docjob_document_api_test"
ARTIFACT_ID = "doc_document_api_test"


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDatabase:
    def __init__(self):
        self.execute = AsyncMock()


class FakeArtifactService:
    result = None

    def __init__(self, db):
        self.db = db

    async def get_pdf(self, *, artifact_id, workspace_id):
        assert artifact_id == ARTIFACT_ID
        assert workspace_id == WORKSPACE_ID
        return self.result


def make_job(
    *,
    workspace_id=WORKSPACE_ID,
    status="pending",
    artifact_id=None,
):
    now = datetime.now(timezone.utc)

    return SimpleNamespace(
        id=JOB_ID,
        workspace_id=workspace_id,
        document_type="invoice",
        source_id=SOURCE_ID,
        source_version=1,
        issuance_generation=1,
        artifact_kind="issued",
        status=status,
        attempts=0,
        artifact_id=artifact_id,
        last_error_code=None,
        available_at=now,
        created_at=now,
        updated_at=now,
        completed_at=now if status == "succeeded" else None,
    )


def make_artifact():
    return SimpleNamespace(
        id=ARTIFACT_ID,
        workspace_id=WORKSPACE_ID,
        document_type="invoice",
        source_id=SOURCE_ID,
        source_version=1,
        issuance_generation=1,
        artifact_kind="issued",
        mime_type="application/pdf",
    )


@pytest.fixture
def db():
    return FakeDatabase()


@pytest.fixture
def authenticated_client(db):
    async def override_db():
        yield db

    async def override_auth():
        return (
            SimpleNamespace(id="user_document_api_test"),
            SimpleNamespace(id=WORKSPACE_ID),
        )

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_and_workspace] = override_auth

    transport = ASGITransport(app=app)

    async def create_client():
        return AsyncClient(
            transport=transport,
            base_url="http://test",
        )

    yield create_client

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(
        get_current_user_and_workspace,
        None,
    )


@pytest.mark.asyncio
async def test_document_status_requires_authentication(db):
    async def override_db():
        yield db

    async def override_auth():
        return None

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_and_workspace] = override_auth

    try:
        transport = ASGITransport(app=app)

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get(f"/documents/invoice/{SOURCE_ID}/status")

        assert response.status_code == 401
        db.execute.assert_not_awaited()

    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(
            get_current_user_and_workspace,
            None,
        )


@pytest.mark.asyncio
async def test_document_status_returns_latest_workspace_job(
    authenticated_client,
    db,
):
    job = make_job(status="succeeded", artifact_id=ARTIFACT_ID)
    db.execute.return_value = FakeResult(job)

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/status")

    assert response.status_code == 200

    body = response.json()

    assert body["job_id"] == JOB_ID
    assert body["document_type"] == "invoice"
    assert body["source_id"] == SOURCE_ID
    assert body["status"] == "succeeded"
    assert body["artifact_id"] == ARTIFACT_ID
    assert body["pdf_url"] == (f"/documents/invoice/{SOURCE_ID}/pdf")


@pytest.mark.asyncio
async def test_document_status_returns_404_for_other_workspace(
    authenticated_client,
    db,
):
    # The workspace-scoped query must not return another workspace's job.
    db.execute.return_value = FakeResult(None)

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/status")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_document_job_status_returns_job(
    authenticated_client,
    db,
):
    job = make_job(status="processing")
    db.execute.return_value = FakeResult(job)

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/jobs/{JOB_ID}")

    assert response.status_code == 200

    body = response.json()

    assert body["job_id"] == JOB_ID
    assert body["status"] == "processing"
    assert body["artifact_id"] is None
    assert body["pdf_url"] is None


@pytest.mark.asyncio
async def test_document_job_status_does_not_expose_other_workspace_job(
    authenticated_client,
    db,
):
    db.execute.return_value = FakeResult(None)

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/jobs/{JOB_ID}")

    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "job_status",
    ["pending", "processing", "failed"],
)
async def test_pdf_is_unavailable_until_generation_succeeds(
    authenticated_client,
    db,
    job_status,
):
    db.execute.return_value = FakeResult(make_job(status=job_status))

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/pdf")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "document_not_ready"


@pytest.mark.asyncio
async def test_successful_document_job_returns_verified_pdf(
    authenticated_client,
    db,
    monkeypatch,
):
    job = make_job(
        status="succeeded",
        artifact_id=ARTIFACT_ID,
    )
    artifact = make_artifact()

    db.execute.return_value = FakeResult(job)

    FakeArtifactService.result = (artifact, PDF_BYTES)

    monkeypatch.setattr(
        documents_router_module,
        "DocumentArtifactService",
        FakeArtifactService,
    )

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/pdf")

    assert response.status_code == 200
    assert response.content == PDF_BYTES
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-length"] == str(len(PDF_BYTES))
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "private, no-store"
    assert "inline" in response.headers["content-disposition"]


@pytest.mark.asyncio
async def test_successful_job_without_artifact_returns_service_unavailable(
    authenticated_client,
    db,
):
    db.execute.return_value = FakeResult(
        make_job(
            status="succeeded",
            artifact_id=None,
        )
    )

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/pdf")

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_missing_artifact_returns_service_unavailable(
    authenticated_client,
    db,
    monkeypatch,
):
    db.execute.return_value = FakeResult(
        make_job(
            status="succeeded",
            artifact_id=ARTIFACT_ID,
        )
    )

    FakeArtifactService.result = None

    monkeypatch.setattr(
        documents_router_module,
        "DocumentArtifactService",
        FakeArtifactService,
    )

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/pdf")

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_pdf_rejects_artifact_with_mismatched_identity(
    authenticated_client,
    db,
    monkeypatch,
):
    job = make_job(
        status="succeeded",
        artifact_id=ARTIFACT_ID,
    )

    # Deliberately return an artifact for another source.
    artifact = make_artifact()
    artifact.source_id = "inv_another_document"

    db.execute.return_value = FakeResult(job)
    FakeArtifactService.result = (artifact, PDF_BYTES)

    monkeypatch.setattr(
        documents_router_module,
        "DocumentArtifactService",
        FakeArtifactService,
    )

    async with await authenticated_client() as client:
        response = await client.get(f"/documents/invoice/{SOURCE_ID}/pdf")

    assert response.status_code == 503
