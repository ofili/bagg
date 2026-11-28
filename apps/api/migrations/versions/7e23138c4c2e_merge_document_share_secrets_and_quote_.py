"""merge document share secrets and quote acceptance evidence

Revision ID: 7e23138c4c2e
Revises: 4f8c2a1d9e70, f6a7b8c9d0e1
Create Date: 2026-11-28 13:06:19.716945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e23138c4c2e'
down_revision: Union[str, Sequence[str], None] = ('4f8c2a1d9e70', 'f6a7b8c9d0e1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
