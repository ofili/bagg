from fastapi import APIRouter, Request, status
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/paystack", status_code=status.HTTP_200_OK)
async def paystack_webhook(request: Request):
    """Webhook listener for Paystack payment verification."""
    payload = await request.json()
    logger.info(f"Received Paystack webhook event: {payload.get('event')}")
    return {"status": "success"}

@router.post("/flutterwave", status_code=status.HTTP_200_OK)
async def flutterwave_webhook(request: Request):
    """Webhook listener for Flutterwave payment verification."""
    payload = await request.json()
    logger.info(f"Received Flutterwave webhook event: {payload.get('event')}")
    return {"status": "success"}
