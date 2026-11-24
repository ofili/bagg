"""HTTP adapters for public invoice sharing."""
from typing import List

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.public_access import enforce_public_access
from app.domains.compliance.schemas import (
    AbuseReportCreate,
    AbuseReportResponse,
)
from app.domains.payments.schemas import (
    PaymentClaimCreate,
    PaymentClaimResponse,
)
from app.domains.sharing.schemas import (
    CommentCreate,
    CommentResponse,
    DirectCheckoutRequest,
    DirectCheckoutResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
    PublicInvoiceView,
)
from app.domains.sharing.service import SharingService

router = APIRouter(prefix="/share", tags=["Sharing"])


@router.get(
    "/{token}",
    response_model=PublicInvoiceView,
)
async def get_public_invoice(
    token: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-portal",
        ip_limit=60,
        token_limit=60,
        window_seconds=60,
    )

    return await SharingService(db).get_public_invoice(token)


@router.post(
    "/{token}/claim",
    response_model=PaymentClaimResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_payment_claim(
    token: str,
    payload: PaymentClaimCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-claim",
        ip_limit=5,
        token_limit=5,
        window_seconds=3600,
    )

    return await SharingService(db).submit_payment_claim(
        token,
        payload,
    )


@router.post(
    "/{token}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_comment(
    token: str,
    payload: CommentCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-comment-create",
        ip_limit=20,
        token_limit=10,
        window_seconds=3600,
    )

    return await SharingService(db).post_comment(
        token,
        payload,
    )


@router.get(
    "/{token}/comments",
    response_model=List[CommentResponse],
)
async def list_comments(
    token: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-comments-list",
        ip_limit=60,
        token_limit=60,
        window_seconds=60,
    )

    return await SharingService(db).list_comments(token)


@router.post(
    "/{token}/checkout",
    response_model=DirectCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initiate_direct_checkout(
    token: str,
    payload: DirectCheckoutRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-checkout",
        ip_limit=5,
        token_limit=3,
        window_seconds=3600,
    )

    from app.domains.payments.checkout_service import (
        initiate_invoice_checkout,
    )

    result = await initiate_invoice_checkout(
        db,
        token,
        amount_minor=payload.amount_minor,
        callback_url=None,
        payer_email=payload.payer_email,
    )

    return DirectCheckoutResponse(**result)


@router.post(
    "/{token}/verify-payment",
    response_model=PaymentVerificationResponse,
)
async def verify_direct_payment(
    token: str,
    payload: PaymentVerificationRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-payment-verification",
        ip_limit=10,
        token_limit=5,
        window_seconds=3600,
    )

    from app.domains.payments.checkout_service import (
        verify_invoice_checkout,
    )

    result = await verify_invoice_checkout(
        db,
        token,
        payload.reference,
    )

    return PaymentVerificationResponse(**result)


@router.post(
    "/{token}/report-abuse",
    response_model=AbuseReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def report_abuse(
    token: str,
    payload: AbuseReportCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="shared-invoice-abuse-report",
        ip_limit=5,
        token_limit=3,
        window_seconds=3600,
    )

    return await SharingService(db).report_abuse(token, payload)
