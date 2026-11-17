from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

DocumentType = Literal["invoice", "quote", "receipt"]

DocumentGenerationStatus = Literal[
    "pending",
    "processing",
    "succeeded",
    "failed",
]


class DocumentGenerationStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    document_type: DocumentType
    source_id: str

    source_version: int
    issuance_generation: int
    artifact_kind: str

    status: DocumentGenerationStatus
    attempts: int

    artifact_id: str | None = None
    last_error_code: str | None = None

    available_at: datetime
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    pdf_url: str | None = None
