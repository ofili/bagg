"""merge deposit calculation mode migrations

Revision ID: 4af5d53e7186
Revises: 6e990d898807, e2982bec7ca0
Create Date: 2026-11-28 13:50:10.385787

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4af5d53e7186'
down_revision: Union[str, Sequence[str], None] = ('6e990d898807', 'e2982bec7ca0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
