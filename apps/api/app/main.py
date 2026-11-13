from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models

from app.core.config import settings
from app.core.middleware import (
    RequestTracingMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.money import CURRENCY_SPECS

from app.domains.auth.router import router as auth_router
from app.domains.workspaces.router import router as workspaces_router
from app.domains.onboarding.router import router as onboarding_router

from app.domains.clients.router import router as clients_router
from app.domains.invoices.router import router as invoices_router
from app.domains.payments.router import router as payments_router
from app.domains.sharing.router import router as sharing_router
from app.domains.reminders.router import router as reminders_router
from app.domains.billing.router import router as billing_router
from app.domains.webhooks.router import router as webhooks_router

from app.domains.webhooks.invoice_payments import (
    router as invoice_payment_webhooks_router,
)

from app.domains.compliance.router import router as compliance_router
from app.domains.quotes.router import router as quotes_router
from app.domains.receipts.router import router as receipts_router
from app.domains.notifications.router import router as notifications_router
from app.domains.security.router import router as security_router

from app.domains.security.email_change_router import (
    router as email_change_router,
)

from app.domains.users.router import router as users_router

from app.domains.recurring_invoices.router import (
    router as recurring_invoices_router,
)


app = FastAPI(
    title="Bagg API",
    description=(
        "Invoicing and get-paid workspace API "
        "for African freelancers and creators"
    ),
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)


# Security and observability middleware.

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTracingMiddleware)


# Cross-origin resource sharing.

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register domain routers.

app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(onboarding_router)

app.include_router(clients_router)
app.include_router(invoices_router)
app.include_router(quotes_router)
app.include_router(payments_router)
app.include_router(sharing_router)
app.include_router(reminders_router)

app.include_router(billing_router)
app.include_router(webhooks_router)
app.include_router(invoice_payment_webhooks_router)

app.include_router(compliance_router)
app.include_router(receipts_router)
app.include_router(notifications_router)

app.include_router(security_router)
app.include_router(email_change_router)
app.include_router(users_router)

app.include_router(recurring_invoices_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Service health check endpoint."""

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
    }


@app.get("/currencies", tags=["Currencies"])
async def get_supported_currencies():
    """Lists supported African and international currencies."""

    return {
        "currencies": [
            {
                "code": code,
                **data,
            }
            for code, data in CURRENCY_SPECS.items()
        ]
    }