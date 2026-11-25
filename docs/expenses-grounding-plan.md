# Bagg — Expenses Addendum: Codebase Grounding & Foundational Plan

**Date:** 2026-11-25  
**Status:** Grounded against repository state  

---

## 1. Codebase Grounding & Reality Check

We inspected the actual implementation across `apps/api` and `apps/web` against the requirements and assumptions in the Expenses Addendum.

### 1.1 Engagement Foundation Prerequisite
- **Finding:** There is currently **no `engagements` domain** in `apps/api/app/domains/` and no database table for engagements in Alembic migrations.
- **Current Flow:** Quotes (`quotes`) convert directly to Invoices (`invoices`) via `convert_quote_to_invoice` / `create_draft_invoice_from_quote`. `invoices.quote_id` is a 1:1 foreign key.
- **Addendum Impact:** `BAG-EXP-001` and `BAG-EXP-002` explicitly depend on `BAG-ENG-001` (Define and migrate the engagement aggregate) and `BAG-ENG-002` (Commercial terms snapshot).
- **Recommendation:** Foundational work must either sequence `BAG-ENG-001`/`002` first, or provide the quote-side expense policy model (`BAG-EXP-001`) in tandem with the engagement design so that schema models are aligned.

### 1.2 Quotes & Invoices Domain
- **Minor Units Convention:** Financial fields across both quotes and invoices are strictly in integer minor units (e.g. `subtotal_minor`, `discount_minor`, `tax_minor`, `total_minor`, `wht_minor`, `deposit_amount_minor`, `net_payable_minor`).
  - *Expenses Alignment:* `BAG-EXP-001` (thresholds, cap) and `BAG-EXP-002` (expense amounts) must follow the exact same integer `BigInteger` minor unit pattern.
- **Deposit Architecture:** Both `Quote` and `Invoice` track `deposit_percentage: Float` and `deposit_amount_minor: BigInteger`.
  - *Decision 3 Grounding:* Applying the deposit percentage strictly to service fees (and excluding pass-through expenses) conforms cleanly with `QuoteLineItem` and invoice draft generation.
- **Immutability & Revisions:** 
  - `Invoice` has strict lifecycle status (`draft`, `issued`, `sent`, `viewed`, `payment_claimed`, `partially_paid`, `paid`, `cancelled`), issuance generation (`issuance_generation`), recall mechanics (`recall_invoice`), and revision history (`InvoiceRevision`).
  - *Expenses Alignment:* `BAG-EXP-005`'s rule refusing additions to non-draft invoices aligns with `update_draft_invoice` guard checks (which enforce `status == "draft"`).

### 1.3 Receipts vs. Expense Receipts
- **Finding:** `apps/api/app/domains/receipts/` currently represents **Payment Receipts** issued to clients after payment confirmation (`Receipt`, `ReceiptReversal`).
- **Clarification:** Expense attachments ("expense receipts/proof of purchase") must not collide with client payment receipts.
- **Location:** The expense domain should live in `apps/api/app/domains/expenses/` with an `Expense` model and an `ExpenseReceiptAttachment` (or `expense.receipt_file_url` / `expense_receipts`).

### 1.4 Storage Integration & Receipt Protection (FR-089, AC-026)
- **Current Storage Service (`apps/api/app/integrations/storage.py`):**
  Currently a basic stub returning direct S3 URLs (`{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{filename}`).
- **Requirement Gap:** `AC-026` demands short-lived, authenticated/scoped access URLs that prevent unauthorized viewing or cross-tenant leakage.
- **Grounding Action:** For `BAG-EXP-002`, the storage integration needs an adapter capability for generating time-limited signed download URLs (or streaming receipts through an authenticated API proxy endpoint in `apps/api/app/domains/expenses/router.py`).

### 1.5 Payment Authority & Reimbursement (AC-024)
- **Current Payment Architecture:**
  - `PaymentClaim` records client payment claims.
  - Payment confirmation happens strictly through authoritative events (`confirm_payment_claim` in `invoices/service.py`, or gateway webhooks from Paystack/Flutterwave).
- *Expenses Alignment:* `BAG-EXP-005` relies on this exact trigger: marking expense lines as reimbursed will hook directly into the existing `confirm_payment_claim` / payment confirmation pipeline, keeping the single source of truth intact.

---

## 2. Foundational Tickets Planning

To respect the dependencies without stalling, we divide the foundational plan into two concrete phases:

### Phase 1: Core Engagements & Quote Commercial Baseline
Before an expense can be created, the engagement container and policy snapshot mechanism must exist.

1. **Ticket: `BAG-ENG-001` — Engagement Aggregate & Migrations**
   - **Target:** `apps/api/app/domains/engagements/` (models, schemas, repository, router, service).
   - **Fields:** `id`, `bagg_reference`, `workspace_id`, `client_id`, `title`, `type` (`one_off`, `retainer`), `status` (`draft`, `active`, `completed`, `closed`, `cancelled`), `currency`.
   - **Database Migration:** New `engagements` table with foreign keys to `workspaces` and `clients`.

2. **Ticket: `BAG-ENG-002` + `BAG-EXP-001` — Quote Expense Policy & Commercial Baseline Snapshot**
   - **Quote Model Extension:**
     - Add `has_expense_policy: bool`
     - Add `expense_policy: JSON` or structured columns:
       - `reimbursable_categories: list[str]`
       - `approval_threshold_minor: BigInteger | None`
       - `total_expense_cap_minor: BigInteger | None`
       - `client_approval_required: bool`
   - **Engagement Commercial Baseline:**
     - On quote acceptance (`accept_public_quote`), instantiate `Engagement` and store `commercial_baseline` snapshot (scope, fee total, currency, and exact accepted expense policy).

### Phase 2: Expense Data Model & Secure Receipt Storage (`BAG-EXP-002`)
Once the engagement and policy baseline are in place:

1. **Ticket: `BAG-EXP-002` — Expense Records & Isolated Storage**
   - **Target:** `apps/api/app/domains/expenses/`
   - **Model `Expense`:**
     - Identifiers: `id`, `bagg_reference`, `workspace_id`, `engagement_id`, `client_id`.
     - Financials: `amount_minor`, `currency`, `date`, `description`, `billable` (boolean).
     - Context: `category`, `milestone_id` (optional).
     - State tracking:
       - `approval_status`: `not_required`, `pending`, `approved`, `declined`
       - `invoicing_status`: `uninvoiced`, `drafted`, `invoiced`
       - `reimbursement_status`: `unreimbursed`, `reimbursed`
       - `invoice_id`: nullable FK to `invoices.id`
       - `invoice_line_item_id`: nullable FK to `invoice_items.id`
   - **Receipt Attachments:**
     - Secure path in S3/MinIO: `workspaces/{workspace_id}/engagements/{engagement_id}/receipts/{uuid}_{filename}`
     - Presigned read URLs with 15-minute expiration generated through authenticated API endpoints.

---

## 3. Recommended Next Implementation Steps

1. **Review and approve schema designs** for:
   - `Engagement` table & snapshot structure.
   - `Quote` expense policy extension.
   - `Expense` model & state machine.
2. **Implement `BAG-ENG-001` & `BAG-EXP-001`** in `apps/api`:
   - Add SQLAlchemy models & Alembic migration.
   - Update `QuoteCreate` / `QuoteUpdate` schemas and quote serialization presenter.
   - Connect quote acceptance to engagement creation with policy snapshotting.
3. **Write Pytest Unit & Integration Tests**:
   - Verify quote acceptance snapshots policy and ensures quotes without policy remain unaffected (`AC-013`).
