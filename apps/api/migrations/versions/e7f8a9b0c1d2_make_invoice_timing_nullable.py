"""make invoice timing and numbering nullable until finalize

Revision ID: e7f8a9b0c1d2
Revises: d4e5f6a7b8c9
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("invoices", "invoice_number",
                    existing_type=sa.String(),
                    nullable=True)
    op.alter_column("invoices", "sequence_number",
                    existing_type=sa.Integer(),
                    nullable=True)
    op.alter_column("invoices", "issue_date",
                    existing_type=sa.Date(),
                    nullable=True)
    op.alter_column("invoices", "due_date",
                    existing_type=sa.Date(),
                    nullable=True)


def downgrade() -> None:
    op.alter_column("invoices", "due_date",
                    existing_type=sa.Date(),
                    nullable=False)
    op.alter_column("invoices", "issue_date",
                    existing_type=sa.Date(),
                    nullable=False)
    op.alter_column("invoices", "sequence_number",
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column("invoices", "invoice_number",
                    existing_type=sa.String(),
                    nullable=False)
