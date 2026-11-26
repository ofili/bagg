"""Guards against the model/migration drift that broke every workspace query.

A model column or table added without a matching Alembic migration only fails once
the app runs against a database built purely from migrations. This compares the
ORM metadata with the live (migrated) test database and fails if the models define
tables or columns the database does not have.
"""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

import app.models  # noqa: F401  (registers all models on Base.metadata)
import app.domains.invoices.recall_models  # noqa: F401
import app.domains.recurring_invoices.models  # noqa: F401
import app.domains.payments.models  # noqa: F401
import app.domains.security.email_change_models  # noqa: F401
from app.core.config import settings
from app.core.database import Base


def test_models_do_not_define_tables_or_columns_missing_from_migrations():
    engine = create_engine(settings.SYNC_DATABASE_URL)
    try:
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            diffs = compare_metadata(context, Base.metadata)
    finally:
        engine.dispose()

    missing = []
    for diff in diffs:
        op = diff[0]
        if op == "add_table":
            missing.append(f"table {diff[1].name}")
        elif op == "add_column":
            # ("add_column", schema, table_name, column)
            missing.append(f"column {diff[2]}.{diff[3].name}")

    assert not missing, (
        "Models define schema objects with no migration (run `alembic revision "
        f"--autogenerate`): {sorted(missing)}"
    )
