"""Create append-only business audit events.

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
"""

from alembic import op
import sqlalchemy as sa

revision = "f7a8b9c0d1e2"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workspace_id", sa.String(64), nullable=False),
        sa.Column("actor_type", sa.String(24), nullable=False),
        sa.Column("actor_id", sa.String(160), nullable=True),
        sa.Column("action", sa.String(120), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(160), nullable=False),
        sa.Column(
            "outcome",
            sa.String(30),
            nullable=False,
            server_default="success",
        ),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("correlation_id", sa.String(120), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_audit_events_workspace_occurred",
        "audit_events",
        ["workspace_id", "occurred_at"],
    )

    op.create_index(
        "ix_audit_events_workspace_entity",
        "audit_events",
        [
            "workspace_id",
            "entity_type",
            "entity_id",
            "occurred_at",
        ],
    )

    op.create_index(
        "ix_audit_events_workspace_action",
        "audit_events",
        ["workspace_id", "action", "occurred_at"],
    )

    op.create_index(
        "ix_audit_events_correlation",
        "audit_events",
        ["correlation_id"],
    )

    # Reject UPDATE and DELETE at the database boundary.
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit_events is append-only';
        END;
        $$ LANGUAGE plpgsql;
        """)

    op.execute("""
        CREATE TRIGGER audit_events_immutable
        BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_event_mutation();
        """)

    # Also prevent TRUNCATE through the normal application connection.
    op.execute("""
        CREATE TRIGGER audit_events_no_truncate
        BEFORE TRUNCATE ON audit_events
        FOR EACH STATEMENT
        EXECUTE FUNCTION prevent_audit_event_mutation();
        """)


def downgrade() -> None:
    op.execute("""
        DROP TRIGGER IF EXISTS audit_events_no_truncate
        ON audit_events;
        """)

    op.execute("""
        DROP TRIGGER IF EXISTS audit_events_immutable
        ON audit_events;
        """)

    op.execute("""
        DROP FUNCTION IF EXISTS prevent_audit_event_mutation();
        """)

    op.drop_index(
        "ix_audit_events_correlation",
        table_name="audit_events",
    )

    op.drop_index(
        "ix_audit_events_workspace_action",
        table_name="audit_events",
    )

    op.drop_index(
        "ix_audit_events_workspace_entity",
        table_name="audit_events",
    )

    op.drop_index(
        "ix_audit_events_workspace_occurred",
        table_name="audit_events",
    )

    op.drop_table("audit_events")
