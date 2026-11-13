"""Import every SQLAlchemy model so the mapper registry is complete.

SQLAlchemy resolves string-based relationship targets through the class
registry populated by imports. Every ORM entrypoint must import this
module before issuing queries.
"""

import app.domains.auth.models  # noqa: F401
import app.domains.billing.models  # noqa: F401
import app.domains.clients.models  # noqa: F401
import app.domains.compliance.models  # noqa: F401
import app.domains.invoices.models  # noqa: F401
import app.domains.invoices.recall_models  # noqa: F401
import app.domains.lifecycle.models  # noqa: F401
import app.domains.notifications.models  # noqa: F401
import app.domains.onboarding.models  # noqa: F401
import app.domains.payments.models  # noqa: F401
import app.domains.quotes.models  # noqa: F401
import app.domains.receipts.models  # noqa: F401
import app.domains.recurring_invoices.models  # noqa: F401
import app.domains.reminders.models  # noqa: F401
import app.domains.security.models  # noqa: F401
import app.domains.sharing.models  # noqa: F401
import app.domains.workspaces.models  # noqa: F401
import app.integrations.email_models  # noqa: F401