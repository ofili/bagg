from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.money import format_money
from app.domains.auth.router import get_current_user_and_workspace
from app.domains.invoices import service
from app.domains.invoices.presenter import (
    generate_whatsapp_share_url,
    map_invoice_to_response,
)
from app.domains.documents.service import render_invoice_html
from app.domains.invoices.schemas import (
    CurrencyMetricsResponse,
    DocumentStatusEventResponse,
    InvoiceCreate,
    InvoiceResponse,
    InvoiceReviseRequest,
    InvoiceRevisionResponse,
    InvoiceSendRequest,
    InvoiceSendResponse,
    InvoiceUpdate,
    WHTCreditNoteUpdate,
)
from app.domains.payments.schemas import (
    PaymentClaimConfirmRequest,
    PaymentClaimRejectRequest,
    PaymentClaimResponse,
)
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by status (draft, sent, viewed, payment_claimed, partially_paid, paid, overdue, void/cancelled)",
    ),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoices = await service.list_invoices(
        db,
        workspace,
        client_id=client_id,
        status_filter=status_filter,
        currency=currency,
    )
    return [
        map_invoice_to_response(inv, business_name=workspace.business_name)
        for inv in invoices
    ]


@router.get("/metrics", response_model=List[CurrencyMetricsResponse])
async def get_invoice_metrics(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    metrics = await service.get_currency_metrics(db, workspace)
    return [CurrencyMetricsResponse(**data) for data in metrics]


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.create_invoice(db, workspace, payload)
    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.get_invoice(db, workspace, invoice_id)
    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.update_draft_invoice(db, workspace, invoice_id, payload)
    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.post("/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice, client = await service.finalize_invoice(db, workspace, invoice_id)
    return map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        client_email=client.email,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )


@router.post("/{invoice_id}/send", response_model=InvoiceSendResponse)
async def send_invoice(
    invoice_id: str,
    payload: Optional[InvoiceSendRequest] = None,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    send_email = payload.send_email if payload else True
    outcome = await service.send_invoice(
        db, workspace, invoice_id, send_email=send_email
    )
    invoice = outcome.invoice
    client = outcome.client

    resp_invoice = map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        client_email=client.email,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )
    wa_url = generate_whatsapp_share_url(
        phone=client.phone,
        client_name=client.name,
        invoice_number=invoice.invoice_number,
        total_formatted=format_money(invoice.total_minor, invoice.currency),
        business_name=workspace.business_name,
        share_url=outcome.share_url,
        due_date=invoice.due_date,
    )

    if outcome.email_sent:
        message = f"Invoice {invoice.invoice_number} emailed successfully."
    elif send_email and not outcome.recipient_email:
        message = (
            "Invoice status updated, but no email was sent because the client "
            "has no email address on record. Add an email or share via WhatsApp."
        )
    elif send_email:
        message = "Invoice marked sent, but email delivery failed. Share the link instead."
    else:
        message = f"Invoice {invoice.invoice_number} is ready to share."

    return InvoiceSendResponse(
        invoice=resp_invoice,
        whatsapp_url=wa_url,
        email_sent=outcome.email_sent,
        recipient_email=outcome.recipient_email,
        share_url=outcome.share_url,
        message=message,
    )


@router.post("/{invoice_id}/share-link/regenerate", response_model=InvoiceResponse)
async def regenerate_share_link(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.regenerate_share_link(db, workspace, invoice_id)
    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.post("/{invoice_id}/revise", response_model=InvoiceResponse)
async def revise_invoice(
    invoice_id: str,
    payload: InvoiceReviseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.revise_invoice(db, workspace, invoice_id, payload)
    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.get("/{invoice_id}/revisions", response_model=List[InvoiceRevisionResponse])
async def list_invoice_revisions(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_invoice_revisions(db, workspace, invoice_id)


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Return the existing invoice HTML representation.

    The route name is retained for API compatibility. Actual PDF generation
    will be added after a renderer is selected and deployment-tested.
    """
    invoice = await service.get_invoice(db, workspace, invoice_id)
    html_content = render_invoice_html(invoice)

    return HTMLResponse(
        content=html_content,
        headers={
            "Content-Disposition": (
                f'inline; filename="Invoice-{invoice.invoice_number}.html"'
            )
        },
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_draft_invoice(db, workspace, invoice_id)
    return None


@router.get(
    "/{invoice_id}/status-events",
    response_model=List[DocumentStatusEventResponse],
)
async def list_invoice_status_events(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_invoice_status_events(db, workspace, invoice_id)


@router.get("/{invoice_id}/claims", response_model=List[PaymentClaimResponse])
async def list_invoice_claims(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_invoice_claims(db, workspace, invoice_id)


@router.post(
    "/{invoice_id}/claims/{claim_id}/confirm",
    response_model=PaymentClaimResponse,
)
async def confirm_payment_claim(
    invoice_id: str,
    claim_id: str,
    payload: Optional[PaymentClaimConfirmRequest] = None,
    workspace: Workspace = Depends(resolve_active_workspace),
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.confirm_payment_claim(
        db,
        workspace,
        invoice_id,
        claim_id,
        payload,
        confirmed_by_user_id=auth_data[0].id,
    )


@router.post(
    "/{invoice_id}/claims/{claim_id}/reject",
    response_model=PaymentClaimResponse,
)
async def reject_payment_claim(
    invoice_id: str,
    claim_id: str,
    payload: PaymentClaimRejectRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await service.reject_payment_claim(
        db, workspace, invoice_id, claim_id, payload
    )


@router.patch("/{invoice_id}/wht", response_model=InvoiceResponse)
async def update_wht_credit_note(
    invoice_id: str,
    payload: WHTCreditNoteUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.update_wht_credit_note(
        db, workspace, invoice_id, payload
    )
    return map_invoice_to_response(invoice, business_name=workspace.business_name)
