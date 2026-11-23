"""Separate invoice commercial revision from issuance generation.

Revision ID: 04a1b2c3d4e5
Revises: c9d8e7f6a5b4, dd8c6ec31269
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "04a1b2c3d4e5"

down_revision: Union[str, Sequence[str], None] = (
    "c9d8e7f6a5b4",
    "dd8c6ec31269",
)

branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable first so historical rows can be backfilled.
    op.add_column(
        "invoice_document_versions",
        sa.Column(
            "issuance_generation",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Existing snapshots were unique by commercial revision.
    # Give each historical snapshot a stable issuance generation,
    # ordered by its original issue timestamp.
    op.execute("""
        WITH ranked_versions AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY invoice_id
                    ORDER BY issued_at ASC, created_at ASC, id ASC
                ) AS generation
            FROM invoice_document_versions
        )
        UPDATE invoice_document_versions AS versions
        SET issuance_generation = ranked_versions.generation
        FROM ranked_versions
        WHERE versions.id = ranked_versions.id
        """)

    op.alter_column(
        "invoice_document_versions",
        "issuance_generation",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.drop_constraint(
        "uq_invoice_document_versions_revision",
        "invoice_document_versions",
        type_="unique",
    )

    op.create_unique_constraint(
        "uq_invoice_document_versions_generation",
        "invoice_document_versions",
        ["invoice_id", "issuance_generation"],
    )

    # Keep the invoice counter at least as high as its latest
    # historical snapshot generation.
    op.execute("""
        UPDATE invoices AS invoice
        SET issuance_generation = GREATEST(
            COALESCE(invoice.issuance_generation, 0),
            COALESCE(
                (
                    SELECT MAX(version.issuance_generation)
                    FROM invoice_document_versions AS version
                    WHERE version.invoice_id = invoice.id
                ),
                0
            )
        )
        WHERE EXISTS (
            SELECT 1
            FROM invoice_document_versions AS version
            WHERE version.invoice_id = invoice.id
        )
        """)


def downgrade() -> None:
    # A downgrade cannot safely reconstruct the original issuance
    # identity for invoices that were reissued without content changes.
    # Refuse to discard that history.
    raise RuntimeError(
        "This migration is not safely reversible after issuance "
        "generations have been recorded."
    )
