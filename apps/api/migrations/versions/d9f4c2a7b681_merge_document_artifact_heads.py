"""Merge billing and activation migration heads.

Revision ID: d9f4c2a7b681
Revises: 90e4429f07cf, activation_events_001
"""

from typing import Sequence, Union

revision: str = "d9f4c2a7b681"

down_revision: Union[str, Sequence[str], None] = (
    "90e4429f07cf",
    "activation_events_001",
)

branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
