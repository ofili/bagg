
# Bagg API

FastAPI service and background workers for Bagg.

## Getting Started

Install dependencies:

```bash
uv sync --extra dev
```

Start the API:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

## Background workers

Bagg uses separate processes for email delivery and PDF generation.

Start the email worker:

```bash
uv run python -m app.jobs.worker
```

Start the document-generation worker:

```bash
uv run python -m app.jobs.document_worker
```

Both workers use the same database and durable job records. They can run independently of the API process.

The document worker:
- Claims pending jobs using PostgreSQL row locking.
- Processes each claimed batch concurrently.
- Uses claim tokens to prevent stale workers from updating reclaimed jobs.
- Retries transient failures and marks exhausted jobs as failed.
- Handles SIGINT and SIGTERM by stopping new claims and finishing the current batch.
- Relies on job leases to recover work after an ungraceful process termination.
