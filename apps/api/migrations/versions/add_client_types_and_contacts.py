"""Add client types and contacts.

Existing clients are classified as PERSON to preserve current behaviour.
"""

from alembic import op
import sqlalchemy as sa

revision = "client_contacts_001"
down_revision = "bagg_refs_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column(
            "client_type",
            sa.String(length=16),
            nullable=False,
            server_default="PERSON",
        ),
    )

    op.create_index(
        "ix_clients_workspace_type",
        "clients",
        ["workspace_id", "client_type"],
        unique=False,
    )

    op.create_table(
        "contacts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("job_title", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column(
            "is_primary",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_contacts_workspace_id",
        "contacts",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        "ix_contacts_client_id",
        "contacts",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        "ix_contacts_workspace_client",
        "contacts",
        ["workspace_id", "client_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_contacts_workspace_client", table_name="contacts")
    op.drop_index("ix_contacts_client_id", table_name="contacts")
    op.drop_index("ix_contacts_workspace_id", table_name="contacts")
    op.drop_table("contacts")

    op.drop_index("ix_clients_workspace_type", table_name="clients")
    op.drop_column("clients", "client_type")
