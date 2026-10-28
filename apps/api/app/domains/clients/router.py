from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.clients.models import Client, Contact
from app.domains.clients.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ClientInvoiceSummary,
    ContactCreate,
    ContactInput,
    ContactUpdate,
    ContactResponse,
)

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
    include_invoices: bool = False,
) -> ClientResponse:
    contacts_result = await db.execute(
        select(Contact)
        .where(
            Contact.workspace_id == client.workspace_id,
            Contact.client_id == client.id,
        )
        .order_by(Contact.is_primary.desc(), Contact.name.asc())
    )
    contacts = contacts_result.scalars().all()

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

    if include_invoices:
        return ClientDetailResponse(**values, invoices=[])

    return ClientResponse(**values)


async def _get_workspace_client(
    client_id: str,
    workspace_id: str,
    db: AsyncSession,
) -> Client:
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.workspace_id == workspace_id,
        )
    )
    client = result.scalar_one_or_none()

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    return client


async def _ensure_business_has_contact(
    client: Client,
    db: AsyncSession,
) -> None:
    if client.client_type != "BUSINESS":
        return

    count_result = await db.execute(
        select(func.count(Contact.id)).where(
            Contact.workspace_id == client.workspace_id,
            Contact.client_id == client.id,
        )
    )
    count = count_result.scalar_one()

    if count < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A business client must have at least one contact.",
        )


async def _get_workspace_contact(
    contact_id: str,
    workspace_id: str,
    db: AsyncSession,
) -> Contact:
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.workspace_id == workspace_id,
        )
    )
    contact = result.scalar_one_or_none()

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    return contact


# Keep this static route before /{client_id} so "contacts" is not
# interpreted as a client ID.
@router.get("/contacts", response_model=List[ContactResponse])
async def list_contacts(
    q: Optional[str] = Query(
        None,
        description="Search contacts by name, email, phone or client",
    ),
    client_id: Optional[str] = Query(None),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contact)
        .join(Client, Contact.client_id == Client.id)
        .where(
            Contact.workspace_id == workspace.id,
            Client.workspace_id == workspace.id,
        )
    )

    if client_id:
        stmt = stmt.where(Contact.client_id == client_id)

    if q and q.strip():
        clean_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Contact.name.ilike(clean_q),
                Contact.email.ilike(clean_q),
                Contact.phone.ilike(clean_q),
                Contact.job_title.ilike(clean_q),
                Client.name.ilike(clean_q),
            )
        )

    stmt = stmt.order_by(
        Contact.is_primary.desc(),
        Contact.name.asc(),
    )
    result = await db.execute(stmt)
    return [_contact_response(contact) for contact in result.scalars().all()]


@router.post(
    "/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    payload: ContactCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_workspace_client(
        payload.client_id,
        workspace.id,
        db,
    )

    contact_data = payload.model_dump(exclude={"client_id"})
    contact = Contact(
        workspace_id=workspace.id,
        client_id=client.id,
        **contact_data,
    )

    try:
        # If this is the first contact for a business, make it primary.
        existing_result = await db.execute(
            select(func.count(Contact.id)).where(
                Contact.workspace_id == workspace.id,
                Contact.client_id == client.id,
            )
        )
        existing_count = existing_result.scalar_one()

        if existing_count == 0:
            contact.is_primary = 1

        db.add(contact)
        await db.commit()
        await db.refresh(contact)
    except Exception:
        await db.rollback()
        raise

    return _contact_response(contact)


@router.patch("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    contact = await _get_workspace_contact(
        contact_id,
        workspace.id,
        db,
    )

    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        update_data["name"] = update_data["name"].strip()
        if not update_data["name"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Contact name is required.",
            )

    for field, value in update_data.items():
        if field == "is_primary" and value is not None:
            setattr(contact, field, int(value))
        elif value is not None or field in {"email", "phone", "job_title", "notes"}:
            setattr(contact, field, value)

    try:
        await db.commit()
        await db.refresh(contact)
    except Exception:
        await db.rollback()
        raise

    return _contact_response(contact)


@router.delete(
    "/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    contact_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    contact = await _get_workspace_contact(
        contact_id,
        workspace.id,
        db,
    )

    client = await _get_workspace_client(
        contact.client_id,
        workspace.id,
        db,
    )

    if client.client_type == "BUSINESS":
        count_result = await db.execute(
            select(func.count(Contact.id)).where(
                Contact.workspace_id == workspace.id,
                Contact.client_id == client.id,
            )
        )
        contact_count = count_result.scalar_one()

        if contact_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This is the business's last contact. "
                    "Add another contact before deleting this one."
                ),
            )

    await db.delete(contact)
    await db.commit()
    return None


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    q: Optional[str] = Query(
        None,
        description="Search by name, email, or phone",
    ),
    currency: Optional[str] = Query(None),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Client).where(Client.workspace_id == workspace.id)

    if q and q.strip():
        clean_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Client.name.ilike(clean_q),
                Client.email.ilike(clean_q),
                Client.phone.ilike(clean_q),
            )
        )

    if currency:
        stmt = stmt.where(Client.preferred_currency == currency.upper().strip())

    result = await db.execute(stmt.order_by(Client.name.asc()))
    clients = result.scalars().all()

    return [await _client_response(client, db) for client in clients]


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_client(
    payload: ClientCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    # Pydantic also validates this, but retain a server-side guard.
    if payload.client_type == "BUSINESS" and not payload.contacts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A business client must have at least one contact.",
        )

    client = Client(
        workspace_id=workspace.id,
        name=payload.name,
        client_type=payload.client_type,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        country=payload.country or workspace.country,
        preferred_currency=payload.preferred_currency,
        default_payment_terms_days=payload.default_payment_terms_days,
        tax_id=payload.tax_id,
        notes=payload.notes,
    )

    try:
        db.add(client)
        await db.flush()

        for index, contact_input in enumerate(payload.contacts):
            contact_data = contact_input.model_dump()
            is_primary = contact_data.pop("is_primary", False)

            contact = Contact(
                workspace_id=workspace.id,
                client_id=client.id,
                **contact_data,
                is_primary=int(is_primary or index == 0),
            )
            db.add(contact)

        await db.commit()
        await db.refresh(client)
    except Exception:
        await db.rollback()
        raise

    return await _client_response(client, db)


@router.get("/{client_id}", response_model=ClientDetailResponse)
async def get_client(
    client_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_workspace_client(
        client_id,
        workspace.id,
        db,
    )
    return await _client_response(client, db, include_invoices=True)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_workspace_client(
        client_id,
        workspace.id,
        db,
    )

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if value is not None or field in {
            "email",
            "phone",
            "address",
            "country",
            "tax_id",
            "notes",
        }:
            setattr(client, field, value)

    # A person can be changed to a business only if contacts already exist.
    await db.flush()

    try:
        await _ensure_business_has_contact(client, db)
        await db.commit()
        await db.refresh(client)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise

    return await _client_response(client, db)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_client(
    client_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_workspace_client(
        client_id,
        workspace.id,
        db,
    )

    await db.delete(client)
    await db.commit()
    return None
