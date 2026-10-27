from datetime import date
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.domains.auth.models import User
from app.domains.invoices.presenter import map_invoice_to_response
from app.domains.invoices.schemas import InvoiceResponse
from app.domains.quotes import service
from app.domains.quotes.presenter import (
    map_public_quote_view,
    map_quote_send_response,
    map_quote_to_response,
)
from app.domains.quotes.schemas import (
    PublicQuoteView,
    QuoteAcceptRequest,
    QuoteCommentCreate,
    QuoteCommentResponse,
    QuoteCreate,
    QuoteDeclineRequest,
    QuoteResponse,
    QuoteReviewRequest,
    QuoteReviseRequest,
    QuoteSendRequest,
    QuoteSendResponse,
    QuoteUpdate,
)
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.integrations.email import EmailSender

router = APIRouter(prefix="/quotes", tags=["Quotes"])


def _map(quote_obj, workspace: Workspace) -> QuoteResponse:
    return map_quote_to_response(
        quote_obj,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )


@router.get("", response_model=List[QuoteResponse])
async def list_quotes(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by status (draft, sent, viewed, accepted, declined, expired, converted)",
    ),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quotes = await service.list_quotes(
        db,
        workspace,
        client_id=client_id,
        status_filter=status_filter,
        currency=currency,
    )
    return [_map(q, workspace) for q in quotes]


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    payload: QuoteCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quote_obj = await service.create_quote(db, workspace, payload)
    return _map(quote_obj, workspace)


@router.get("/{id}", response_model=QuoteResponse)
async def get_quote(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quote_obj = await service.get_quote(db, workspace, id)
    return _map(quote_obj, workspace)


@router.post("/{id}/finalize", response_model=QuoteResponse)
async def finalize_quote(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quote_obj = await service.finalize_quote(db, workspace, id)
    return _map(quote_obj, workspace)


@router.post("/{id}/revise", response_model=QuoteResponse)
async def revise_quote(
    id: str,
    payload: QuoteReviseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quote_obj = await service.revise_quote(db, workspace, id, payload)
    return _map(quote_obj, workspace)


@router.patch("/{id}", response_model=QuoteResponse)
async def update_quote(
    id: str,
    payload: QuoteUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    quote_obj = await service.update_quote(db, workspace, id, payload)
    return _map(quote_obj, workspace)


@router.post("/{id}/send", response_model=QuoteSendResponse)
async def send_quote(
    id: str,
    payload: Optional[QuoteSendRequest] = None,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    send_email = payload.send_email if payload else False
    outcome = await service.send_quote(
        db, workspace, id, send_email=send_email
    )
    quote_obj = outcome.quote

    if outcome.email_sent:
        message = f"Quote {quote_obj.quote_number} emailed successfully."
    elif send_email and not outcome.recipient_email:
        message = "Quote marked sent. Add a client email or share the link directly."
    elif send_email:
        message = "Quote marked sent, but email delivery failed. Share the link instead."
    else:
        message = f"Quote {quote_obj.quote_number} is ready to share."

    return map_quote_send_response(
        quote_obj,
        workspace,
        outcome.share_url,
        email_sent=outcome.email_sent,
        recipient_email=outcome.recipient_email,
        message=message,
    )


@router.get("/{id}/comments", response_model=List[QuoteCommentResponse])
async def list_quote_comments(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    comments = await service.list_quote_comments(db, workspace, id)
    return [QuoteCommentResponse.model_validate(comment) for comment in comments]


@router.post("/{id}/convert", response_model=InvoiceResponse)
async def convert_quote_to_invoice(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice, client = await service.convert_quote_to_invoice(db, workspace, id)
    return map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )


# --- Public Client Quote Portal Endpoints (US-QOT-02) ---


@router.get("/share/{token}", response_model=PublicQuoteView)
async def get_public_quote(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    quote_obj, client_name, workspace = await service.view_public_quote(db, token)
    return map_public_quote_view(quote_obj, client_name, workspace)


@router.post("/share/{token}/accept", response_model=PublicQuoteView)
async def accept_public_quote(
    token: str,
    payload: QuoteAcceptRequest,
    db: AsyncSession = Depends(get_db),
):
    quote_obj, client_name, workspace = await service.accept_public_quote(
        db, token, payload
    )
    return map_public_quote_view(
        quote_obj,
        client_name,
        workspace,
        status=quote_obj.status,
        is_expired=False,
        effective_status=quote_obj.status,
    )


@router.post("/share/{token}/decline", response_model=PublicQuoteView)
async def decline_public_quote(
    token: str,
    payload: QuoteDeclineRequest,
    db: AsyncSession = Depends(get_db),
):
    quote_obj, client_name, workspace = await service.decline_public_quote(
        db, token, payload
    )
    return map_public_quote_view(
        quote_obj,
        client_name,
        workspace,
        status=quote_obj.status,
        is_expired=quote_obj.expires_at < date.today(),
        effective_status=quote_obj.status,
    )

@router.post("/share/{token}/request-review", response_model=PublicQuoteView)
async def request_public_quote_review(
    token: str,
    payload: QuoteReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    quote_obj, client_name, workspace = await service.request_quote_review(
        db, token, payload
    )
    return map_public_quote_view(
        quote_obj,
        client_name,
        workspace,
        status=quote_obj.status,
        is_expired=False,
        effective_status=quote_obj.status,
    )


@router.get("/share/{token}/comments", response_model=List[QuoteCommentResponse])
async def list_public_quote_comments(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    quote_obj, _, _ = await service.view_public_quote(db, token)
    return [
        QuoteCommentResponse.model_validate(comment)
        for comment in (quote_obj.comments or [])
    ]


@router.post(
    "/share/{token}/comments",
    response_model=QuoteCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_public_quote_comment(
    token: str,
    payload: QuoteCommentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    comment, quote_obj, workspace, item_description = (
        await service.post_public_quote_comment(db, token, payload)
    )

    owner_email = (
        await db.execute(select(User.email).where(User.id == workspace.owner_id))
    ).scalar_one_or_none()
    if owner_email:
        background_tasks.add_task(
            EmailSender().send_issuer_question_email,
            owner_email,
            workspace.business_name,
            quote_obj.quote_number,
            comment.author_name,
            comment.message,
            f"{settings.WEB_BASE_URL}/q/{token}",
            item_description,
        )

    return QuoteCommentResponse.model_validate(comment)
