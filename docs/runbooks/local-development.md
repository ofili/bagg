# Local Development Runbook

## Prerequisites
- Node.js >= 20
- pnpm >= 10
- Python >= 3.11 with `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh` or Windows installer)
- Docker & Docker Compose

## Quick Start

### 1. Start Local Infrastructure
Start PostgreSQL, Redis, Mailpit (SMTP server), and MinIO (S3 storage):
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
# Frontend & packages
pnpm install

# Backend
cd apps/api
uv sync
cd ../..
```

Seed the public demo invoice, quote and receipt:
```bash
pnpm seed:demo
```

To recreate the demo documents, run `cd apps/api && uv run python scripts/seed_demo.py --reset`.

### 3. Run Development Servers
In separate terminals or using the root commands:
```bash
# Run Next.js web application (http://localhost:3000)
pnpm dev:web

# Run FastAPI backend (http://localhost:8000)
pnpm dev:api

# Run background worker
pnpm dev:worker
```

### 4. Run Test Suites
```bash
# Python backend tests (asserts against shared fixtures)
pnpm test:api

# End-to-end browser tests
pnpm test:e2e
```

### 5. Services and Ports
- **Next.js Web App:** http://localhost:3000
- **Public Client Invoice Preview:** http://localhost:3000/i/token_demo_sample_ngn
- **Public Quote Preview:** http://localhost:3000/q/token_demo_sample_qot
- **Public Receipt Preview:** http://localhost:3000/r/token_demo_sample_rcp
- **FastAPI Docs:** http://localhost:8000/docs
- **Mailpit Web UI (Mock Emails):** http://localhost:8025
- **MinIO Console (Mock S3 Storage):** http://localhost:9001
