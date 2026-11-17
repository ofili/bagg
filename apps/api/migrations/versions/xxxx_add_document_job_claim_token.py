"""Add claim token to document generation jobs."""

from alembic import op
import sqlalchemy as sa

revision = "document_claim_token_001"
down_revision = "ea91b7c42d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_generation_jobs",
        sa.Column(
            "claim_token",
            sa.String(length=64),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "document_generation_jobs",
        "claim_token",
    )
