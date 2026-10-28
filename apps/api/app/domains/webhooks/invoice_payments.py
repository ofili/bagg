import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.domains.billing.models import WebhookEvent
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.receipts.service import confirm_payment
from app.domains.webhooks.security import verify_paystack_signature
from app.domains.workspaces.models import Workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _webhook_secret() -> Optional[str]:
    return settings.PAYSTACK_INVOICE_WEBHOOK_SECRET or settings.PAYSTACK_SECRET_KEY


@router.post("/paystack/invoice-payments", status_code=status.HTTP_200_OK)
async def paystack_invoice_payment_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirms client invoice payments received through Paystack.

    This endpoint is intentionally separate from the Bagg subscription webhook.
    Only a valid HMAC-signed charge.success event may move an invoice into
    partially_paid or paid.
    """
    raw_body = await request.body()
    verify_paystack_signature(
        raw_body=raw_body,
        signature=x_paystack_signature,
        secret=_webhook_secret(),
    )

    payload = await request.json()
    event_type = payload.get("event")
    data = payload.get("data") or {}
    metadata = data.get("metadata") or {}
    reference = data.get("reference")

    if not isinstance(reference, str) or not reference.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing Paystack transaction reference",
        )

    if event_type != "charge.success" or metadata.get("type") != "direct_invoice_payment":
        return {"status": "ignored"}

    invoice_id = metadata.get("invoice_id")
    workspace_id = metadata.get("workspace_id")
    if not invoice_id or not workspace_id:
        raise HTTPException(status_code=400, detail="Missing invoice metadata")

        idempotency_key = f"paystack:invoice-payment:{reference}"

    event_stmt = (
        select(WebhookEvent)
        .where(WebhookEvent.idempotency_key == idempotency_key)
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    event = (await db.execute(event_stmt)).scalar_one_or_none()

    if event and event.processed:
        return {"status": "already_processed"}

    if event is None:
        candidate = WebhookEvent(
            processor="paystack",
            event_type=event_type,
            idempotency_key=idempotency_key,
            payload=payload,
            processed=False,
        )
        db.add(candidate)

        try:
            # Persist the unique idempotency key first. We acquire its
            # row lock below before beginning financial processing.
            await db.commit()
        except IntegrityError:
            # A concurrent delivery may have inserted the same key.
            await db.rollback()

        # Both the successful-insert path and the unique-key-conflict
        # path must reacquire the same event row under a lock.
        event = (await db.execute(event_stmt)).scalar_one_or_none()

        if event is None:
            raise HTTPException(
                status_code=503,
                detail="Unable to establish webhook idempotency state",
            )

        if event.processed:
            return {"status": "already_processed"}

    try:
        invoice_stmt = select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
        )
        invoice = (await db.execute(invoice_stmt)).scalar_one_or_none()
        if not invoice:
            raise ValueError(f"Invoice '{invoice_id}' not found for webhook {reference}")

        workspace = (
            await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        ).scalar_one()

        if reference not in {
            invoice.direct_payment_reference,
            invoice.payment_processing_reference,
        }:
            raise ValueError(
                f"Reference '{reference}' does not match an open checkout for invoice '{invoice_id}'"
            )

        currency = data.get("currency")
        if not isinstance(currency, str) or currency != invoice.currency:
            raise ValueError(
                f"Webhook currency {currency!r} does not match "
                f"invoice currency {invoice.currency!r}"
            )

        amount_minor = int(data.get("amount") or 0)

        if amount_minor <= 0:
            raise ValueError(
                "Paystack transaction amount must be greater than zero"
            )

        existing_receipt = (
            await db.execute(
                select(Receipt).where(
                    and_(
                        Receipt.workspace_id == workspace_id,
                        Receipt.provider_reference == reference,
                    )
                )
            )
        ).scalars().first()

        if existing_receipt:
            if existing_receipt.invoice_id != invoice.id:
                raise ValueError(
                    "Paystack transaction reference is already linked "
                    "to another invoice"
                )

            if (
                existing_receipt.amount_paid_minor != amount_minor
                or existing_receipt.currency != invoice.currency
            ):
                raise ValueError(
                    "Paystack transaction does not match the existing receipt"
                )
        else:
            channel = (data.get("channel") or "card").lower()
            payment_method = (
                "mobile_money"
                if channel in {"mobile_money", "ussd"}
                else "card"
            )

            customer = data.get("customer") or {}
            payer_name = " ".join(
                part
                for part in [
                    customer.get("first_name"),
                    customer.get("last_name"),
                ]
                if part
            ) or customer.get("email")

            await confirm_payment(
                db=db,
                workspace=workspace,
                invoice=invoice,
                amount_paid_minor=amount_minor,
                payment_method=payment_method,
                reference=reference,
                payer_name=payer_name,
                payment_date=date.today(),
                confirmation_source="webhook_paystack",
                provider="paystack",
                provider_reference=reference,
            )

        event.processed = True
        event.error_message = None
        await db.commit()
        logger.info("Confirmed Paystack invoice payment %s for invoice %s", reference, invoice_id)
        return {"status": "success"}
    except Exception as exc:
        await db.rollback()
        event = (
            await db.execute(
                select(WebhookEvent).where(WebhookEvent.idempotency_key == idempotency_key)
            )
        ).scalar_one_or_none()
        if event:
            event.error_message = str(exc)
            await db.commit()
        logger.error("Failed to process invoice payment webhook %s: %s", reference, exc)
        raise HTTPException(status_code=400, detail=str(exc))
