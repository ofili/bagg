# ADR 0001: Monorepo Architecture for Bagg

## Status
Accepted

## Context
Bagg is an invoicing and get-paid workspace tailored for African freelancers. The core product requirements demand tight integration between:
1. The public client payment portal and freelancer dashboard (Next.js PWA).
2. The domain logic, integer minor-unit financial calculations, and OpenAPI schema generation (FastAPI).
3. Background scheduled jobs for payment reminders and PDF rendering (Worker).
4. End-to-end testing of the full payment loop (Playwright).

## Decision
We chose a polyglot monorepo structure managed by **pnpm workspaces + Turborepo** (for TypeScript/Next.js/e2e) and **uv** (for Python FastAPI/worker):
- `apps/web`: Next.js PWA
- `apps/api`: FastAPI and Celery/ARQ worker in a unified codebase
- `packages/api-client`: Auto-generated TypeScript client from the OpenAPI spec
- `packages/config`: Shared ESLint, TypeScript, and styling presets
- `fixtures/`: Shared JSON test vectors (currencies, integer rounding) consumed by both Python and TypeScript
- `e2e/`: Full Playwright smoke & user journey test suite

## Consequences
- **Positive:**
  - Zero contract drift between frontend and backend.
  - 1 feature = 1 pull request across database, API, and UI.
  - End-to-end tests run against real services locally with `docker-compose.yml`.
  - Single place for documentation, ADRs, and shared fixtures.
- **Tradeoffs:**
  - Requires developers to have both Node.js (pnpm) and Python (uv) installed locally.
