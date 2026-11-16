"""create document artifacts

Revision ID: dd8c6ec31269
Revises: d9f4c2a7b681
Create Date: 2026-11-16 17:19:03.013479
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "dd8c6ec31269"
down_revision: Union[str, Sequence[str], None] = "d9f4c2a7b681"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_artifacts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("source_version", sa.Integer(), nullable=False),
        sa.Column("issuance_generation", sa.Integer(), nullable=False),
        sa.Column("artifact_kind", sa.String(length=20), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("renderer", sa.String(length=50), nullable=False),
        sa.Column("renderer_version", sa.String(length=50), nullable=False),
        sa.Column("template_version", sa.String(length=50), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "artifact_kind IN ('preview', 'issued')",
            name="ck_document_artifacts_artifact_kind",
        ),
        sa.CheckConstraint(
            "document_type IN ('invoice', 'quote', 'receipt')",
            name="ck_document_artifacts_document_type",
        ),
        sa.CheckConstraint(
            "file_size_bytes >= 0",
            name="ck_document_artifacts_file_size_nonnegative",
        ),
        sa.CheckConstraint(
            "issuance_generation >= 1",
            name="ck_document_artifacts_generation_positive",
        ),
        sa.CheckConstraint(
            "source_version >= 1",
            name="ck_document_artifacts_source_version_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
        sa.UniqueConstraint(
            "workspace_id",
            "document_type",
            "source_id",
            "source_version",
            "issuance_generation",
            "artifact_kind",
            name="uq_document_artifact_identity",
        ),
    )

    op.create_index(
        "ix_document_artifacts_source",
        "document_artifacts",
        ["document_type", "source_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_artifacts_workspace_created",
        "document_artifacts",
        ["workspace_id", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_artifacts_workspace_id"),
        "document_artifacts",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_document_artifacts_workspace_id"),
        table_name="document_artifacts",
    )
    op.drop_index(
        "ix_document_artifacts_workspace_created",
        table_name="document_artifacts",
    )
    op.drop_index(
        "ix_document_artifacts_source",
        table_name="document_artifacts",
    )
    op.drop_table("document_artifacts")
