# Bagg — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft for product and engineering review  
**Product:** Bagg  
**Repository:** [github.com/ofili/bagg](https://github.com/ofili/bagg)  
**Baseline branch assessed:** `dev`  
**Document purpose:** Define the product requirements that will guide design, engineering, testing, and release planning.

---

## 1. Product overview

### 1.1 What is Bagg?

Bagg is a client-engagement and payment workspace for freelancers, independent professionals, and service businesses.

It helps service providers turn a commercial opportunity into an agreed scope of work, deliver the work professionally, manage client feedback and approvals, collect payments, and hand over completed work with less administrative effort.

Bagg connects five activities that are often scattered across separate tools:

1. Agree on the work and commercial terms.
2. Organise and deliver the work.
3. Capture client decisions, feedback, and approvals.
4. Invoice, collect, and confirm payments.
5. Release final deliverables and close the engagement.

The product should provide a coherent experience across these activities without attempting to replace every specialist tool a service provider uses.

### 1.2 Product positioning

**Working positioning statement:**

Bagg helps service businesses quote, deliver, and get paid—all in one place.

The product should be particularly useful for people who currently combine invoicing software, WhatsApp, email, spreadsheets, cloud storage, creative tools, and manual payment follow-ups to manage a client engagement.

### 1.3 Product vision

Make Bagg the workspace a service provider uses to manage the commercial and delivery lifecycle of client work, from the first proposal to final handover.

### 1.4 Product mission

Reduce the administrative burden, payment uncertainty, scope disputes, and fragmented communication that make independent service delivery harder than it needs to be.

### 1.5 Product outcomes

Bagg should enable users to:

- Create professional quotes and invoices quickly.
- Establish clear scope, pricing, and payment expectations.
- Manage one-off projects and ongoing retainers.
- Give clients a simple, professional place to review work and make decisions.
- Reduce avoidable payment delays.
- Automate agreed billing and delivery actions safely.
- Release protected final files when contractual conditions are satisfied.
- Preserve a clear history of agreements, changes, approvals, payments, and handover.
- Manage more client engagements without proportionally increasing administrative work.

---

## 2. Problem statement

Independent service providers frequently manage the business side of delivery through disconnected systems.

A quote may be created in one application, accepted over WhatsApp, tracked in a spreadsheet, delivered through cloud storage, reviewed in a creative application, invoiced separately, and paid through a bank transfer or payment link.

This fragmentation creates several problems:

- The agreed scope is not always easy to distinguish from later requests.
- Providers struggle to see which engagements are commercially healthy.
- Payment schedules are disconnected from delivery progress.
- Clients provide feedback across multiple channels.
- Approvals can become ambiguous or difficult to prove.
- Final files may be released before the required payment is confirmed.
- Manual follow-ups consume time.
- Recurring clients require repetitive administrative setup.
- Handover and closure are often informal.

Bagg should connect these activities around the client engagement, while preserving specialist tools for creating, storing, and reviewing the actual work.

---

## 3. Target users

### 3.1 Primary users

**Freelancers and independent professionals**

Examples include designers, developers, photographers, videographers, writers, consultants, and other service providers who independently quote, deliver, and invoice clients.

**Small creative studios and service teams**

Small teams that manage multiple clients, deliverables, approvals, and payment obligations.

**Consultants and professional service providers**

Individuals or firms working through defined engagements, recurring retainers, advisory arrangements, or milestone-based projects.

### 3.2 Client users

The client is an essential participant in the workflow, even if they do not maintain a paid Bagg account.

Clients should be able to:

- Review proposals and commercial terms.
- Accept or decline quotes.
- View engagement status.
- Review submitted work.
- Provide feedback and request revisions.
- Approve deliverables where required.
- View invoices and payment instructions.
- Submit payment claims where supported.
- Access files released to them.
- Review handover information.

Bagg should minimise unnecessary friction for clients. Authentication requirements should depend on the sensitivity of the action and the security requirements of the resource.

### 3.3 Initial market

Nigeria is the initial market, with support for providers serving Nigerian and international clients.

The product should accommodate Nigerian payment practices and local business needs while allowing international engagements, supported currencies, and regionally appropriate pricing.

---

## 4. Product principles

### 4.1 Engagement-centred

The engagement is the organising concept for client work. Quotes, delivery plans, milestones, deliverables, invoices, payments, approvals, and handover should connect to it.

### 4.2 Financially trustworthy

Financial records must have clear states, traceable changes, reliable calculations, and auditable payment confirmation.

### 4.3 Scope must be explicit

The product must distinguish agreed work from new requests. Changes to price, deliverables, or timing should not silently overwrite accepted terms.

### 4.4 Delivery should be tool-agnostic

Bagg should coordinate work and client access without requiring users to abandon Figma, Adobe, cloud storage, Git repositories, or other specialist applications.

### 4.5 Client experience matters

Clients should be able to review, decide, and pay without navigating an unnecessarily complicated system.

### 4.6 Automate with evidence

Automation should be triggered by verifiable events and defined rules, not assumptions. Important actions must be traceable.

### 4.7 Do not become generic project-management software

Bagg should support the milestones, deliverables, feedback, approvals, and work tracking necessary to manage client engagements. It should not pursue broad task-management, workforce planning, or enterprise project portfolio management without a demonstrated need.

### 4.8 Keep distinct concepts distinct

The following are separate events or states:

- Quote acceptance is not contract execution.
- Deliverable submission is not client approval.
- Client approval is not payment.
- Payment claimed is not payment confirmed.
- Payment confirmed is not necessarily final handover.
- Engagement completion is not necessarily financial settlement.

The product must not collapse these distinctions into a single status.

---

## 5. Product scope

### 5.1 In scope

- Client and workspace management.
- Quotes and quote revisions.
- Invoices and invoice revisions.
- Payment instructions and payment confirmation.
- Receipts, reminders, and payment follow-up.
- One-off project engagements.
- Ongoing retainer engagements.
- Engagement templates.
- Milestones and deliverables.
- Client feedback and version-specific approvals.
- Scope-change requests and change orders.
- Deposits, partial payments, and payment schedules.
- Configurable billing triggers.
- Payment-conditioned release of protected files.
- Handover and engagement closure.
- Selected storage and creative-tool integrations.
- Engagement-level dashboards and notifications.
- Controlled AI-assisted workflows.
- Subscription plans and feature entitlements.

### 5.2 Out of scope for the initial product

Unless separately approved, Bagg will not attempt to become:

- A full general ledger or accounting suite.
- A payroll or HR system.
- An inventory or procurement platform.
- A broad customer relationship management system.
- A generic task-management platform.
- A creative production application.
- A replacement for cloud storage providers.
- A universal integration platform for every third-party application.
- A system that independently makes binding commercial decisions without user authorisation.

---

## 6. Core domain model

The product and technical architecture should be designed around the following concepts.

### 6.1 Workspace

The provider's account and operating boundary. It owns its clients, commercial records, engagements, configuration, and subscription.

### 6.2 Client

A customer or organisation receiving services. A client can participate in multiple engagements.

### 6.3 Quote

A commercial proposal containing scope, pricing, applicable taxes, assumptions, exclusions, and proposed payment terms.

### 6.4 Agreement

The accepted commercial baseline. It may be represented by an accepted quote alone where appropriate or supported by a separate contract.

Bagg must not imply that quote acceptance is equivalent to a legally required signed contract.

### 6.5 Engagement

The overarching record for a unit of client work.

Supported engagement types from the beginning:

- **One-off project:** a defined piece of work with a completion or handover condition.
- **Retainer:** an ongoing arrangement with recurring service periods and financial obligations.

The model should allow additional engagement types later without requiring the two initial types to be conflated.

### 6.6 Delivery plan

The structure through which an engagement's work is organised. It may contain milestones and deliverables.

### 6.7 Milestone

A meaningful delivery stage. It may have a due date, completion condition, approval requirement, and associated billing rule.

### 6.8 Deliverable

A work product promised to the client. A deliverable may link to an externally stored file, preview, or application resource.

### 6.9 Deliverable version

A particular submitted version of a deliverable. Client feedback and approval must reference the version reviewed.

### 6.10 Client decision

An explicit decision, such as quote acceptance, scope-change acceptance, or deliverable approval. Each decision must identify its subject, actor, timestamp, and relevant version where applicable.

### 6.11 Payment schedule

The agreed financial obligations for an engagement, including deposits, staged payments, milestone invoices, scheduled payments, and retainer-period charges.

### 6.12 Payment

A record of a payment claim, provider transaction, bank-transfer confirmation, or other supported settlement event. A claimed payment must be distinguishable from a confirmed payment.

### 6.13 Release policy

The conditions that must be satisfied before specified deliverables or files become accessible to the client.

### 6.14 Release event

The record of an actual access-release action, including the applicable policy, files, time, and outcome.

### 6.15 Handover

The formal completion package and closure record for an engagement, including relevant deliverables, access details, outstanding items, and applicable support arrangements.

---

## 7. Functional requirements

Priority labels:

- **P0 — Foundation:** required before the expanded product can safely depend on the capability.
- **P1 — Core product:** required for the initial engagement-centred product.
- **P2 — Differentiation:** important for the product's distinctive value.
- **P3 — Expansion:** introduce after core workflows are reliable.

### 7.1 Workspace, account, and client management

**FR-001 — Workspace setup (P0)**

Users must be able to create and configure a workspace with appropriate business identity, contact details, currency preferences, and billing configuration.

**FR-002 — Client records (P0)**

Users must be able to create, edit, search, and view client records. Client information should be reusable across quotes, invoices, and engagements.

**FR-003 — Client history (P1)**

A client view should show relevant quotes, engagements, invoices, payments, decisions, and outstanding actions.

**FR-004 — Access boundaries (P0)**

Workspace records must be isolated so that users cannot access another workspace's private information through API requests, identifiers, public links, or file references.

**FR-005 — Team roles (P1/P2)**

The system should support progressively finer permissions for actions such as editing commercial terms, confirming manual payments, changing release policies, and authorising exceptions. The precise initial role model must be confirmed during design.

### 7.2 Quotes and commercial terms

**FR-006 — Quote creation (P0)**

Users must be able to create quotes with line items, quantities, pricing, currency, relevant tax information, notes, and payment terms.

**FR-007 — Quote sharing (P0)**

Quotes must be shareable through a secure client-facing link and supported communication channels.

**FR-008 — Quote acceptance and rejection (P0)**

Clients must be able to accept or decline a quote. Bagg must record the decision, actor, timestamp, and relevant quote version.

**FR-009 — Quote revision (P0)**

Revisions must preserve prior versions. A revision must not silently modify the commercial terms of an already accepted version.

**FR-010 — Service packages and templates (P1)**

Users should be able to reuse common quote structures, services, exclusions, revision allowances, and payment arrangements.

**FR-011 — Commercial baseline (P1)**

When an engagement is created from an accepted quote, the accepted commercial terms must be linked to the engagement and remain retrievable.

**FR-012 — Contract support (P1/P2)**

The product should support recording contract status and linking relevant documents. Native e-signature functionality should be a separate scoped decision.

### 7.3 Engagement management

**FR-013 — Engagement creation (P1)**

Users must be able to create an engagement from an accepted quote or create one manually where appropriate.

**FR-014 — Engagement types (P1)**

The system must support both one-off projects and retainers from the initial engagement model.

**FR-015 — Engagement status (P1)**

Engagement status must communicate the overall state without pretending that delivery, payment, approval, and handover share one lifecycle.

**FR-016 — Delivery plan (P1)**

Users must be able to define milestones, deliverables, target dates, and relevant client decisions for an engagement.

**FR-017 — Independent work and billing (P1)**

A project must be able to exist before an invoice is issued, and an invoice must be able to exist without a project where that is appropriate. The data model must not impose a universal one-invoice-per-project rule.

**FR-018 — Engagement activity history (P1)**

The engagement must expose a chronological history of material events, including quote acceptance, scope changes, submissions, decisions, invoices, confirmed payments, releases, and closure.

### 7.4 Retainers and recurring services

**FR-019 — Retainer setup (P1)**

Users must be able to define an ongoing arrangement with a client, including service description, billing frequency, period boundaries, agreed fee, and applicable terms.

**FR-020 — Retainer periods (P1)**

Each billing or service period must be identifiable. The system must preserve the history of completed periods.

**FR-021 — Recurring invoices (P1)**

Bagg should support scheduled invoice generation for retainers. Automatic sending or charging must respect configured rules and payment-provider capabilities.

**FR-022 — Included service allowances (P1/P2)**

Where an agreement specifies a quantity of work or deliverables, the system should track usage against the allowance.

**FR-023 — Excess work and carryover (P2)**

The system should support explicit rules for additional work, unused allowances, or carryover where the contract provides for them. No carryover or extra charge should be inferred without a configured agreement.

**FR-024 — Renewal and termination (P1)**

Users must be able to record renewals, changes to terms, and termination. The product must preserve previous terms and outstanding obligations.

### 7.5 Milestones and deliverables

**FR-025 — Milestones (P1)**

Users must be able to define milestone names, descriptions, due dates, completion conditions, and relevant billing or approval requirements.

**FR-026 — Deliverable registration (P1)**

Users must be able to register a deliverable, describe it, link its location, and configure its review and release requirements.

**FR-027 — External asset links (P1)**

Deliverables must be able to reference external resources where Bagg does not store the original file itself.

**FR-028 — Version history (P1)**

The system must preserve deliverable versions and distinguish submitted versions from later revisions.

**FR-029 — Client review (P1)**

Clients must be able to review a submitted deliverable through an appropriate preview, embedded resource, or supported external link.

**FR-030 — Feedback (P1)**

Clients must be able to provide feedback linked to the deliverable or version under review.

**FR-031 — Explicit approval (P1)**

Where approval is required, clients must be able to approve or request changes to the submitted version. Bagg must record the decision and version.

**FR-032 — Revision allowances (P1)**

Where the agreement defines included revisions, Bagg should track them and make the remaining allowance visible to the provider.

### 7.6 Scope changes

**FR-033 — Scope-change request (P1)**

The provider or client must be able to record a proposed change to deliverables, price, timeline, assumptions, or other agreed obligations.

**FR-034 — Change assessment (P1)**

The provider must be able to document the commercial and delivery impact of a proposed change.

**FR-035 — Change approval (P1)**

A change that alters agreed terms must not be treated as accepted until the required acceptance is recorded.

**FR-036 — Change history (P1)**

Accepted changes must preserve the original agreement and create an auditable record of the updated obligations.

**FR-037 — Billing implications (P1)**

Where an accepted change creates an additional financial obligation, Bagg should update the payment schedule or prompt the provider to issue the required invoice.

### 7.7 Invoicing and payment schedules

**FR-038 — Invoice creation (P0)**

The existing invoice workflow must remain available independently of engagement management.

**FR-039 — Payment schedules (P1)**

Users must be able to define agreed payment obligations such as:

- Deposit before work begins.
- A fixed amount at a specified milestone.
- A percentage at a defined stage.
- A scheduled payment on an agreed date.
- A recurring retainer-period payment.
- Final payment before specified files are released.

**FR-040 — Billing triggers (P1)**

Users must be able to configure supported events that prompt or generate invoices. The system must distinguish invoice creation from invoice sending and payment collection.

**FR-041 — Manual confirmation (P0)**

Authorised users must be able to confirm supported offline payments. Bagg must record the confirmer, amount, currency, timestamp, and relevant evidence.

**FR-042 — Provider-confirmed payments (P0)**

Payment-provider events must be verified before they change authoritative payment state.

**FR-043 — Partial payments (P0)**

The system must accurately record partial settlements, outstanding balances, and fully settled obligations.

**FR-044 — Receipts (P0)**

A receipt must be generated or made available for a confirmed payment according to the applicable payment and receipt rules.

**FR-045 — Reminders (P0/P1)**

Bagg must support reminders for unpaid invoices and relevant upcoming or overdue payment obligations.

**FR-046 — Financial history (P0)**

Financial state changes must be auditable. A payment correction, reversal, or adjustment must not silently erase the original event.

### 7.8 Payment-conditioned file release

**FR-047 — Configurable release policy (P2)**

A provider must be able to configure whether selected deliverables are released upon approval, payment confirmation, or satisfaction of multiple conditions.

**FR-048 — Protected deliverables (P2)**

The provider must be able to distinguish preview resources from protected original files or final deliverables.

**FR-049 — Payment condition (P2)**

A release policy may require a particular invoice or financial obligation to be fully settled, rather than merely requiring an arbitrary payment event.

**FR-050 — Confirmed-payment trigger (P2)**

Where the release policy requires payment, Bagg must trigger release only after the required payment is confirmed by an authorised, trusted process.

**FR-051 — Approval condition (P2)**

Where the policy requires client approval, Bagg must confirm that the required deliverable version has been approved.

**FR-052 — Release execution (P2)**

After all configured conditions are satisfied, Bagg should automatically grant the intended access where the underlying storage or provider supports secure access control.

**FR-053 — Release verification (P2)**

Bagg must verify that the intended access change succeeded. A failed permission update must not be recorded as a successful release.

**FR-054 — Release audit trail (P2)**

The system must record the deliverable, applicable policy, triggering event, access action, timestamp, and outcome.

**FR-055 — Exception handling (P2)**

An authorised provider must be able to grant an explicitly permitted exception, with a recorded reason and actor. Exceptions must not silently disable the policy.

**FR-056 — Access revocation and expiry (P2)**

Where supported, the system should provide appropriate access expiry or revocation controls. Their behaviour must be consistent with the underlying provider's actual capabilities.

### 7.9 Handover and closure

**FR-057 — Handover checklist (P1/P2)**

Users should be able to define the final materials and actions required for handover.

**FR-058 — Outstanding obligations (P1)**

Bagg must show outstanding approvals, invoices, payments, and handover items independently.

**FR-059 — Final handover (P2)**

The provider should be able to record that the agreed handover package has been delivered and identify what was included.

**FR-060 — Engagement closure (P1)**

An engagement may be marked complete only according to its configured lifecycle rules. Completion must not erase outstanding financial obligations or historical records.

**FR-061 — Post-delivery support (P2)**

Where agreed, the engagement may include a warranty, support window, or follow-up obligation.

### 7.10 Integrations

**FR-062 — Storage integration framework (P2)**

Bagg should support selected storage providers through authorised connections or secure link-based workflows.

**FR-063 — Capability-aware integration (P2)**

Bagg must distinguish what an integration can actually do: preview, download, permission changes, access revocation, or event notifications.

**FR-064 — Safe fallback (P2)**

If a provider does not support the required secure preview or release behaviour, Bagg must not claim that it has enforced the policy. It should offer an appropriate fallback, such as a secure Bagg-hosted upload, an authorised manual release workflow, or a clear limitation.

**FR-065 — Creative and development tools (P3)**

Integrations with tools such as Figma, Canva, Adobe products, GitHub, and GitLab should be prioritised by user demand and feasible permission controls.

### 7.11 AI-assisted workflows

**FR-066 — Quote assistance (P3)**

AI may draft a quote from a provider's brief, service template, or client requirements. The provider must review the result before it becomes an offer.

**FR-067 — Scope-gap assistance (P3)**

AI may identify missing assumptions, unclear deliverables, or potential scope ambiguities.

**FR-068 — Feedback summaries (P3)**

AI may summarise client feedback and group related revision requests while preserving links to the original comments.

**FR-069 — Progress-update drafting (P3)**

AI may draft client updates based on recorded engagement events. It must not invent completed work or make unsupported commitments.

**FR-070 — Controlled automation (P3)**

AI-generated suggestions must not independently confirm payment, approve commercial changes, waive release conditions, or expose protected files without explicit authorisation and the required system checks.

### 7.12 Dashboards and reporting

**FR-071 — Financial dashboard (P0)**

Preserve the existing financial dashboard and ensure its figures remain consistent with authoritative invoice and payment records.

**FR-072 — Engagement dashboard (P1)**

Show active engagements, upcoming milestones, outstanding client decisions, and required provider actions.

**FR-073 — Collections dashboard (P1)**

Show outstanding invoices, overdue balances, upcoming obligations, and confirmed collections.

**FR-074 — Retainer overview (P1)**

Show active retainers, current periods, recurring billing status, and relevant allowance usage.

**FR-075 — Release and handover readiness (P2)**

Show deliverables awaiting approval, releases blocked by unmet conditions, failed release attempts, and outstanding handover items.

**FR-076 — Operational history (P1/P2)**

Users should be able to inspect important events and identify why a workflow has or has not progressed.

### 7.13 Notifications

**FR-077 — Event notifications (P1)**

Notify relevant participants about quote decisions, new feedback, approval requests, scope changes, invoice events, payment confirmation, release completion, and overdue obligations.

**FR-078 — Notification failure handling (P1)**

A failed email or other notification must not incorrectly reverse a confirmed payment or release event. Delivery status should be tracked independently.

**FR-079 — Notification preferences (P2)**

Providers should be able to configure supported notification channels and frequencies without disabling essential security or financial notifications.

---

## 8. Core end-to-end workflows

### 8.1 One-off project

1. Provider creates a client record or selects an existing client.
2. Provider creates a quote using a service template or manual entry.
3. Client reviews the quote and accepts or declines it.
4. Where required, the parties execute a separate contract.
5. Provider creates or activates the engagement.
6. Bagg establishes the agreed delivery plan and payment schedule.
7. Provider submits deliverables for review.
8. Client provides feedback or approves the relevant version.
9. Provider completes any agreed revisions.
10. Bagg generates or prompts for invoices according to the payment schedule.
11. Payments are confirmed and receipts are made available.
12. Bagg releases protected files when the configured conditions are satisfied.
13. Provider completes handover and closes the engagement.

The workflow must permit appropriate variations. For example, some providers may require a deposit before beginning work, while others may invoice on delivery.

### 8.2 Ongoing retainer

1. Provider agrees the retainer terms with the client.
2. Bagg records the recurring service arrangement.
3. A retainer period begins according to the agreed schedule.
4. Bagg tracks applicable deliverables or included allowances.
5. Provider performs and records the agreed work.
6. Bagg generates or prompts for the period's invoice.
7. Client pays and the payment is confirmed.
8. The period is completed and its history preserved.
9. The next period begins, or the retainer is renewed, amended, or terminated.

The product must not assume unused work rolls over, extra work incurs charges, or a retainer renews automatically unless the applicable terms and configuration say so.

### 8.3 Scope change

1. A client or provider proposes a change.
2. Bagg records the affected deliverables, price, timing, and assumptions.
3. The provider evaluates the impact.
4. The updated terms are presented to the relevant party.
5. The required acceptance is recorded.
6. The engagement's obligations are updated while retaining the original terms.
7. Any required invoice or payment-schedule update is made.
8. The new scope becomes the operative scope according to the agreed change.

Unaccepted changes must remain distinguishable from agreed work.

### 8.4 Payment-conditioned file release

1. Provider registers the final deliverable and its protected file or resource.
2. Provider defines the release policy.
3. Client receives an appropriate preview.
4. Client approves the required version, if approval is a condition.
5. The required invoice or obligation is settled.
6. Bagg receives and verifies a trusted payment-confirmation event, or an authorised user confirms an offline payment.
7. Bagg evaluates all release conditions.
8. Bagg grants access using the underlying provider's supported access-control mechanism.
9. Bagg verifies the outcome and records the release event.
10. The client is notified.

If payment is only partially settled, approval is missing, or the permission update fails, the system must not report the release as successful.

### 8.5 Invoice-only workflow

A provider must still be able to create and send an invoice without creating a project or retainer. The engagement model must extend the existing product, not make all invoicing dependent on a project record.

---

## 9. Business rules and state management

### 9.1 Separate lifecycle states

Bagg must maintain separate states for:

- Engagement.
- Milestone.
- Deliverable and deliverable version.
- Client approval.
- Quote and agreement.
- Invoice.
- Payment.
- Retainer period.
- File release.
- Handover.

A single overall engagement status may summarise these states, but must not replace them.

### 9.2 Payment authority

Only a trusted payment-provider confirmation, verified settlement record, or authorised manual confirmation can establish the relevant confirmed-payment state.

A client-submitted claim or uploaded proof must not automatically count as confirmed payment unless a separately approved verification process explicitly establishes that behaviour.

### 9.3 Release eligibility

A file-release decision must evaluate the configured conditions against authoritative records. The system must not rely on a client-visible status label alone.

### 9.4 Immutable history

Accepted commercial terms, confirmed payment events, approval decisions, and release events must be preserved. Corrections must be represented through controlled amendments, reversals, or new events as appropriate.

### 9.5 Currency and precision

Financial calculations must use appropriate decimal or integer-minor-unit representations. Floating-point arithmetic must not be the authority for invoice totals, payment allocations, balances, or release eligibility.

### 9.6 Time and dates

Payment schedules, deadlines, and retainer periods must have consistent timezone handling. The system must not generate duplicate invoices or periods because of retries, daylight-saving changes, or job restarts.

### 9.7 External-provider limitations

Bagg must not promise to revoke, expire, or grant access to an externally hosted file when the connected provider does not expose the required capability or the user has not authorised it.

---

## 10. Security, privacy, and reliability requirements

**NFR-001 — Tenant isolation**

All private workspace data and operations must enforce workspace ownership at the server side.

**NFR-002 — Authentication**

Production authentication must not expose development login codes or rely on development fallback behaviour. Session handling and cookie settings must be appropriate for the production deployment.

**NFR-003 — Authorisation**

Sensitive operations must verify that the actor has permission to perform the action on the specific resource.

**NFR-004 — Webhook integrity**

Provider webhooks must be authenticated using the provider's supported verification mechanism. Event processing must handle duplicates, retries, and concurrent delivery safely.

**NFR-005 — Idempotency**

Retries must not create duplicate confirmed payments, receipts, invoices, retainer charges, or file releases.

**NFR-006 — Auditability**

Important commercial, financial, approval, and access-control events must be attributable and inspectable.

**NFR-007 — File access security**

Protected files must not be exposed through predictable public URLs or unrestricted storage objects. Signed URLs, where used, must have appropriate scope and expiry. Any release policy must be enforced at the actual access boundary.

**NFR-008 — Data minimisation**

Bagg should collect only the personal and financial information needed for the relevant workflow, with appropriate retention and deletion rules.

**NFR-009 — Recovery and failure handling**

A temporary failure in a payment provider, storage provider, notification service, or worker must not corrupt authoritative business state. Retriable actions must have safe retry behaviour.

**NFR-010 — Observability**

The system should expose sufficient structured logs, operational events, and error reporting to investigate failed payments, duplicate events, blocked releases, and delivery failures without exposing secrets.

**NFR-011 — Accessibility and usability**

Core quote, invoice, approval, and payment workflows should be usable on mobile devices and accessible to users with common assistive technologies.

**NFR-012 — Performance**

Common operations—including opening an engagement, reviewing an invoice, and checking a release condition—should remain responsive under the expected initial workload. Numeric service-level targets should be agreed before production release.

---

## 11. Acceptance criteria for critical workflows

### AC-001 — Quote acceptance

Given a quote shared with a client, when the client accepts it, Bagg records the accepted version, decision, actor, and timestamp. A subsequent revision does not silently overwrite the accepted version.

### AC-002 — Engagement creation

Given an accepted quote, when the provider creates an engagement, Bagg links the engagement to the accepted commercial terms and preserves the source quote. A provider can also manage an invoice without an engagement.

### AC-003 — Retainer periods

Given an active retainer, when a new period begins, Bagg creates or activates the correct period without duplicating it after retries. Completed periods remain accessible as history.

### AC-004 — Scope change

Given an active engagement, when a change is proposed, the original terms remain intact. Only an accepted change becomes part of the operative scope.

### AC-005 — Payment confirmation

Given a payment-provider event, Bagg verifies the event and processes it idempotently. Duplicate or replayed events do not create duplicate settlements or receipts.

### AC-006 — Partial payment

Given an invoice with a balance outstanding, when a valid partial payment is confirmed, Bagg updates the settled amount and remaining balance correctly without marking the invoice fully paid prematurely.

### AC-007 — Version-specific approval

Given a deliverable with multiple versions, when the client approves one version, Bagg records that exact version. A later version does not inherit the earlier approval unless the configured policy explicitly permits it.

### AC-008 — Release remains blocked

Given a release policy requiring approval and full settlement, when either condition is missing, the protected file remains inaccessible through the release mechanism.

### AC-009 — Automatic release

Given a valid approval and confirmed settlement satisfying the configured policy, when the release process executes, Bagg grants access, verifies the outcome, records the release event, and notifies the client. If access granting fails, the release remains visibly unsuccessful or pending.

### AC-010 — Manual payment confirmation

Given an authorised provider user and a supported offline payment, when that user confirms the payment, Bagg records the actor, amount, currency, timestamp, and available evidence. An unauthorised user cannot perform the same action.

### AC-011 — Handover

Given an engagement with final deliverables and outstanding obligations, Bagg displays those states separately. The provider can record handover without losing the record of outstanding invoices or other obligations.

### AC-012 — Tenant isolation

Given two unrelated workspaces, a user in one workspace cannot access the other workspace's private engagement, invoice, payment, or file-release records by changing a URL or API identifier.

---

## 12. Product analytics and success metrics

Bagg should measure whether it helps providers manage engagements and collect money more effectively.

### Activation

- Percentage of new workspaces that create their first quote.
- Percentage that send their first invoice.
- Percentage that create their first engagement.
- Time from registration to first commercial document sent.

### Commercial effectiveness

- Quote acceptance rate.
- Time from quote creation to acceptance.
- Percentage of engagements with explicitly recorded scope and payment terms.
- Frequency of scope-change requests and their outcomes.

### Collections

- Time from invoice issue to confirmed payment.
- Percentage of invoices paid by their due dates.
- Outstanding and overdue balances.
- Percentage of payments confirmed automatically versus manually.

### Delivery

- Percentage of engagements using milestones or deliverables.
- Time from deliverable submission to client decision.
- Revision frequency relative to the agreed allowance.
- Percentage of engagements with a recorded handover.

### Automation and reliability

- Successful versus failed payment-confirmation events.
- Duplicate financial events prevented.
- Successful versus failed file-release attempts.
- Number of release attempts blocked by unmet conditions.
- Notification delivery and retry rates.

Metrics should be interpreted carefully. For example, a high approval rate is not automatically a better outcome if providers are pressuring clients to approve incomplete work.

---

## 13. Pricing and entitlements

The current product context includes Free, ₦25,000/year, and ₦60,000/year plans. These should be treated as the existing pricing baseline, not as a final commercial decision.

The expanded product will need a deliberate entitlement model covering areas such as:

- Quote and invoice limits.
- Number of active engagements.
- Retainer and recurring billing capabilities.
- Templates and automation.
- Storage and external integrations.
- AI-assisted capabilities.
- Team access and collaboration.
- Advanced reporting and audit history.

Pricing should reflect the value of the product and the needs of Nigerian and international users. International pricing should be designed for the market rather than calculated solely by converting naira prices at the prevailing exchange rate.

Final tier names, limits, and prices should be validated separately from the functional PRD.

---

## 14. Delivery phases

### Phase 0 — Verify and secure the existing product

- Establish a passing baseline for the existing test suites.
- Review production authentication and workspace isolation.
- Verify payment-provider event handling and idempotency.
- Validate invoice balances, receipts, and revision rules.
- Review existing subscription and quota behaviour.
- Identify and resolve critical security or financial correctness gaps.

**Exit condition:** The team can demonstrate the existing quote, invoice, payment, reminder, and receipt workflows with documented failure behaviour.

### Phase 1 — Engagement foundation

- Introduce the engagement model.
- Support one-off projects and retainers.
- Connect accepted quotes and commercial terms to engagements.
- Add milestones, deliverables, and payment schedules.
- Preserve invoice-only workflows.
- Add a basic engagement dashboard and activity history.

**Exit condition:** A provider can manage a one-off project and a retainer, each connected to commercial terms and financial obligations.

### Phase 2 — Client delivery and scope control

- Introduce the client engagement workspace.
- Add deliverable versions, feedback, and explicit approval.
- Add revision allowances.
- Add scope-change requests and acceptance.
- Add handover and closure workflows.

**Exit condition:** A provider can manage client review and agreed scope changes without relying entirely on fragmented communication.

### Phase 3 — Payment and file-release orchestration

- Add configurable release policies.
- Integrate trusted payment-confirmation events.
- Enforce access controls for supported storage resources.
- Add release verification, audit history, and failure handling.
- Add controlled exceptions and notifications.

**Exit condition:** The system reliably blocks and releases protected files according to configured conditions.

### Phase 4 — Repeatability and intelligence

- Add richer service templates.
- Improve recurring retainer workflows.
- Prioritise external integrations.
- Introduce AI-assisted drafting and feedback summarisation.
- Expand analytics and automation based on demonstrated user demand.

**Exit condition:** Common engagements become easier to repeat and administer without weakening commercial, financial, or security controls.

---

## 15. Dependencies and risks

### 15.1 Existing implementation risk

The current repository has substantial functionality, but its runtime behaviour and production configuration must be verified before implementation planning assumes it is reliable.

### 15.2 External file-provider limitations

Different storage and creative providers expose different preview, download, permission, and revocation capabilities. Bagg must be capability-aware and must not promise universal control over external files.

### 15.3 Payment-provider semantics

A provider webhook may confirm a transaction event without proving every form of final settlement or immunity from later reversal. Release policy must use a carefully defined payment state appropriate to the provider and agreement.

### 15.4 Commercial ambiguity

If scope, revision limits, or payment conditions are vague, software alone cannot prevent disputes. Bagg should make these terms explicit and preserve the accepted record.

### 15.5 Scope expansion

Projects, retainers, file delivery, AI, and integrations could expand Bagg into an overly broad product. Every feature should demonstrate a direct contribution to commercial clarity, professional delivery, or payment certainty.

### 15.6 Client friction

Excessive account requirements may reduce client participation. Conversely, unrestricted public links can expose sensitive information. Access should be proportionate to the action and the resource.

---

## 16. Open product decisions

The following decisions should be resolved during design and before the relevant feature is implemented.

1. When should quote acceptance automatically create an engagement?
2. Which engagements require a separate contract or signature?
3. Which milestone and deliverable structures are necessary for the initial release?
4. What retainer billing frequencies and allowance models must be supported initially?
5. Which billing events may generate invoices automatically, and which require provider confirmation?
6. What is the authoritative payment state for each supported provider?
7. Which file-release policies are supported in the first release?
8. Should Bagg initially support secure uploads, external links, or both for protected deliverables?
9. Which storage integrations can safely enforce the required access conditions?
10. Which roles may manually confirm payments, change release policies, or grant exceptions?
11. What happens when a payment is reversed after a file has already been released?
12. What are the final subscription entitlements and regional prices?

These decisions should not prevent implementation of the underlying engagement model, but they must be resolved before the affected workflows are treated as production-ready.

---

## 17. Definition of product success

Bagg will have achieved its initial product objective when a provider can manage both one-off projects and ongoing retainers while retaining a clear relationship between the agreement, delivery, client decisions, financial obligations, and final handover.

For the payment-conditioned release capability, success specifically means that Bagg can demonstrate the complete sequence from deliverable preview and approval through trusted payment confirmation to verified access release—with safe failure handling and an auditable record.

The product should make the provider's work easier to sell, deliver, and collect payment for, while making the client's experience clearer and more professional.

**The governing principle is simple: Bagg should help service providers agree on the work, deliver what was agreed, collect what is owed, and hand over the right things at the right time.**

---

## Appendix A — Relationship to the existing implementation

This PRD is a target-state specification, not a statement that every feature is already implemented.

The existing product foundation includes client/workspace records, quotes, invoices, payment profiles, payment claims and confirmation paths, receipts, reminders, sharing, and subscription billing.

The following are major proposed additions or expansions:

- First-class one-off and retainer engagements.
- Engagement-linked delivery plans, milestones, and deliverables.
- Version-specific client approvals.
- Formal scope-change workflows.
- Engagement-based payment schedules and billing triggers.
- Payment-conditioned file release.
- Handover and closure records.
- A unified engagement portal.
- Service templates and controlled AI assistance.

The implementation plan should begin with a verified repository baseline and map each requirement to existing code, missing capabilities, tests, and any necessary migration. No requirement should be marked complete merely because a related field or partial workflow exists.

## Appendix B — Requirements-to-implementation traceability

Before development cards are created, each requirement should be classified as one of:

- Existing and verified.
- Existing but requiring hardening.
- Partially implemented.
- New capability.
- Deferred.
- Explicitly out of scope.

Each implementation card should identify its source requirement, affected domain, dependencies, migration implications, tests, and acceptance criteria. This keeps the PRD as the product authority while allowing engineering work to proceed incrementally.
