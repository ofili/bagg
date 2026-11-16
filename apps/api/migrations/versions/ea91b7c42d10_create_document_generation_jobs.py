"""Create durable document generation jobs.

Revision ID: ea91b7c42d10
Revises: dd8c6ec31269
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "ea91b7c42d10"
down_revision: Union[str, Sequence[str], None] = "dd8c6ec31269"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_generation_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("source_version", sa.Integer(), nullable=False),
        sa.Column("issuance_generation", sa.Integer(), nullable=False),
        sa.Column(
            "artifact_kind",
            sa.String(length=20),
            nullable=False,
            server_default="issued",
        ),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(), nullable=True),
        sa.Column(
            "artifact_id",
            sa.String(),
            sa.ForeignKey(
                "document_artifacts.id",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        sa.Column("last_error_code", sa.String(length=100), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "document_type IN ('invoice', 'quote', 'receipt')",
            name="ck_document_generation_jobs_document_type",
        ),
        sa.CheckConstraint(
            "artifact_kind = 'issued'",
            name="ck_document_generation_jobs_artifact_kind",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'succeeded', 'failed')",
            name="ck_document_generation_jobs_status",
        ),
        sa.CheckConstraint(
            "source_version >= 1",
            name="ck_document_generation_jobs_source_version",
        ),
        sa.CheckConstraint(
            "issuance_generation >= 1",
            name="ck_document_generation_jobs_generation",
        ),
        sa.CheckConstraint(
            "attempts >= 0",
            name="ck_document_generation_jobs_attempts",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "document_type",
            "source_id",
            "source_version",
            "issuance_generation",
            "artifact_kind",
            name="uq_document_generation_job_identity",
        ),
    )

    op.create_index(
        "ix_document_generation_jobs_claim",
        "document_generation_jobs",
        ["status", "available_at", "created_at"],
    )

    op.create_index(
        "ix_document_generation_jobs_workspace_created",
        "document_generation_jobs",
        ["workspace_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_document_generation_jobs_workspace_created",
        table_name="document_generation_jobs",
    )
    op.drop_index(
        "ix_document_generation_jobs_claim",
        table_name="document_generation_jobs",
    )
    op.drop_table("document_generation_jobs")
