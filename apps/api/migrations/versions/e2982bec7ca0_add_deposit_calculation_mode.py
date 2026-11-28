"""Add deposit calculation mode to invoices, quotes and revisions.

Existing records are classified as legacy because their original
deposit configuration cannot be reliably inferred.

Revision ID: e2982bec7ca0
Revises: 7e23138c4c2e
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e2982bec7ca0"
down_revision: Union[str, Sequence[str], None] = "7e23138c4c2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEPOSIT_MODE_CHECKS = (
    ("invoices", "ck_invoices_deposit_mode"),
    ("quotes", "ck_quotes_deposit_mode"),
    ("invoice_revisions", "ck_invoice_revisions_deposit_mode"),
    ("quote_revisions", "ck_quote_revisions_deposit_mode"),
)


def upgrade() -> None:
    for table in ("invoices", "quotes", "invoice_revisions", "quote_revisions"):
        op.add_column(
            table,
            sa.Column(
                "deposit_mode",
                sa.String(length=16),
                nullable=False,
                server_default="legacy",
            ),
        )

    op.add_column(
        "invoice_revisions",
        sa.Column("deposit_percentage", sa.Float(), nullable=True),
    )

    for table, constraint_name in DEPOSIT_MODE_CHECKS:
        op.create_check_constraint(
            constraint_name,
            table,
            "deposit_mode IN ('none', 'percentage', 'fixed', 'legacy')",
        )


def downgrade() -> None:
    for table, constraint_name in reversed(DEPOSIT_MODE_CHECKS):
        op.drop_constraint(constraint_name, table, type_="check")

    op.drop_column("invoice_revisions", "deposit_percentage")

    for table in ("quote_revisions", "invoice_revisions", "quotes", "invoices"):
        op.drop_column(table, "deposit_mode")
