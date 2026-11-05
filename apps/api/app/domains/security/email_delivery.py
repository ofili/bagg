
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


async def enqueue_security_email(
    db: AsyncSession,
    *,
    recipient: str,
    template: str,
    payload: dict[str, Any],
) -> None:
    """
    Adapter contract for the Package 3 transactional email outbox.

    Replace this function body with the actual enqueue call from the
    existing outbox implementation.

    Required templates:
        security_email_change_current
        security_email_change_new

    Required payload:
        code
        expires_in_minutes

    Important:
        The implementation must add the outbox record using this same
        AsyncSession. It must not commit independently.

    Do not replace this with EmailSender or direct SMTP delivery.
    """
    raise NotImplementedError(
        "Connect enqueue_security_email to the existing Package 3 outbox."
    )
