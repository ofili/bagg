"""Add persisted administrative entitlement overrides.

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f8"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "entitlement_overrides",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("workspace_id", sa.String(64), nullable=False),
        sa.Column("entitlement_key", sa.String(120), nullable=False),
        sa.Column("override_value", sa.JSON(), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default="active",
        ),
        sa.Column("created_by_admin_id", sa.String(160), nullable=False),
        sa.Column(
            "effective_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "revoked_by_admin_id",
            sa.String(160),
            nullable=True,
        ),
        sa.Column(
            "revocation_reason",
            sa.String(1000),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'revoked', 'expired')",
            name="ck_entitlement_overrides_status",
        ),
        sa.CheckConstraint(
            "length(trim(reason)) > 0",
            name="ck_entitlement_overrides_reason",
        ),
        sa.CheckConstraint(
            "expires_at > effective_at",
            name="ck_entitlement_overrides_expiry",
        ),
        sa.CheckConstraint(
            "(status != 'revoked') OR "
            "(revoked_at IS NOT NULL AND revoked_by_admin_id IS NOT NULL)",
            name="ck_entitlement_overrides_revocation",
        ),
    )

    op.create_index(
        "ix_entitlement_overrides_workspace_status",
        "entitlement_overrides",
        ["workspace_id", "status"],
    )

    op.create_index(
        "ix_entitlement_overrides_workspace_key",
        "entitlement_overrides",
        ["workspace_id", "entitlement_key"],
    )

    op.create_index(
        "ix_entitlement_overrides_expiry",
        "entitlement_overrides",
        ["status", "expires_at"],
    )

    op.create_index(
        "uq_entitlement_overrides_active_key",
        "entitlement_overrides",
        ["workspace_id", "entitlement_key"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_entitlement_overrides_active_key",
        table_name="entitlement_overrides",
    )

    op.drop_index(
        "ix_entitlement_overrides_expiry",
        table_name="entitlement_overrides",
    )

    op.drop_index(
        "ix_entitlement_overrides_workspace_key",
        table_name="entitlement_overrides",
    )

    op.drop_index(
        "ix_entitlement_overrides_workspace_status",
        table_name="entitlement_overrides",
    )

    op.drop_table("entitlement_overrides")
