from fastapi import APIRouter, status
from typing import List
from app.domains.clients.schemas import ClientCreate, ClientResponse

router = APIRouter(prefix="/clients", tags=["Clients"])

DEMO_CLIENTS = [
    ClientResponse(
        id="cl_demo_01",
        workspace_id="ws_demo_01",
        name="Acme Global Inc.",
        email="finance@acmeglobal.com",
        phone="+1 415 555 2671",
        preferred_currency="USD",
        default_payment_terms_days=30,
        total_invoiced_minor=1250000,
        total_paid_minor=1250000,
        total_outstanding_minor=0
    ),
    ClientResponse(
        id="cl_demo_02",
        workspace_id="ws_demo_01",
        name="Lagos Tech Ventures",
        email="billing@lagostech.ng",
        phone="+234 803 123 4567",
        preferred_currency="NGN",
        default_payment_terms_days=14,
        total_invoiced_minor=45000000,
        total_paid_minor=20000000,
        total_outstanding_minor=25000000
    )
]

@router.get("", response_model=List[ClientResponse])
async def list_clients():
    """Lists all saved clients with invoice and payment totals."""
    return DEMO_CLIENTS

@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreate):
    """Creates a new client record."""
    return ClientResponse(
        id="cl_demo_new",
        workspace_id="ws_demo_01",
        **payload.model_dump()
    )
