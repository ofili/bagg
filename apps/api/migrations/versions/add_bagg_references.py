"""Add immutable Bagg references to invoices, quotes, receipts and clients."""

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "bagg_refs_001"
down_revision: Union[str, Sequence[str], None] = (
    "f1a2b3c4d5e6",
    "ws_onboarding_001",
)
branch_labels = None
depends_on = None


def _reference(prefix: str, internal_id: str) -> str:
    """Use the existing random ID as the migration backfill source.

    Using the complete existing ID suffix avoids shortening it to a small,
    collision-prone fragment during migration.
    """
    suffix = internal_id.split("_", 1)[-1].upper()
    return f"{prefix}-{suffix}"


def upgrade() -> None:
    tables = (
        ("invoices", "BG-INV"),
        ("quotes", "BG-QOT"),
        ("receipts", "BG-RCP"),
        ("clients", "BG-CLI"),
    )

    for table, _prefix in tables:
        op.add_column(
            table,
            sa.Column("bagg_reference", sa.String(48), nullable=True),
        )

    connection = op.get_bind()

    for table, prefix in tables:
        rows = connection.execute(sa.text(f"SELECT id FROM {table}")).fetchall()

        for row in rows:
            connection.execute(
                sa.text(
                    f"UPDATE {table} " "SET bagg_reference = :reference WHERE id = :id"
                ),
                {
                    "reference": _reference(prefix, row.id),
                    "id": row.id,
                },
            )

        # Fail the migration instead of silently leaving incomplete records.
        null_count = connection.execute(
            sa.text(f"SELECT COUNT(*) FROM {table} " "WHERE bagg_reference IS NULL")
        ).scalar_one()

        if null_count:
            raise RuntimeError(
                f"{table}: {null_count} rows were not assigned a Bagg reference"
            )

        op.alter_column(
            table,
            "bagg_reference",
            existing_type=sa.String(48),
            nullable=False,
        )
        op.create_unique_constraint(
            f"uq_{table}_bagg_reference",
            table,
            ["bagg_reference"],
        )


def downgrade() -> None:
    for table, _prefix in (
        ("clients", "BG-CLI"),
        ("receipts", "BG-RCP"),
        ("quotes", "BG-QOT"),
        ("invoices", "BG-INV"),
    ):
        op.drop_constraint(
            f"uq_{table}_bagg_reference",
            table,
            type_="unique",
        )
        op.drop_column(table, "bagg_reference")
