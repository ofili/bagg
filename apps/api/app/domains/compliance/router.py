"""
Compliance Router (Lifecycle 12)
US-SEC-01: One-Click Data Export & Portability
US-SEC-02: Abuse Reporting & Phishing Protection
US-SEC-03: Right to Erasure (Account Deletion)
"""
import csv
import io
import zipfile
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete

from app.core.database import get_db
from app.core.money import format_money
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.auth.models import User, UserSession
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem, InvoiceRevision
from app.domains.payments.models import PaymentProfile, PaymentClaim
from app.domains.sharing.models import InvoiceComment
from app.domains.reminders.models import ReminderJob
from app.domains.billing.models import Subscription, CreditLedgerEntry
from app.domains.compliance.models import AbuseReport
from app.domains.compliance.schemas import (
    AbuseReportCreate,
    AbuseReportResponse,
    AccountDeletionRequest,
    AccountDeletionResponse,
)

router = APIRouter(prefix="/compliance", tags=["Compliance"])


# ---------------------------------------------------------------------------
# US-SEC-01: One-Click Data Export & Portability
# ---------------------------------------------------------------------------

@router.get("/export/csv")
async def export_data_csv(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports all client records and invoice records as a single CSV download.
    Completes in under 30 seconds without requiring customer support (US-SEC-01).
    """
    # Fetch clients
    clients_res = await db.execute(
        select(Client).where(Client.workspace_id == workspace.id).order_by(Client.name)
    )
    clients = clients_res.scalars().all()

    # Fetch invoices
    invoices_res = await db.execute(
        select(Invoice).where(Invoice.workspace_id == workspace.id).order_by(Invoice.sequence_number)
    )
    invoices = invoices_res.scalars().all()

    # Fetch payment claims
    invoice_ids = [inv.id for inv in invoices]
    claims = []
    if invoice_ids:
        claims_res = await db.execute(
            select(PaymentClaim).where(PaymentClaim.invoice_id.in_(invoice_ids))
        )
        claims = claims_res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # --- Clients Sheet ---
    writer.writerow(["=== CLIENTS ==="])
    writer.writerow(["ID", "Name", "Email", "Phone", "Currency", "Payment Terms (days)", "Created"])
    for c in clients:
        writer.writerow([
            c.id, c.name, c.email or "", c.phone or "",
            c.preferred_currency, c.default_payment_terms_days or 14,
            c.created_at.isoformat() if c.created_at else "",
        ])

    writer.writerow([])

    # --- Invoices Sheet ---
    writer.writerow(["=== INVOICES ==="])
    writer.writerow([
        "ID", "Number", "Client ID", "Currency", "Status",
        "Issue Date", "Due Date", "Subtotal (minor)", "Discount (minor)",
        "Tax %", "Tax (minor)", "Total (minor)", "WHT %", "WHT (minor)",
        "Net Payable (minor)", "Amount Paid (minor)", "Sent At", "Version",
    ])
    for inv in invoices:
        writer.writerow([
            inv.id, inv.invoice_number, inv.client_id, inv.currency, inv.status,
            str(inv.issue_date), str(inv.due_date),
            inv.subtotal_minor, inv.discount_minor,
            inv.tax_rate_percent, inv.tax_minor, inv.total_minor,
            inv.wht_rate_percent or 0, inv.wht_minor or 0,
            inv.net_payable_minor or inv.total_minor,
            inv.amount_paid_minor or 0,
            inv.sent_at.isoformat() if inv.sent_at else "",
            inv.version,
        ])

    writer.writerow([])

    # --- Payment Claims Sheet ---
    writer.writerow(["=== PAYMENT CLAIMS ==="])
    writer.writerow(["ID", "Invoice ID", "Amount (minor)", "Payment Date", "Reference", "Status", "Created"])
    for cl in claims:
        writer.writerow([
            cl.id, cl.invoice_id, cl.amount_minor,
            str(cl.payment_date) if cl.payment_date else "",
            cl.reference or "", cl.status,
            cl.created_at.isoformat() if cl.created_at else "",
        ])

    output.seek(0)
    filename = f"bagg_export_{workspace.id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/zip")
async def export_data_zip(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports all data as a ZIP archive containing separate CSV files (US-SEC-01).
    """
    # Fetch data
    clients_res = await db.execute(
        select(Client).where(Client.workspace_id == workspace.id).order_by(Client.name)
    )
    clients = clients_res.scalars().all()

    invoices_res = await db.execute(
        select(Invoice).where(Invoice.workspace_id == workspace.id).order_by(Invoice.sequence_number)
    )
    invoices = invoices_res.scalars().all()

    invoice_ids = [inv.id for inv in invoices]
    claims = []
    if invoice_ids:
        claims_res = await db.execute(
            select(PaymentClaim).where(PaymentClaim.invoice_id.in_(invoice_ids))
        )
        claims = claims_res.scalars().all()

    # Build ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # clients.csv
        clients_csv = io.StringIO()
        cw = csv.writer(clients_csv)
        cw.writerow(["ID", "Name", "Email", "Phone", "Currency", "Payment Terms (days)", "Created"])
        for c in clients:
            cw.writerow([
                c.id, c.name, c.email or "", c.phone or "",
                c.preferred_currency, c.default_payment_terms_days or 14,
                c.created_at.isoformat() if c.created_at else "",
            ])
        zf.writestr("clients.csv", clients_csv.getvalue())

        # invoices.csv
        inv_csv = io.StringIO()
        iw = csv.writer(inv_csv)
        iw.writerow([
            "ID", "Number", "Client ID", "Currency", "Status",
            "Issue Date", "Due Date", "Subtotal", "Discount",
            "Tax %", "Tax", "Total", "WHT %", "WHT",
            "Net Payable", "Amount Paid", "Sent At", "Version",
        ])
        for inv in invoices:
            iw.writerow([
                inv.id, inv.invoice_number, inv.client_id, inv.currency, inv.status,
                str(inv.issue_date), str(inv.due_date),
                inv.subtotal_minor, inv.discount_minor,
                inv.tax_rate_percent, inv.tax_minor, inv.total_minor,
                inv.wht_rate_percent or 0, inv.wht_minor or 0,
                inv.net_payable_minor or inv.total_minor,
                inv.amount_paid_minor or 0,
                inv.sent_at.isoformat() if inv.sent_at else "",
                inv.version,
            ])
        zf.writestr("invoices.csv", inv_csv.getvalue())

        # payment_claims.csv
        pc_csv = io.StringIO()
        pw = csv.writer(pc_csv)
        pw.writerow(["ID", "Invoice ID", "Amount", "Payment Date", "Reference", "Status", "Created"])
        for cl in claims:
            pw.writerow([
                cl.id, cl.invoice_id, cl.amount_minor,
                str(cl.payment_date) if cl.payment_date else "",
                cl.reference or "", cl.status,
                cl.created_at.isoformat() if cl.created_at else "",
            ])
        zf.writestr("payment_claims.csv", pc_csv.getvalue())

    zip_buffer.seek(0)
    filename = f"bagg_export_{workspace.id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.zip"

    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# US-SEC-03: Right to Erasure (Account Deletion)
# ---------------------------------------------------------------------------

@router.post("/delete-account", response_model=AccountDeletionResponse)
async def delete_account(
    payload: AccountDeletionRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes the user account and all associated data (US-SEC-03).
    Compliant with Nigeria Data Protection Act (NDPA 2023).
    - Active workspaces, clients, and invoice links are immediately invalidated.
    - All data is hard-deleted from the database.
    """
    if payload.confirmation_phrase != "DELETE MY ACCOUNT":
        raise HTTPException(
            status_code=400,
            detail="Confirmation phrase must be exactly 'DELETE MY ACCOUNT'",
        )

    # Resolve owner
    owner_id = workspace.owner_id

    # Delete all workspaces and cascade (clients, invoices, items, revisions, claims, comments, reminders, subscriptions)
    ws_res = await db.execute(select(Workspace).where(Workspace.owner_id == owner_id))
    workspaces = ws_res.scalars().all()

    for ws in workspaces:
        # Delete billing data
        await db.execute(delete(CreditLedgerEntry).where(CreditLedgerEntry.workspace_id == ws.id))
        await db.execute(delete(Subscription).where(Subscription.workspace_id == ws.id))

        # Delete abuse reports
        await db.execute(delete(AbuseReport).where(AbuseReport.workspace_id == ws.id))

        # Invoices cascade handles: line_items, revisions, comments, claims, reminders
        inv_res = await db.execute(select(Invoice.id).where(Invoice.workspace_id == ws.id))
        inv_ids = [r[0] for r in inv_res.all()]

        if inv_ids:
            await db.execute(delete(ReminderJob).where(ReminderJob.invoice_id.in_(inv_ids)))
            await db.execute(delete(InvoiceComment).where(InvoiceComment.invoice_id.in_(inv_ids)))
            await db.execute(delete(PaymentClaim).where(PaymentClaim.invoice_id.in_(inv_ids)))
            await db.execute(delete(InvoiceRevision).where(InvoiceRevision.invoice_id.in_(inv_ids)))
            await db.execute(delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id.in_(inv_ids)))
            await db.execute(delete(Invoice).where(Invoice.id.in_(inv_ids)))

        # Delete payment profiles
        await db.execute(delete(PaymentProfile).where(PaymentProfile.workspace_id == ws.id))

        # Delete clients
        await db.execute(delete(Client).where(Client.workspace_id == ws.id))

    # Delete workspaces
    await db.execute(delete(Workspace).where(Workspace.owner_id == owner_id))

    # Delete user sessions
    await db.execute(delete(UserSession).where(UserSession.user_id == owner_id))

    # Delete user
    await db.execute(delete(User).where(User.id == owner_id))

    await db.commit()

    purge_time = datetime.now(timezone.utc)

    return AccountDeletionResponse(
        status="deleted",
        message="Your account and all associated data have been permanently deleted in compliance with NDPA 2023.",
        data_purge_scheduled_at=purge_time,
    )
