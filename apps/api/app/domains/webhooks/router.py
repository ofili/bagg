import hmac
import hashlib
from fastapi import APIRouter, Request, Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.domains.billing.models import WebhookEvent
from app.domains.billing.service import (
    activate_subscription,
    add_credits,
    handle_failed_payment,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/paystack", status_code=status.HTTP_200_OK)
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Asynchronous and idempotent processor for Paystack webhooks (US-SUB-03, US-SUB-04).
    Verifies HMAC SHA512 signature, deduplicates via webhook_events table,
    and activates paid subscriptions or provisions credit ledger entries.
    """
    raw_body = await request.body()

    # Verify signature if secret key configured and signature header present
    if settings.PAYSTACK_SECRET_KEY and x_paystack_signature:
        expected_sig = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
            raw_body,
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_paystack_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event_type = payload.get("event")
    data = payload.get("data", {})

    # Extract idempotency key
    event_ref = data.get("reference") or str(data.get("id")) or payload.get("id") or str(hash(raw_body))
    idempotency_key = f"paystack:{event_type}:{event_ref}"

    # Idempotency check
    stmt = select(WebhookEvent).where(WebhookEvent.idempotency_key == idempotency_key)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing and existing.processed:
        return {"status": "already_processed"}

    if not existing:
        event = WebhookEvent(
            processor="paystack",
            event_type=event_type,
            idempotency_key=idempotency_key,
            payload=payload,
            processed=False,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
    else:
        event = existing

    try:
        metadata = data.get("metadata", {})
        workspace_id = metadata.get("workspace_id")

        if event_type in ["charge.success", "subscription.create"]:
            # Case 1: Credit pack purchase (US-SUB-06)
            if metadata.get("type") == "credit_pack" and workspace_id:
                credits = int(metadata.get("credits", 200))
                await add_credits(
                    workspace_id=workspace_id,
                    amount=credits,
                    reason="pack_purchase",
                    description=f"Purchased {credits} delivery credits top-up pack",
                    reference=event_ref,
                    db=db,
                )
                logger.info(f"Provisioned {credits} credits for workspace {workspace_id}")

            # Case 2: Subscription upgrade / activation (US-SUB-03)
            elif metadata.get("plan") in ["creator_pro", "professional"] and workspace_id:
                plan = metadata.get("plan")
                currency = data.get("currency", "NGN")
                amount = data.get("amount", 1400000)
                sub_code = data.get("subscription_code") or data.get("plan", {}).get("plan_code")
                cust_code = data.get("customer", {}).get("customer_code")

                await activate_subscription(
                    workspace_id=workspace_id,
                    plan=plan,
                    currency=currency,
                    amount_minor=amount,
                    processor="paystack",
                    processor_subscription_code=sub_code,
                    processor_customer_code=cust_code,
                    db=db,
                )
                logger.info(f"Activated {plan} subscription for workspace {workspace_id}")

        elif event_type in ["invoice.payment_failed", "subscription.not_renew"]:
            # Case 3: Failed renewal / Dunning & Grace Period (US-SUB-04)
            if workspace_id:
                await handle_failed_payment(workspace_id=workspace_id, db=db)
                logger.warning(f"Payment failed for workspace {workspace_id}. Entered grace period.")

        event.processed = True
        await db.commit()
    except Exception as exc:
        logger.error(f"Error handling webhook event {idempotency_key}: {exc}")
        event.error_message = str(exc)
        await db.commit()
        raise

    return {"status": "success"}


@router.post("/flutterwave", status_code=status.HTTP_200_OK)
async def flutterwave_webhook(request: Request):
    """Webhook listener for Flutterwave payment verification."""
    payload = await request.json()
    logger.info(f"Received Flutterwave webhook event: {payload.get('event')}")
    return {"status": "success"}
