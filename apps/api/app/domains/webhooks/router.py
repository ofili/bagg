from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.domains.webhooks.billing_service import process_paystack_billing_event
from app.domains.webhooks.invoice_payment_service import process_invoice_payment_event
from app.domains.webhooks.security import (
    paystack_idempotency_key,
    verify_paystack_signature,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/paystack", status_code=status.HTTP_200_OK)
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Verify and dispatch Paystack events to the owning application domain."""
    raw_body = await request.body()
    webhook_secret = (
        settings.PAYSTACK_INVOICE_WEBHOOK_SECRET or settings.PAYSTACK_SECRET_KEY
    )
    verify_paystack_signature(raw_body, x_paystack_signature, webhook_secret)

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")

    event_type = payload.get("event")
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {} if isinstance(data, dict) else {}
    idempotency_key = paystack_idempotency_key(
        event_type=event_type,
        data=data,
        payload=payload,
        raw_body=raw_body,
    )

    try:
        if (
            event_type == "charge.success"
            and metadata.get("type") == "direct_invoice_payment"
        ):
            return await process_invoice_payment_event(db, payload)

        return await process_paystack_billing_event(
            db,
            payload,
            idempotency_key,
        )
    except Exception as exc:
        logger.exception("Paystack webhook processing failed")
        raise HTTPException(
            status_code=400,
            detail="Payment event could not be processed. The event has been retained for retry.",
        ) from exc


@router.post(
    "/flutterwave",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
)
async def flutterwave_webhook():
    """Fail closed until Flutterwave signature and reconciliation are implemented."""
    raise HTTPException(
        status_code=501,
        detail="Flutterwave webhook processing is not configured. No payment has been accepted.",
    )
