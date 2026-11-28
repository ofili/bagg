"""No-op: deposit calculation mode is implemented by e2982bec7ca0.

This revision is retained to preserve migration history.
The comprehensive migration e2982bec7ca0 already adds deposit_mode
to invoices, quotes and revisions, plus the associated constraints.

Revision ID: 6e990d898807
Revises: 7e23138c4c2e
"""

from typing import Sequence, Union

revision: str = "6e990d898807"
down_revision: Union[str, Sequence[str], None] = "7e23138c4c2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
