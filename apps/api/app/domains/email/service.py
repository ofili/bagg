from html import escape
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email import (
    build_expense_approval_email_payload,
    build_scope_change_approval_email_payload,
)
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


def enqueue_expense_approval_link(
    db: AsyncSession,
    *,
    expense_id: str,
    recipient: str,
    business_name: str,
    client_name: Optional[str],
    description: str,
    formatted_amount: str,
    share_url: str,
    expires_at: str,
) -> None:
    """Queue the one-time client approval link for an expense."""

    enqueue_email(
        db,
        message_type="expense_approval_link",
        aggregate_id=expense_id,
        payload=build_expense_approval_email_payload(
            to_email=recipient,
            business_name=business_name,
            client_name=client_name,
            description=description,
            formatted_amount=formatted_amount,
            share_url=share_url,
            expires_at=expires_at,
        ),
    )


def enqueue_scope_change_approval_link(
    db: AsyncSession,
    *,
    change_request_id: str,
    recipient: str,
    business_name: str,
    client_name: Optional[str],
    title: str,
    formatted_delta: str,
    share_url: str,
    expires_at: str,
) -> None:
    """Queue the one-time client approval link for a scope change."""

    enqueue_email(
        db,
        message_type="scope_change_approval_link",
        aggregate_id=change_request_id,
        payload=build_scope_change_approval_email_payload(
            to_email=recipient,
            business_name=business_name,
            client_name=client_name,
            title=title,
            formatted_delta=formatted_delta,
            share_url=share_url,
            expires_at=expires_at,
        ),
    )
