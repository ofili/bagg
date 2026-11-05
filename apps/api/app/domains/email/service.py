from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email import EmailSender
from app.integrations.email_outbox import enqueue_email


def enqueue_login_code(
    db: AsyncSession,
    *,
    challenge_id: str,
    recipient: str,
    code: str,
    expires_in_minutes: int = 10,
) -> None:
    """Queues a one-time sign-in code for encrypted outbox delivery.

    The caller owns the transaction, so the challenge row and the outbox
    message commit or roll back together.
    """
    html = EmailSender().build_login_code_email(
        code=code,
        expires_in_minutes=expires_in_minutes,
    )

    enqueue_email(
        db,
        message_type="login_otp",
        aggregate_id=challenge_id,
        payload={
            "to_email": recipient,
            "subject": "Your Bagg sign-in code",
            "html": html,
        },
    )
