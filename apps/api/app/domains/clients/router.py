"""HTTP adapter for the client/contact domain.

No SQLAlchemy statements or persistence operations belong here.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.dependencies import require_auth
from app.domains.clients.models import Client, Contact
from app.domains.clients.repository import ClientRepository
from app.domains.clients.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ContactCreate,
    ContactUpdate,
    ContactResponse,
)
from app.domains.clients.service import (
    ClientService,
    ClientNotFoundError,
    ContactNotFoundError,
    BusinessContactInvariantError,
)
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace

router = APIRouter(prefix="/clients", tags=["Clients"])


def _contact_response(contact: Contact) -> ContactResponse:
    return ContactResponse(
        id=contact.id,
        workspace_id=contact.workspace_id,
        client_id=contact.client_id,
        name=contact.name,
        job_title=contact.job_title,
        email=contact.email,
        phone=contact.phone,
        is_primary=bool(contact.is_primary),
        notes=contact.notes,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


async def _client_response(
    client: Client,
    db: AsyncSession,
    *,
    detail: bool = False,
):
    contacts = await ClientRepository(db).list_client_contacts(
        client.workspace_id,
        client.id,
    )

    values = dict(
        id=client.id,
        bagg_reference=client.bagg_reference,
        workspace_id=client.workspace_id,
        name=client.name,
        client_type=client.client_type,
        email=client.email,
        phone=client.phone,
        address=client.address,
        country=client.country,
        preferred_currency=client.preferred_currency,
        default_payment_terms_days=client.default_payment_terms_days,
        tax_id=client.tax_id,
        notes=client.notes,
        contacts=[_contact_response(contact) for contact in contacts],
        total_invoiced_minor=0,
        total_paid_minor=0,
        total_outstanding_minor=0,
        invoice_count=0,
        created_at=client.created_at,
        updated_at=client.updated_at,
    )

    if detail:
        return ClientDetailResponse(**values, invoices=[])

    return ClientResponse(**values)


def _workspace(auth) -> Workspace:
    return auth[1]


def _raise_domain_error(exc: Exception):
    if isinstance(exc, (ClientNotFoundError, ContactNotFoundError)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client or contact not found",
        ) from exc

    if isinstance(exc, BusinessContactInvariantError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    raise exc


@router.get("/contacts", response_model=list[ContactResponse])
async def list_contacts(
    q: Optional[str] = Query(
        None,
        description="Search contacts by name, email, phone or client",
    ),
    client_id: Optional[str] = Query(None),
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        items = await ClientService(db).list_contacts(
            _workspace(auth).id,
            query=q,
            client_id=client_id,
        )
        return [_contact_response(item) for item in items]

    except (
        ClientNotFoundError,
        ContactNotFoundError,
        BusinessContactInvariantError,
    ) as exc:
        _raise_domain_error(exc)


@router.post(
    "/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    payload: ContactCreate,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        contact = await ClientService(db).create_contact(
            _workspace(auth).id,
            payload,
        )
        return _contact_response(contact)

    except (
        ClientNotFoundError,
        ContactNotFoundError,
        BusinessContactInvariantError,
    ) as exc:
        _raise_domain_error(exc)


@router.patch(
    "/contacts/{contact_id}",
    response_model=ContactResponse,
)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        contact = await ClientService(db).update_contact(
            _workspace(auth).id,
            contact_id,
            payload,
        )
        return _contact_response(contact)

    except (
        ClientNotFoundError,
        ContactNotFoundError,
        BusinessContactInvariantError,
    ) as exc:
        _raise_domain_error(exc)


@router.delete(
    "/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    contact_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        await ClientService(db).delete_contact(
            _workspace(auth).id,
            contact_id,
        )

    except (
        ClientNotFoundError,
        ContactNotFoundError,
        BusinessContactInvariantError,
    ) as exc:
        _raise_domain_error(exc)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    q: Optional[str] = Query(
        None,
        description="Search by name, email, or phone",
    ),
    currency: Optional[str] = Query(None),
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    service = ClientService(db)

    clients = await service.list_clients(
        _workspace(auth).id,
        query=q,
        currency=currency,
    )

    return [await _client_response(client, db) for client in clients]


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_client(
    payload: ClientCreate,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        client = await ClientService(db).create_client(
            _workspace(auth),
            payload,
        )

        return await _client_response(client, db)

    except BusinessContactInvariantError as exc:
        _raise_domain_error(exc)


@router.get(
    "/{client_id}",
    response_model=ClientDetailResponse,
)
async def get_client(
    client_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        client = await ClientService(db).get_client(
            _workspace(auth).id,
            client_id,
        )

        return await _client_response(
            client,
            db,
            detail=True,
        )

    except ClientNotFoundError as exc:
        _raise_domain_error(exc)


@router.patch(
    "/{client_id}",
    response_model=ClientResponse,
)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        client = await ClientService(db).update_client(
            _workspace(auth).id,
            client_id,
            payload,
        )

        return await _client_response(client, db)

    except (
        ClientNotFoundError,
        BusinessContactInvariantError,
    ) as exc:
        _raise_domain_error(exc)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_client(
    client_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    try:
        await ClientService(db).delete_client(
            _workspace(auth).id,
            client_id,
        )

    except ClientNotFoundError as exc:
        _raise_domain_error(exc)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
