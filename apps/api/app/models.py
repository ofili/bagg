"""Import every SQLAlchemy model so the mapper registry is complete.

SQLAlchemy resolves string-based relationship targets (for example
``relationship("Workspace")``) through the class registry populated by imports.
Every ORM entrypoint (API process, email worker, Alembic, scripts, tests) must
import this module before issuing queries.
"""

import app.domains.auth.models
import app.domains.billing.models
import app.domains.clients.models
import app.domains.compliance.models
import app.domains.invoices.models
import app.domains.lifecycle.models
import app.domains.notifications.models
import app.domains.payments.models
import app.domains.quotes.models
import app.domains.receipts.models
import app.domains.reminders.models
import app.domains.security.models
import app.domains.sharing.models
import app.domains.workspaces.models
import app.integrations.email_models  # noqa: F401
