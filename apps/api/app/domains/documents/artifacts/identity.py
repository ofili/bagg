from dataclasses import dataclass


@dataclass(frozen=True)
class ArtifactIdentity:
    workspace_id: str
    document_type: str
    source_id: str
    source_version: int
    issuance_generation: int
    artifact_kind: str = "issued"

    def __post_init__(self):
        if self.document_type not in {"invoice", "quote", "receipt"}:
            raise ValueError("Unsupported document type")

        if self.artifact_kind not in {"preview", "issued"}:
            raise ValueError("Unsupported artifact kind")

        if self.source_version < 1:
            raise ValueError("source_version must be positive")

        if self.issuance_generation < 1:
            raise ValueError("issuance_generation must be positive")

    def storage_key(self) -> str:
        return (
            f"workspaces/{self.workspace_id}/documents/"
            f"{self.document_type}/{self.source_id}/"
            f"v{self.source_version}/"
            f"g{self.issuance_generation}.pdf"
        )
