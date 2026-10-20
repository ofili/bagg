from fastapi import APIRouter, status
from typing import List
from datetime import date, datetime, timezone
from app.domains.invoices.schemas import InvoiceCreate, InvoiceResponse, LineItemSchema
from app.core.money import calculate_invoice_totals
from app.core.security import generate_share_token

router = APIRouter(prefix="/invoices", tags=["Invoices"])

DEMO_INVOICES = [
    InvoiceResponse(
        id="inv_demo_01",
        workspace_id="ws_demo_01",
        client_id="cl_demo_02",
        invoice_number="INV-0001",
        currency="NGN",
        status="sent",
        issue_date=date(2026, 10, 15),
        due_date=date(2026, 10, 29),
        items=[
            LineItemSchema(id="item_1", description="Brand Identity Design", quantity=1, unit_price_minor=25000000, total_minor=25000000),
            LineItemSchema(id="item_2", description="Social Media Kit", quantity=1, unit_price_minor=15000000, total_minor=15000000),
        ],
        subtotal_minor=40000000,
        discount_minor=2000000,
        tax_rate_percent=7.5,
        tax_minor=2850000,
        total_minor=40850000,
        amount_paid_minor=0,
        notes="Bank transfer details attached below. Thanks for your partnership!",
        share_token="token_demo_sample_ngn",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
]

@router.get("", response_model=List[InvoiceResponse])
async def list_invoices():
    """Lists all invoices for the workspace."""
    return DEMO_INVOICES

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(payload: InvoiceCreate):
    """Creates a new invoice and computes financial totals in minor units."""
    raw_items = [
        {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
        for it in payload.items
    ]
    totals = calculate_invoice_totals(
        items=raw_items,
        discount_minor=payload.discount_minor,
        tax_percent=payload.tax_rate_percent
    )

    items_with_totals = [
        LineItemSchema(
            id=f"item_{i+1}",
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.quantity * item.unit_price_minor
        )
        for i, item in enumerate(payload.items)
    ]

    raw_token, _ = generate_share_token()

    return InvoiceResponse(
        id="inv_new",
        workspace_id="ws_demo_01",
        client_id=payload.client_id,
        invoice_number="INV-0002",
        currency=payload.currency,
        status="draft",
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        items=items_with_totals,
        subtotal_minor=totals["subtotal_minor"],
        discount_minor=totals["discounted_subtotal_minor"],
        tax_rate_percent=payload.tax_rate_percent,
        tax_minor=totals["tax_minor"],
        total_minor=totals["total_minor"],
        notes=payload.notes,
        share_token=raw_token,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
