from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.domains.webhooks.security import verify_paystack_signature
from app.domains.webhooks.invoice_payment_service import process_invoice_payment_event

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _webhook_secret() -> Optional[str]:
    return settings.PAYSTACK_INVOICE_WEBHOOK_SECRET or settings.PAYSTACK_SECRET_KEY


@router.post("/paystack/invoice-payments", status_code=status.HTTP_200_OK)
async def paystack_invoice_payment_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    raw = await request.body()
    verify_paystack_signature(
        raw_body=raw, signature=x_paystack_signature, secret=_webhook_secret()
    )
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON.")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")
    try:
        return await process_invoice_payment_event(db, payload)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invoice payment could not be reconciled. The event has been retained for retry.",
        )
