from html import escape

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email_outbox import enqueue_email


def enqueue_login_code(
    db: AsyncSession,
    *,
    challenge_id: str,
    recipient: str,
    code: str,
    expires_in_minutes: int = 10,
) -> None:
    """Queue an encrypted sign-in OTP for delivery."""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Your Bagg sign-in code</h2>
        <p>Use this code to sign in to your Bagg account:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px">
            {escape(code)}
        </p>
        <p>This code expires in {int(expires_in_minutes)} minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
    </div>
    """

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


def enqueue_security_step_up(
    db: AsyncSession,
    *,
    challenge_id: str,
    recipient: str,
    code: str,
    expires_in_minutes: int = 5,
) -> None:
    """Queue an encrypted OTP for a sensitive account operation."""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Confirm your Bagg security operation</h2>
        <p>
            Someone requested verification for a sensitive operation
            on your Bagg account.
        </p>
        <p>Enter this code to confirm that operation:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px">
            {escape(code)}
        </p>
        <p>This code expires in {int(expires_in_minutes)} minutes.</p>
        <p>
            If you did not initiate this operation, do not share this code.
            You can safely ignore this email.
        </p>
    </div>
    """

    enqueue_email(
        db,
        message_type="security_step_up",
        aggregate_id=challenge_id,
        payload={
            "to_email": recipient,
            "subject": "Your Bagg security verification code",
            "html": html,
        },
    )
