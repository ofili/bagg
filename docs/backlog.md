# Bagg — Repository-Verified Implementation Backlog

**Version:** 0.1  
**Repository:** [`ofili/bagg`](https://github.com/ofili/bagg)  
**Baseline branch:** `dev`  
**Baseline commit:** `0ff530ac8375790c08ba64a585e9d52bf4e19e4c`  
**Purpose:** Convert the target product requirements into sequenced, testable engineering work without duplicating existing functionality.

## 1. Repository baseline

The following paths were verified against the repository tree on `dev`.

| Area | Verified location | Backlog implication |
|---|---|---|
| Quotes | [`apps/api/app/domains/quotes`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/quotes) | Extend the existing quote lifecycle; do not create a competing quotation system. |
| Invoices | [`apps/api/app/domains/invoices`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/invoices) | Preserve existing invoicing and revision behaviour. |
| Payments | [`apps/api/app/domains/payments`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/payments) | Extend payment records and confirmation semantics rather than inventing another payment ledger. |
| Webhooks | [`apps/api/app/domains/webhooks`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/webhooks) | Reuse the existing integration boundary for provider events. |
| Clients | [`apps/api/app/domains/clients`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/clients) | Link engagements to existing clients. |
| Workspaces | [`apps/api/app/domains/workspaces`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/workspaces) | Preserve workspace ownership and tenant isolation. |
| Receipts | [`apps/api/app/domains/receipts`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/receipts) | Reuse receipt issuance where appropriate. |
| Sharing | [`apps/api/app/domains/sharing`](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/sharing) | Assess whether existing share-link infrastructure can support secure deliverable previews. |
| Storage integrations | [`apps/api/app/integrations`](https://github.com/ofili/bagg/tree/dev/apps/api/app/integrations) | Inspect the existing storage adapter before designing file-release controls. |
| Web application | [`apps/web/src/app/(app)`](https://github.com/ofili/bagg/tree/dev/apps/web/src/app/%28app%29) | Extend existing workspace navigation and pages. |
| Database migrations | [`apps/api/migrations/versions`](https://github.com/ofili/bagg/tree/dev/apps/api/migrations/versions) | Add schema changes through the existing Alembic migration chain. |
| Backend tests | [`apps/api/tests`](https://github.com/ofili/bagg/tree/dev/apps/api/tests) | Extend the current test suite and fixtures. |
| Product requirements | [`Bagg PRD v0.1.md`](https://github.com/ofili/bagg/blob/dev/Bagg%20PRD%20v0.1.md) | Existing repository PRD describes the original invoicing-centred scope; reconcile it with the newer target PRD before treating either as final. |

**Evidence limitation:** this verifies the repository structure and selected files, not every implementation detail. A directory existing does not establish that its workflows are complete. The tasks below deliberately include code inspection and behaviour tests before expanding existing domains.

## 2. Backlog conventions

- **P0:** prerequisite, financial correctness, or security-critical work.
- **P1:** core engagement and delivery capability.
- **P2:** repeatability and integrations.
- **Status:** `Verification required` means implementation completeness has not been established.
- Each card should deliver one coherent, independently reviewable change.
- Every new database entity must have an explicit tenant-ownership model, migration, indexes and constraints, and appropriate tests.
- Proposed paths below are targets, not claims that these files already exist.

## 3. Workstream A — Existing-system verification and hardening

### BAG-FOUND-001 — Verify the current quote-to-invoice lifecycle

**Priority:** P0  
**Status:** Verification required  
**PRD traceability:** Quotes, agreements, invoice conversion, lifecycle integrity

**Existing code:** `apps/api/app/domains/quotes/`, `apps/api/app/domains/invoices/`

**Work**
- Trace quote creation, sending, acceptance, rejection, revision and conversion into an invoice.
- Identify which acceptance evidence and terms are persisted.
- Verify that accepted terms cannot be silently rewritten by subsequent quote edits.
- Document existing state transitions and identify gaps before adding an engagement aggregate.

**Acceptance criteria**
- A documented state-transition map is linked to the relevant service, model and API code.
- Tests cover valid and invalid transitions.
- Existing invoice conversion behaviour is preserved.
- Any missing agreement or acceptance evidence is recorded as a separate follow-up task.

**Dependencies:** None.

### BAG-FOUND-002 — Verify payment authority and idempotency

**Priority:** P0  
**Status:** Recent security work requires verification  
**PRD traceability:** Verified payment, partial payment, release eligibility

**Existing code:** `apps/api/app/domains/payments/`, `apps/api/app/domains/webhooks/`

**Existing tests:** `test_payments.py`, `test_payment_claims.py`, `test_invoice_payment_webhook.py`, `test_webhook_security.py`

**Work**
- Trace provider webhook processing through to the authoritative payment and invoice state.
- Verify the recent Paystack signature-verification and idempotency changes.
- Determine whether duplicate events, concurrent confirmations, partial payments, and provider reversals are handled correctly.
- Establish which payment states constitute confirmed funds.

**Acceptance criteria**
- Replayed events cannot double-count a payment.
- Concurrent processing cannot cause an incorrect paid balance.
- A client payment claim cannot independently establish that funds were received.
- Payment reversal behaviour is explicit and tested.
- Flutterwave behaviour is documented as implemented, incomplete or unsupported based on the actual code.

**Dependencies:** None. Required before implementing automatic file release.

### BAG-FOUND-003 — Verify authentication, tenant isolation and production configuration

**Priority:** P0  
**Status:** Verification required  
**PRD traceability:** Security, workspace isolation, data protection

**Existing code:** `apps/api/app/domains/auth/`, `apps/api/app/domains/workspaces/`, `apps/api/app/core/`

**Work**
- Inspect the current authentication and session lifecycle.
- Verify that production configuration rejects development-only authentication shortcuts and insecure cookie settings.
- Test that workspace-owned records cannot be accessed across tenants.
- Review public share tokens and storage access paths for unintended disclosure.

**Acceptance criteria**
- Unauthenticated requests cannot reach protected workspace operations.
- A user from workspace A cannot read or modify workspace B's records by substituting identifiers.
- Development-only authentication behaviour is unavailable in production.
- Public access is limited to the explicitly intended share-link functionality.

**Dependencies:** None.

### BAG-FOUND-004 — Establish the baseline migration and regression suite

**Priority:** P0  
**Status:** Verification required

**Existing code:** `apps/api/migrations/versions/`, `apps/api/tests/`, `e2e/`

**Work**
- Run the backend test suite and the existing end-to-end smoke suite in an appropriate environment.
- Validate migration upgrade from an empty database and from the supported current schema.
- Record current failures separately from failures introduced by new work.
- Confirm the migration revision chain before adding new tables.

**Acceptance criteria**
- Baseline test results and known failures are documented.
- Migration upgrade succeeds against PostgreSQL.
- The test commands and environment assumptions are recorded.
- New work is not marked as passing solely because tests were added.

**Dependencies:** None; should run alongside BAG-FOUND-001 through BAG-FOUND-003.

## 4. Workstream B — Engagement foundation

### BAG-ENG-001 — Define and migrate the engagement aggregate

**Priority:** P1  
**Status:** New capability; verify model conventions first  
**PRD traceability:** Engagements, one-off projects, retainers

**Proposed locations**
- `apps/api/app/domains/engagements/`
- New Alembic migration under `apps/api/migrations/versions/`

**Work**
- Introduce an engagement as the record of agreed work between a workspace and a client.
- Link it to an existing client and, where applicable, an accepted quote or agreement.
- Support both one-off engagements and ongoing retainers.
- Allow an engagement to exist without an invoice, because work can precede billing.
- Define lifecycle states and permitted transitions before exposing API endpoints.

**Acceptance criteria**
- Engagement records are workspace-scoped and reference existing clients.
- One-off and retainer engagements are represented without separate, duplicative client-work systems.
- An engagement may exist without a quote or invoice.
- Invalid state transitions are rejected.
- Existing quotes, invoices and payments remain usable without requiring every historical record to have an engagement.

**Dependencies:** BAG-FOUND-001, BAG-FOUND-003, BAG-FOUND-004.

### BAG-ENG-002 — Link accepted commercial terms to an engagement

**Priority:** P1  
**Status:** New workflow; existing acceptance mechanics need verification  
**PRD traceability:** Agreement, quote acceptance, commercial history

**Proposed locations:** Engagement and quote service layers.

**Work**
- Create an engagement from an accepted quote or explicit agreement action.
- Preserve a snapshot of the accepted scope, amount, currency and relevant terms.
- Keep subsequent quote revisions distinct from already accepted terms.
- Prevent duplicate engagement creation from repeated acceptance events.

**Acceptance criteria**
- Accepted terms remain reconstructable even if the original quote is later revised.
- Repeated requests cannot create duplicate engagements for the same acceptance event.
- The source quote and engagement remain traceably linked.
- Existing quote-to-invoice conversion is not broken.

**Dependencies:** BAG-ENG-001, BAG-FOUND-001, BAG-FOUND-002.

### BAG-ENG-003 — Add engagement workspace navigation and detail view

**Priority:** P1  
**Status:** New frontend capability

**Existing code:** `apps/web/src/app/(app)/`, existing quote, invoice and client routes.

**Proposed location:** `apps/web/src/app/(app)/engagements/`

**Work**
- Add an engagements list and detail page.
- Show the client, engagement type, agreed scope, current status, associated invoices and upcoming work.
- Keep invoices and payments linked to their existing screens and services.

**Acceptance criteria**
- Users can view and navigate from an engagement to its related commercial records.
- Empty states guide users toward creating an engagement from an accepted quote or creating an appropriate standalone engagement.
- Loading, error and empty states are implemented.
- Navigation follows existing authentication and workspace access rules.

**Dependencies:** BAG-ENG-001, BAG-ENG-002.

## 5. Workstream C — Deliverables, versions and approval

### BAG-DEL-001 — Implement deliverable records and version history

**Priority:** P1  
**Status:** New capability  
**PRD traceability:** Delivery plans, deliverables, deliverable versions

**Proposed location:** `apps/api/app/domains/deliverables/`

**Work**
- Model deliverables under an engagement.
- Store version metadata and references to the actual stored files.
- Separate internal delivery status from client approval.
- Record who uploaded a version, when it was created and which version supersedes it.
- Do not duplicate large file contents in relational database rows.

**Acceptance criteria**
- Every deliverable belongs to an engagement and workspace.
- Versions are individually identifiable and historical versions remain auditable.
- A new version does not silently overwrite the approval state of an earlier version.
- Storage references are checked for tenant ownership and authorised access.

**Dependencies:** BAG-ENG-001, BAG-FOUND-003.

### BAG-DEL-002 — Implement version-specific client feedback and approval

**Priority:** P1  
**Status:** New capability  
**PRD traceability:** Client feedback, approval, delivery lifecycle

**Work**
- Allow clients to preview authorised deliverables through a secure link.
- Capture comments and an explicit approve-or-request-changes decision.
- Bind every decision to a specific deliverable version.
- Keep approval separate from payment status.

**Acceptance criteria**
- Approval identifies the exact version approved.
- A newer version requires its own approval.
- An unauthorised client cannot access another client's deliverables.
- A client approval never independently authorises paid-file release.

**Dependencies:** BAG-DEL-001, BAG-FOUND-003.

### BAG-DEL-003 — Add scope-change requests and change-order approval

**Priority:** P1  
**Status:** New capability  
**PRD traceability:** Scope changes, commercial terms, approval

**Work**
- Allow a client or service provider to propose a scope change.
- Record the requested change, rationale, commercial impact and decision.
- Require explicit acceptance before changing the engagement's agreed scope.
- Where a change affects price or payment terms, preserve the prior terms and connect the change to the appropriate quote or billing action.

**Acceptance criteria**
- Proposed changes do not silently mutate the accepted scope.
- Accepted changes have attributable approval evidence and an effective date.
- Declined changes remain in the history.
- Any resulting additional charge is traceable to the commercial change.

**Dependencies:** BAG-ENG-002, BAG-DEL-001.

## 6. Workstream D — Payment-conditioned file release

### BAG-REL-001 — Define release policies and eligibility evaluation

**Priority:** P0 before any automated release; implementation follows the delivery foundation  
**Status:** New capability  
**PRD traceability:** Release policy, payment-conditioned handover

**Proposed location:** `apps/api/app/domains/releases/`

**Work**
- Define configurable release conditions, such as approved version, minimum amount received and required payment milestones.
- Support full-payment and explicitly configured partial-payment conditions.
- Evaluate eligibility from authoritative payment records and version-specific approval records.
- Record which policy version and evidence were used for each decision.

**Acceptance criteria**
- Release eligibility is a deterministic decision, not a frontend-only condition.
- Client claims and unverified payment events cannot satisfy payment requirements.
- Partial payment only permits release when the configured policy explicitly allows it.
- Every decision records its outcome and reason.

**Dependencies:** BAG-FOUND-002, BAG-DEL-002.

### BAG-REL-002 — Enforce secure file access and record release events

**Priority:** P0 before enabling automated release  
**Status:** New capability; storage adapter suitability must be verified  
**PRD traceability:** Secure access, automatic release, auditability

**Existing code:** `apps/api/app/integrations/`, `apps/api/app/domains/sharing/`

**Work**
- Determine which storage capabilities can reliably restrict access to original files.
- Keep preview access separate from original or final-file access.
- Implement a release operation that evaluates eligibility, applies the storage permission change or issues a suitably constrained access mechanism, verifies the outcome and records an audit event.
- Handle retries safely and make repeated release requests idempotent.

**Acceptance criteria**
- Final files remain inaccessible until all configured release conditions are satisfied.
- The system does not record a successful release if the storage operation fails.
- A repeated request cannot create conflicting release events or unsafe duplicate access grants.
- Providers that cannot enforce the required access policy are not presented as securely supported.
- Failed release operations are observable and recoverable.

**Dependencies:** BAG-REL-001, BAG-DEL-001, BAG-FOUND-003.

### BAG-REL-003 — Connect confirmed payments to release evaluation

**Priority:** P0 before automated release  
**Status:** New orchestration capability  
**PRD traceability:** Verified payment, automatic release, notifications

**Work**
- Trigger release eligibility evaluation after a payment is authoritatively confirmed.
- Handle duplicate, delayed and out-of-order provider events.
- Support authorised manual payment confirmation through the same eligibility mechanism.
- Notify the client and service provider only after the relevant action has succeeded.

**Acceptance criteria**
- A confirmed payment can trigger an eligible release without manual reprocessing.
- A payment claim alone cannot trigger release.
- Notification failure does not roll back a confirmed payment or corrupt release state.
- A storage failure leaves the release pending or failed, with an explicit retry path.
- Payment reversals follow a documented post-release policy rather than pretending that previously accessed files can be recalled.

**Dependencies:** BAG-FOUND-002, BAG-REL-001, BAG-REL-002.

## 7. Workstream E — Retainers and handover

### BAG-RET-001 — Implement retainer periods and recurring billing schedules

**Priority:** P1  
**Status:** New capability  
**PRD traceability:** Retainer engagements, billing schedules

**Work**
- Add retainer periods under an engagement.
- Record period start and end, fee, currency, status and billing schedule.
- Generate or prepare invoices using the existing invoice system.
- Prevent duplicate invoice creation when a scheduled job retries.

**Acceptance criteria**
- A retainer can have multiple periods under one engagement.
- Each billing period is identifiable and cannot accidentally be billed twice.
- Existing invoice totals and payment semantics remain authoritative.
- Failed billing attempts are observable and safe to retry.

**Dependencies:** BAG-ENG-001, BAG-FOUND-002.

### BAG-HAND-001 — Implement engagement closure and handover

**Priority:** P1  
**Status:** New capability  
**PRD traceability:** Completion, final delivery, handover

**Work**
- Define closure criteria for one-off and retainer engagements.
- Record final deliverable versions, outstanding obligations, release outcomes and closure time.
- Preserve access to authorised historical records without reopening completed commercial states.
- Make unresolved payment or delivery exceptions visible before closure.

**Acceptance criteria**
- Closure cannot silently bypass required release conditions.
- Outstanding obligations are visible before final closure.
- Historical approvals, payments and release events remain available for audit.
- Retainer periods can conclude without deleting the parent engagement's history.

**Dependencies:** BAG-DEL-001, BAG-REL-002, BAG-RET-001.

## 8. Workstream F — Client experience and end-to-end assurance

### BAG-UX-001 — Add the client engagement and delivery experience

**Priority:** P1  
**Status:** New frontend capability

**Work**
- Extend the existing public client experience to show engagement scope, deliverable versions, feedback, approvals, payment requirements and permitted downloads.
- Reuse existing client-facing invoice and sharing patterns where appropriate.
- Ensure that internal-only notes and other clients' records never appear in public views.

**Acceptance criteria**
- Clients can review and respond to a deliverable without creating an unnecessary account.
- Approval and payment states are visibly distinct.
- Locked files explain the outstanding condition without exposing the protected file.
- Expired or revoked links fail closed.

**Dependencies:** BAG-DEL-002, BAG-REL-001, BAG-REL-002.

### BAG-E2E-001 — Add the complete engagement-to-release acceptance suite

**Priority:** P0 before release automation is considered ready  
**Status:** New tests

**Existing code:** `e2e/`, `apps/api/tests/`

**Work**
- Add end-to-end scenarios covering accepted quote, engagement creation, deliverable upload, version-specific approval, payment confirmation and authorised file release.
- Test blocked release, partial payment, replayed webhook, storage failure, cross-tenant access and retry recovery.
- Keep provider integrations testable with controlled fixtures or sandbox events.

**Acceptance criteria**
- An eligible engagement completes the intended workflow from agreement to release.
- Ineligible or unauthorised cases fail safely.
- Payment and release records remain consistent through retries.
- The suite runs in CI with documented environment requirements.

**Dependencies:** BAG-FOUND-004 and the relevant implementation cards.

## 9. Recommended execution order

| Order | Cards | Exit condition |
|---|---|---|
| 0. Verify | FOUND-001 to FOUND-004 | Existing behaviour, security baseline and migration chain are documented and tested. |
| 1. Engagement foundation | ENG-001 to ENG-003 | An accepted quote can create a workspace-scoped engagement and users can view it. |
| 2. Delivery | DEL-001 to DEL-003 | Version history, explicit approval and scope changes are traceable. |
| 3. Release controls | REL-001 to REL-003 | Payment and approval jointly govern a secure, auditable release. |
| 4. Repeatability | RET-001, HAND-001 | Retainers, recurring periods and closure have explicit lifecycle rules. |
| 5. Client experience and assurance | UX-001, E2E-001 | The complete workflow is tested end to end. |

## 10. Cross-cutting implementation rules

1. **Reuse the existing financial system.** Do not create a parallel invoice or payment ledger for engagements.
2. **Preserve historical truth.** Accepted terms, deliverable versions, client decisions, payment evidence and release events must remain reconstructable.
3. **Separate states.** Engagement completion, deliverable approval, payment confirmation and file release are different facts.
4. **Enforce access on the server and storage layer.** Hiding a download button is not access control.
5. **Make asynchronous actions idempotent.** Webhook replay, job retries and client resubmission must not create duplicate financial or release effects.
6. **Migrate deliberately.** New entities need migrations, constraints, indexes and a safe relationship to historical invoices and quotes.
7. **Keep the product narrow.** Do not expand this backlog into general accounting, payroll, inventory or a full project-management suite.
8. **Do not declare production readiness from code presence.** Readiness requires passing tests, validated migrations, working provider behaviour and deployment verification.

## 11. Decisions required before implementation cards are finalised

- Whether engagements can be created directly without a quote, and which minimum terms must then be captured.
- Which partial-payment release policies are supported in the first release.
- Which storage providers can securely enforce preview-versus-original access.
- What happens operationally when payment is reversed after a file has been released.
- Whether recurring retainers automatically send invoices or initially create drafts for user review.
- Whether approval of a deliverable is sufficient for handover or whether an engagement-specific acceptance step is required.

**Deliverable status:** This is a repository-informed implementation backlog proposal, not a claim that these changes have been implemented. The repository write was blocked by GitHub integration permissions, and the baseline test suite has not been run in this task.
