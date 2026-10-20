# Bagg

> **Invoice like a pro. Get paid without chasing.**
>
> An invoicing and get-paid workspace tailored for African freelancers and creators.

---

## 🌟 Overview

Bagg simplifies multi-currency billing for African sole operators and creators. A freelancer builds a professional invoice in minutes and shares it by link, WhatsApp, email, or PDF. Bagg shows the client exactly how to pay in the right currency, tracks status, and automates polite payment follow-ups.

For the full product requirements and design decisions, see [Bagg PRD v0.1.md](./Bagg%20PRD%20v0.1.md).

---

## 🏗️ Repository Architecture

This polyglot monorepo pairs a **Next.js PWA** frontend with a **FastAPI** backend and background worker:

```text
bagg/
├── apps/
│   ├── web/                    # Next.js PWA (Dashboard, Invoices, Client Share View)
│   │   ├── src/app/
│   │   │   ├── (marketing)/    # Landing page & pricing
│   │   │   ├── (app)/          # Freelancer workspace: dashboard, invoices, clients, settings
│   │   │   └── i/[token]/      # Public client invoice view (share link)
│   │   ├── src/components/     # UI components
│   │   ├── src/lib/            # Money formatting, API client wrapper
│   │   └── public/             # PWA manifest and static assets
│   └── api/                    # FastAPI service and worker (one codebase)
│       ├── app/
│       │   ├── main.py         # API entrypoint
│       │   ├── core/           # Config, database session, security, minor-unit money math
│       │   ├── domains/        # Invoices, clients, payments, sharing, reminders, billing
│       │   ├── integrations/   # Email (SMTP/Mailpit), S3 storage, Paystack, Flutterwave
│       │   ├── jobs/           # Worker entrypoint, reminder scheduler, PDF handlers
│       │   └── templates/      # Jinja2 HTML templates for PDF invoices and reminder emails
│       ├── migrations/         # Alembic database migrations
│       ├── tests/              # Pytest suite validating against shared fixtures
│       └── pyproject.toml
├── packages/
│   ├── api-client/             # TypeScript client generated from the OpenAPI spec
│   └── config/                 # Shared tsconfig, eslint, tailwind presets
├── e2e/                        # Playwright: test create, send, view, and claim payment flows
├── fixtures/                   # Shared money, rounding, and currency test vectors (JSON)
├── infra/                      # Dockerfiles for API, Worker, and Web
├── docs/                       # Architecture Decision Records (ADRs) & local runbooks
├── .github/workflows/          # GitHub Actions CI matrix
├── docker-compose.yml          # Postgres, Redis, Mailpit, MinIO
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20+` (tested with v24)
- **pnpm**: `v10+` (tested with v11)
- **Python**: `v3.11+` (tested with v3.14)
- **uv**: Fast Python package installer (`uv --version`)
- **Docker & Docker Compose**

### 1. Start Local Infrastructure
Launch PostgreSQL, Redis, Mailpit (local SMTP capture), and MinIO (local S3):
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
# Frontend & packages
pnpm install

# Backend
cd apps/api
uv sync --extra dev
cd ../..
```

### 3. Run Development Servers
```bash
# Start Next.js PWA (http://localhost:3000)
pnpm dev:web

# Start FastAPI server (http://localhost:8000)
pnpm dev:api

# Start background worker
pnpm dev:worker
```

---

## 🧪 Testing

### Backend & Fixtures Test
Runs unit tests that validate minor-unit integer arithmetic against [fixtures/money-vectors.json](./fixtures/money-vectors.json):
```bash
pnpm test:api
```

### End-to-End Suite
Runs Playwright smoke tests verifying the landing page, dashboard, and public invoice share view:
```bash
pnpm test:e2e
```

---

## 🔗 Key URLs (Local Development)

| Service | URL | Description |
| :--- | :--- | :--- |
| **Bagg Web App** | [http://localhost:3000](http://localhost:3000) | Landing page & Freelancer workspace |
| **Demo Client Invoice** | [http://localhost:3000/i/token_demo_sample_ngn](http://localhost:3000/i/token_demo_sample_ngn) | Public client payment view |
| **FastAPI Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API documentation |
| **Mailpit Web UI** | [http://localhost:8025](http://localhost:8025) | Local inbox for payment reminder emails |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | S3 storage console for proofs and logos |
