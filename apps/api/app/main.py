from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.money import CURRENCY_SPECS
from app.domains.auth.router import router as auth_router
from app.domains.workspaces.router import router as workspaces_router
from app.domains.clients.router import router as clients_router
from app.domains.invoices.router import router as invoices_router
from app.domains.payments.router import router as payments_router
from app.domains.sharing.router import router as sharing_router
from app.domains.reminders.router import router as reminders_router
from app.domains.billing.router import router as billing_router
from app.domains.webhooks.router import router as webhooks_router
from app.domains.compliance.router import router as compliance_router

app = FastAPI(
    title="Bagg API",
    description="Invoicing and get-paid workspace API for African freelancers and creators",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.WEB_BASE_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Domain Routers
app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(clients_router)
app.include_router(invoices_router)
app.include_router(payments_router)
app.include_router(sharing_router)
app.include_router(reminders_router)
app.include_router(billing_router)
app.include_router(webhooks_router)
app.include_router(compliance_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0"
    }


@app.get("/currencies", tags=["Currencies"])
async def get_supported_currencies():
    """Lists supported African and international currencies with minor unit factors."""
    return {
        "currencies": [
            {"code": code, **data}
            for code, data in CURRENCY_SPECS.items()
        ]
    }
