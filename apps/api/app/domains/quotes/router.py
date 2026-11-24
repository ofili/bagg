from datetime import date
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.public_access import enforce_public_access
from app.domains.auth.dependencies import require_auth
from app.core.config import settings
from app.core.database import get_db
from app.core.pagination import PaginatedResponse
from app.domains.documents.delivery import (
    deliver_issued_document,
    deliver_public_document,
)
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
    QuoteRevisionResponse,
    QuoteSendRequest,
    QuoteSendResponse,
    QuoteUpdate,
)
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.integrations.email import EmailSender

router = APIRouter(prefix="/quotes", tags=["Quotes"])


def _map(quote_obj, workspace: Workspace) -> QuoteResponse:
    return map_quote_to_response(
        quote_obj,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )


@router.get("", response_model=PaginatedResponse[QuoteResponse])
async def list_quotes(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(
        None, description="Search by quote number or client name"
    ),
    sort_by: str = Query("sequence_number", description="Column to sort by"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
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
    quotes, total = await service.list_quotes(
        db,
        workspace,
        client_id=client_id,
        status_filter=status_filter,
        currency=currency,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    items = [_map(q, workspace) for q in quotes]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


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


@router.get("/{id}/pdf")
async def get_quote_pdf(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Deliver the immutable issued quote PDF."""
    return await deliver_issued_document(
        db,
        workspace_id=workspace.id,
        document_type="quote",
        source_id=id,
    )


@router.get("/{id}/revisions", response_model=List[QuoteRevisionResponse])
async def list_quote_revisions(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_quote_revisions(db, workspace, id)


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
    outcome = await service.send_quote(db, workspace, id, send_email=send_email)
    quote_obj = outcome.quote

    if outcome.email_sent:
        message = f"Quote {quote_obj.quote_number} emailed successfully."
    elif outcome.email_queued:
        message = f"Quote {quote_obj.quote_number} has been queued for email delivery."
    elif send_email and not outcome.recipient_email:
        message = (
            "Quote status updated, but no email was sent because the client "
            "has no email address on record. Add an email or share via WhatsApp."
        )
    elif send_email:
        message = "Email delivery was not queued. Please retry."
    else:
        message = f"Quote {quote_obj.quote_number} is ready to share."

    return map_quote_send_response(
        quote_obj,
        workspace,
        outcome.share_url,
        email_sent=outcome.email_sent,
        email_queued=outcome.email_queued,
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


@router.post(
    "/{id}/comments",
    response_model=QuoteCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_quote_comment(
    id: str,
    payload: QuoteCommentCreate,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    _user, workspace = auth
    comment = await service.create_quote_comment(db, workspace, id, payload)
    return QuoteCommentResponse.model_validate(comment)


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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-portal",
        ip_limit=60,
        token_limit=60,
        window_seconds=60,
    )

    quote_obj, client_name, workspace = await service.view_public_quote(db, token)
    return map_public_quote_view(quote_obj, client_name, workspace)


@router.post("/share/{token}/accept", response_model=PublicQuoteView)
async def accept_public_quote(
    token: str,
    payload: QuoteAcceptRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-accept",
        ip_limit=10,
        token_limit=5,
        window_seconds=3600,
    )

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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-decline",
        ip_limit=10,
        token_limit=5,
        window_seconds=3600,
    )

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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-request-review",
        ip_limit=10,
        token_limit=5,
        window_seconds=3600,
    )

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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-comments-list",
        ip_limit=60,
        token_limit=60,
        window_seconds=60,
    )

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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-comment-create",
        ip_limit=20,
        token_limit=10,
        window_seconds=3600,
    )

    comment, quote_obj, workspace, item_description, owner_email = (
        await service.post_public_quote_comment(db, token, payload)
    )
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


@router.get("/share/{token}/pdf")
async def get_public_quote_pdf(
    token: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await enforce_public_access(
        request=request,
        response=response,
        token=token,
        action="quote-pdf",
        ip_limit=30,
        token_limit=30,
        window_seconds=60,
    )

    return await deliver_public_document(
        db,
        token=token,
        document_type="quote",
    )
