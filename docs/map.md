# Bagg — Current-State vs Target-State Feature Map

**Version:** 0.1  
**Assessment date:** 26 October 2026  
**Repository:** [github.com/ofili/bagg](https://github.com/ofili/bagg)  
**Branch inspected:** `dev`  
**Purpose:** Establish the evidence-based implementation baseline and define the gap between the current application and the intended Bagg product.

## 1. Executive assessment

Bagg currently has a meaningful invoicing and payment-follow-up foundation. The codebase includes a Next.js web application, FastAPI backend, PostgreSQL migrations, a background worker, payment-provider integration scaffolding, and automated tests for many core financial workflows.

The next stage is not to replace this foundation. It is to build on it while strengthening the financial and security controls that the expanded product will depend on.

The main gap is that Bagg currently models much of the business around clients, quotes, invoices, payments, and receipts. The intended product requires an additional layer that models the complete engagement: accepted commercial terms, delivery obligations, milestones, deliverables, client decisions, scope changes, and handover.

The most important architectural decision is to add this engagement layer without turning Bagg into a generic project-management application.

### Summary of the current position

| Capability area | Current assessment | Target |
|---|---|---|
| Client and workspace foundation | Implemented footprint | Retain and strengthen |
| Invoicing and multi-currency arithmetic | Implemented footprint; hardening required | Reliable financial foundation |
| Quotes and acceptance | Implemented footprint | Connect to agreements and engagements |
| Payment claims and manual confirmation | Implemented footprint | Retain; improve reconciliation |
| Direct checkout and payment webhooks | Implemented footprint; production readiness unverified | Reliable confirmed-payment lifecycle |
| Reminders and receipts | Implemented footprint | Connect to all relevant billing workflows |
| Deposits and milestone-related payment fields | Partial | Agreement-driven payment schedules |
| Project and engagement management | Not found as a dedicated domain | First-class capability |
| Retainers and recurring service delivery | Not found as a dedicated domain | First-class capability |
| Deliverables, review, and approvals | Not found as a complete domain | Core client-delivery capability |
| Scope-change management | Not found as a dedicated workflow | Core commercial-control capability |
| Payment-conditioned file release | Not found | Core differentiating capability |
| External creative and storage integrations | Limited storage foundation; target integrations not found | Selective, secure integrations |
| AI-assisted engagement workflows | Not found in inspected product domains | Later capability, with controlled actions |
| Production security and operational assurance | Partial or unverified | Required before production reliance |

## 2. Evidence and assessment method

This assessment uses the default `dev` branch and its visible source tree, including:

- [README and architecture overview](https://github.com/ofili/bagg/blob/dev/README.md)
- [Existing PRD v0.1](https://github.com/ofili/bagg/blob/dev/Bagg%20PRD%20v0.1.md)
- [Invoice domain](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/invoices)
- [Quote domain](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/quotes)
- [Payment domain](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/payments)
- [Receipt domain](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/receipts)
- [Reminder domain](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/reminders)
- [Sharing and client invoice experience](https://github.com/ofili/bagg/tree/dev/apps/api/app/domains/sharing)
- [Backend tests](https://github.com/ofili/bagg/tree/dev/apps/api/tests)
- [Frontend application routes](https://github.com/ofili/bagg/tree/dev/apps/web/src/app)

The repository contains tests for invoices, quotes, client portal flows, payment claims, receipts, reminders, webhook security, billing, and other areas. Their presence is evidence of intended and tested behaviour, but it does not establish that every test currently passes or that a feature is safe for production.

### Status definitions

- **Implemented footprint:** Source code and a corresponding application or API path are present. Tests may also cover the capability.
- **Partial:** Some relevant data structures or behaviour exist, but the intended end-to-end capability is incomplete or not fully verified.
- **Not found:** No clear implementation was identified in the inspected branch.
- **Hardening required:** The capability exists, but security, correctness, failure handling, or production readiness needs further verification.
- **Target:** The intended product capability, regardless of current implementation status.

## 3. Current-state feature inventory

### 3.1 Accounts, workspaces, and clients

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Email login using a one-time code | Implemented footprint | Authentication routes and service exist | Retain; harden for production |
| Workspace and account setup | Implemented footprint | Workspace and onboarding domains exist | Reliable workspace lifecycle |
| Workspace-scoped client records | Implemented footprint | Client models, routes, and tests exist | Retain; connect clients to engagements |
| Client contact and billing preferences | Implemented footprint | Email, phone, country, preferred currency, payment terms, and tax ID fields exist | Reuse in quotes, projects, and retainers |
| Client engagement history | Partial | Client records and invoice history exist; no complete engagement history model found | Unified view of all client engagements |
| Team collaboration and granular roles | Not found as a complete capability | No dedicated team-membership and role-management workflow identified | Add only when needed for multi-person providers |
| Account export and deletion | Implemented footprint | Compliance routes include export and deletion functionality | Verify completeness, retention, and operational safety |

**Assessment:** Keep the existing client and workspace foundations. Expand the relationship model around them rather than creating a separate client database for projects or retainers.

### 3.2 Quotes and commercial offers

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Quote creation and line items | Implemented footprint | Dedicated quote models, services, routes, and UI exist | Retain and expand |
| Quote numbering and currency | Implemented footprint | Sequence and currency fields exist | Retain |
| Tax, discount, and WHT fields | Implemented footprint | Quote financial fields and calculation logic exist | Validate calculations and configurable rules |
| Public quote links | Implemented footprint | Public quote route and share-token fields exist | Secure, professional client experience |
| Quote view tracking | Implemented footprint | Quote timestamps and public view flow exist | Retain |
| Client acceptance and decline | Implemented footprint | Acceptance and decline fields, routes, and tests exist | Connect acceptance to engagement creation |
| Quote versioning and revisions | Implemented footprint | Version and revision structures exist | Preserve accepted terms and change history |
| Quote-to-invoice conversion | Implemented footprint | Quote model links to a converted invoice | Extend conversion into an engagement workflow |
| Reusable service packages | Not found as a dedicated capability | No complete package/template domain identified | Build reusable commercial and delivery templates |
| Scope, exclusions, revision allowances, and detailed deliverable definitions | Partial or unverified | Financial quote structures exist; complete service-scope workflow not established | Make scope explicit and reusable |
| Formal contract creation and signing | Not found as a complete workflow | No dedicated contract domain identified | Decide native versus integrated approach |

**Assessment:** Quotes are a valuable existing entry point. The most important extension is to make the accepted quote the commercial basis for an engagement, not merely the precursor to an invoice.

### 3.3 Invoices and financial calculations

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Invoice creation and editing | Implemented footprint | Dedicated invoice editor, API, model, and tests exist | Retain |
| Invoice finalisation and sending | Implemented footprint | Explicit finalise/send workflow exists | Retain and harden |
| Invoice revisions and immutability | Implemented footprint | Revision model and immutability tests exist | Preserve historical versions and accepted terms |
| Invoice numbering | Implemented footprint | Workspace sequence and prefix fields exist | Retain |
| Multiple currencies | Implemented footprint | NGN, USD, GBP, EUR, GHS, KES, and ZAR appear in the code and product documentation | Retain; validate currency-specific behaviour |
| Minor-unit financial arithmetic | Implemented footprint | Integer minor-unit fields and money tests exist | Retain; remove or rigorously constrain floating-point rate risks |
| Tax and withholding tax | Implemented footprint | Tax/WHT fields and fast-follow tests exist | Validate rules, configuration, and legal assumptions |
| Deposits | Partial | Invoice and quote models contain deposit percentage/amount fields | Connect deposits to agreed payment schedules |
| Partial payments | Implemented footprint | Payment confirmation supports partial settlement | Preserve balance and allocation correctness |
| Overdue status and financial dashboard | Implemented footprint | Invoice filters and dashboard tests exist | Add engagement-level cash-flow visibility |
| Recurring invoice generation | Partial or unverified | Subscription billing exists for Bagg's own plans; no complete customer retainer billing workflow identified | Build service-provider recurring billing separately |
| Invoice-linked project milestones | Not found as a complete capability | Deposit/milestone-related fields are not a project milestone domain | Add milestone-based billing rules |
| Scope-change-driven billing | Not found | No dedicated change-order workflow identified | Connect approved changes to revised obligations and invoices |

**Important distinction:** Bagg's own subscription billing is not the same as recurring invoicing for a provider's client. Those are different commercial domains and should remain separate.

### 3.4 Payments, receipts, and collections

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Currency-specific payment profiles | Implemented footprint | Payment profiles store bank details, links, mobile-money details, and instructions | Retain; strengthen validation and protection of sensitive details |
| Client “I've paid” claims | Implemented footprint | Payment claim model and public sharing flow exist | Retain |
| Payment proof attachment | Partial | Proof URL fields and storage integration scaffolding exist | Verify actual upload, access control, retention, and validation |
| Manual payment confirmation | Implemented footprint | Shared confirmation service exists | Retain with clear authorisation and audit controls |
| Partial and full payment confirmation | Implemented footprint | Central service updates amounts and invoice status | Harden for concurrency and edge cases |
| Receipts | Implemented footprint | Receipt model, service, routes, and tests exist | Retain; improve connection to all billing events |
| Payment-provider checkout | Implemented footprint | Direct checkout and provider integration paths exist | Verify real provider behaviour and configuration |
| Paystack payment webhooks | Implemented footprint | Dedicated webhook route, signature checks, and tests exist | Harden replay, concurrency, reversals, and settlement semantics |
| Flutterwave integration | Partial | Integration client exists, but the inspected client is a demo/scaffold implementation | Complete and verify before relying on it |
| Payment idempotency | Partial | Provider references are checked in the confirmation service; end-to-end concurrency safety is unverified | Guarantee one confirmed payment per provider event/reference |
| Payment reconciliation | Partial | Manual claims and gateway-confirmed flows exist; comprehensive reconciliation is not established | Add reliable allocation and exception handling |
| Refunds, reversals, disputes | Not found as a complete workflow | No complete financial reversal lifecycle identified | Define only where provider and customer needs justify it |
| Automatic payment reminders | Implemented footprint | Reminder service, worker, scheduling, and tests exist | Connect reminders to engagement and retainer obligations |
| WhatsApp sharing/nudges | Partial | WhatsApp share links are generated; automated WhatsApp Business messaging is not established | Retain link-based sharing; consider deeper integration later |

**Assessment:** The payment-confirmation service is a critical foundation. The expanded product should reuse it rather than creating a separate, weaker definition of “paid” for projects or file release.

### 3.5 Client-facing invoice experience and communication

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Public invoice share link | Implemented footprint | Dedicated public invoice route and share-token fields exist | Retain and extend to engagements |
| No-account client invoice view | Implemented footprint | Client portal tests exercise unauthenticated viewing | Preserve low-friction access where appropriate |
| Payment instructions and copyable details | Implemented footprint | Public invoice response resolves payment profiles | Extend to quotes, engagement summaries, and payment obligations |
| Invoice comments | Implemented footprint | Sharing domain and client portal tests cover comments | Reuse patterns for deliverable feedback, but distinguish formal approval |
| Invoice viewed status | Implemented footprint | Public view records invoice status and timestamps | Extend event tracking where useful |
| Email delivery and PDF generation | Implemented footprint | Email integration and invoice templates exist | Retain and harden delivery failures and retries |
| Client-facing quote acceptance | Implemented footprint | Quote routes and public quote page exist | Add a unified engagement portal |
| General client engagement portal | Not found | Current public views are document-oriented, not a unified project workspace | Build the engagement-centred client experience |
| Deliverable review and version-specific approval | Not found as a complete capability | No deliverable/approval domain identified | Core target capability |
| Client decision history across the engagement | Partial | Quote/invoice statuses and comments exist independently | Unify decisions while retaining distinct event types |

### 3.6 Bagg's own subscription and monetisation

| Feature | Current state | Evidence or limitation | Target state |
|---|---|---|---|
| Subscription records | Implemented footprint | Subscription model and billing routes exist | Align entitlements with final product strategy |
| Delivery quotas/credits | Implemented footprint | Credit ledger and quota logic exist | Review whether the current metering model remains appropriate |
| Subscription checkout/webhooks | Implemented footprint | Billing tests exercise a subscription lifecycle | Verify provider configuration and production behaviour |
| Free and paid tiers | Implemented footprint | Plan codes and subscription logic exist | Reconcile code with the current commercial plan: Free, ₦25,000/year, and ₦60,000/year |
| International subscription pricing | Partial or unverified | Multi-currency and billing structures exist; complete regional pricing strategy is not established | Validate Nigeria and international pricing independently |
| Feature entitlements for projects, retainers, and storage integrations | Not found as a complete capability | Existing entitlement model is primarily tied to invoicing/delivery limits | Define entitlements after the target feature set is agreed |

## 4. Target-state capability map

The following capabilities define the gap between the current product and the intended Bagg. Priorities describe recommended product sequencing, not a commitment to dates.

### P0 — Foundation and reliability

These items should be addressed before the expanded product relies on the existing financial foundation.

| Target capability | Current gap | Required outcome |
|---|---|---|
| Production-grade authentication | Development-oriented shortcuts remain visible in the inspected auth code | Remove exposed development codes, secure cookies correctly, eliminate unauthenticated demo fallback in production, and verify session controls |
| Reliable financial state transitions | Existing flows need stronger end-to-end verification | One authoritative payment-confirmation path, correct balances, immutable history, and safe failure handling |
| Webhook reliability | Signature checks exist; concurrency and provider lifecycle behaviour need verification | Idempotent processing, replay protection, duplicate handling, and appropriate reconciliation |
| Current-state regression suite | Tests exist, but this assessment did not run them | Establish a verified baseline with passing backend, frontend, and end-to-end checks |
| Engagement domain design | No dedicated engagement model identified | Define one-off and retainer engagements as first-class records |
| Agreement-to-delivery relationship | Quotes and invoices exist separately from delivery concepts | Accepted commercial terms should be the baseline for delivery and billing |
| Auditability | Invoice/quote status events and receipt provenance exist | Extend traceability to decisions, scope changes, payment conditions, file releases, and exceptions |

**Security note:** The inspected authentication code returns a `dev_code` in the magic-link response, sets the session cookie with `secure=False`, and includes a development fallback when no session is supplied. These are concrete hardening items. Their presence in the inspected code does not establish whether production deployment currently overrides or blocks them, so deployment configuration must also be checked.

### P1 — First-class engagement workflows

These capabilities turn Bagg from an invoicing workspace into an engagement workspace.

| Target capability | Current gap | Required outcome |
|---|---|---|
| One-off project engagement | No dedicated project domain found | Engagement with accepted terms, delivery plan, milestones, and closure |
| Retainer engagement | No dedicated retainer domain found | Recurring service arrangement with periods, billing, allowance, renewal, and termination |
| Engagement templates | No complete reusable delivery-template workflow found | Create repeatable service-specific engagement structures |
| Milestones and deliverables | Deposit fields exist, but no complete delivery model found | Separate milestones, tasks, deliverables, and billing triggers |
| Client engagement overview | Existing portal is document-specific | One client-facing workspace for status, decisions, invoices, and deliverables |
| Structured feedback and approvals | Invoice comments exist; deliverable approvals not found | Version-specific feedback and explicit approval records |
| Scope-change requests | No dedicated workflow found | Price, scope, timeline, and deliverable changes require explicit agreement |
| Payment schedules | Deposit support is partial | Support upfront, staged, milestone, scheduled, and retainer billing conditions |
| Handover and closure | No complete workflow found | Track final materials, outstanding obligations, release, and closure separately |

**Decision:** Retainers are not deferred to a later architectural phase. The first engagement model should support both one-off projects and retainers, with an appropriate user experience for each.

### P2 — Delivery and payment orchestration

These capabilities are central to Bagg's differentiation.

| Target capability | Current gap | Required outcome |
|---|---|---|
| Configurable billing triggers | No complete engagement billing engine found | Create or prompt for invoices when agreed events occur |
| Payment-conditioned file release | No file-release policy or delivery domain found | Release selected deliverables only when the agreement's conditions are satisfied |
| Approval-conditioned release | No deliverable approval domain found | Record approval against the exact version that was reviewed |
| Secure file access control | Existing storage integration is a basic S3-compatible scaffold | Enforce access restrictions at the actual file or provider permission layer |
| Release audit trail | No release events found | Record who received what, when, and why it became accessible |
| Exception handling | No release-policy exception model found | Allow authorised, documented exceptions where contractual terms permit them |
| Change-order billing | No scope-change workflow found | Approved scope changes can update delivery and billing obligations |
| Unified operational dashboard | Financial dashboard exists, but delivery workflow is absent | Show money, decisions, blocked work, release readiness, and handover actions |

The file-release workflow must distinguish:

1. The deliverable is submitted for review.
2. The client approves a specific version, where required.
3. The required payment is confirmed.
4. The configured release policy is satisfied.
5. The authorised files become accessible.
6. Bagg records the release.

A client marking an invoice as paid is not equivalent to confirmed settlement. A payment-provider webhook must be validated according to the provider's semantics before it can trigger a release.

### P3 — Integrations and assisted workflows

| Target capability | Current gap | Required outcome |
|---|---|---|
| Google Drive, Dropbox, Box, and OneDrive | No provider-specific integration found in the inspected tree | Link or embed supported files and enforce access controls where possible |
| Figma, Canva, and Adobe workflows | No dedicated integration found | Support previews and review links where provider capabilities allow |
| Media-review workflows | No dedicated integration found | Connect relevant review assets without recreating specialist tools |
| GitHub/GitLab and deployment links | No dedicated integration found | Support delivery and handover for development engagements where useful |
| Service-specific templates | No complete template system found | Reusable quotes, deliverables, milestones, payment schedules, and handover checklists |
| AI-assisted quote drafting | Not found in inspected product domains | Generate drafts and suggestions for human review |
| AI feedback summaries | Not found | Summarise feedback and identify conflicting or out-of-scope requests |
| AI-assisted progress updates | Not found | Draft status updates and reminders without inventing facts |
| Controlled workflow automation | Not found as an engagement rule engine | Execute only when defined conditions and permissions are satisfied |

## 5. The target engagement model

The proposed target model should connect the existing financial domains to a new set of engagement and delivery concepts.

### Existing concepts to preserve

- Workspace and client.
- Quote and quote revision.
- Invoice and invoice revision.
- Payment profile and payment claim.
- Confirmed payment/receipt.
- Reminder job.
- Subscription and credit ledger.
- Status event and share link.

### New concepts to introduce

- **Engagement:** the overarching unit of client work.
- **Engagement type:** one-off project or ongoing retainer, with room for justified future types.
- **Agreement reference:** the accepted commercial baseline, including any applicable contract.
- **Delivery plan:** the structure of milestones and deliverables.
- **Milestone:** a meaningful delivery stage with optional approval and billing conditions.
- **Deliverable:** the work product promised to the client.
- **Deliverable version:** the specific artefact or version submitted for review.
- **Client decision:** acceptance, rejection, approval, or another explicit decision tied to a relevant object.
- **Scope-change request:** a proposed modification to agreed work, price, timing, or obligations.
- **Payment schedule:** the set of financial obligations associated with an engagement.
- **Release policy:** the conditions governing access to specified files or deliverables.
- **Release event:** the auditable record that access was granted.
- **Retainer period:** a defined service/billing period within an ongoing arrangement.
- **Handover record:** the completion package and outstanding items associated with final delivery.

These are product-domain concepts. The eventual PRD and architecture review should determine the exact persistence and service boundaries.

### Relationship rules

1. A client can have multiple engagements.
2. An engagement can be a one-off project or a retainer.
3. An engagement is grounded in accepted commercial terms.
4. A delivery plan can contain multiple milestones and deliverables.
5. A deliverable can have multiple versions.
6. Approval applies to the specific version reviewed, not to an undefined file that may later change.
7. An invoice may be associated with an engagement, milestone, or retainer period.
8. An invoice may be paid in parts; confirmed payments must be recorded independently of invoice status.
9. A payment can satisfy a particular financial obligation without automatically satisfying every obligation on the engagement.
10. A release policy may apply to selected deliverables, a milestone bundle, or a final handover package.
11. A release requires all configured conditions to be satisfied.
12. A scope change must preserve the original agreement and record the accepted change.
13. An engagement can have completed work while payment, handover, or other obligations remain outstanding.
14. A retainer has identifiable service and billing periods; it is not simply an endless project.

## 6. Recommended implementation sequence

### Workstream A — Verify and harden the existing foundation

- Run the backend test suite.
- Run frontend lint/build and end-to-end tests.
- Review production authentication configuration.
- Verify invoice revision rules for paid, cancelled, and otherwise restricted states.
- Test payment confirmation under duplicate and concurrent requests.
- Verify webhook signature validation, event persistence, replay handling, and provider references.
- Confirm receipt and invoice balance consistency.
- Check data export/deletion completeness and retention requirements.
- Establish a documented current-state baseline.

**Exit condition:** The team can demonstrate the core quote-to-invoice-to-confirmed-payment lifecycle and explain its security and failure behaviour.

### Workstream B — Define and implement the engagement foundation

- Introduce the engagement concept.
- Support one-off and retainer types from the beginning.
- Link accepted quotes to engagements.
- Define delivery plans, milestones, and deliverables.
- Link invoices to engagements and, where applicable, milestones or retainer periods.
- Preserve accepted terms and change history.
- Establish the engagement lifecycle and event model.

**Exit condition:** A provider can create both a one-off project and a retainer, and each has a coherent relationship to its commercial terms and financial obligations.

### Workstream C — Build the client delivery experience

- Create a unified client-facing engagement workspace.
- Add deliverable records and version-aware review.
- Add feedback and explicit approvals.
- Add revision allowance tracking.
- Add scope-change requests and acceptance.
- Add handover and closure records.

**Exit condition:** A provider can share work, receive feedback, record an approval, manage an agreed change, and close an engagement with an auditable history.

### Workstream D — Implement payment and delivery orchestration

- Define payment schedules and billing triggers.
- Add deterministic release policies.
- Verify payment evidence before triggering protected actions.
- Enforce file access controls in Bagg or supported external providers.
- Add release records and notifications.
- Add authorised exception handling.
- Test failure, duplicate-event, reversal, and partial-payment scenarios.

**Exit condition:** A test engagement demonstrates that files remain inaccessible when required conditions are unmet and become accessible only after the configured conditions are satisfied.

### Workstream E — Expand repeatability and integrations

- Add reusable service and engagement templates.
- Complete retainer period and renewal workflows.
- Prioritise storage and creative integrations based on actual customer demand.
- Add AI assistance for drafting and summarisation.
- Introduce automation only where the rules, permissions, and evidence requirements are explicit.

**Exit condition:** Providers can repeat common engagement patterns with less manual setup without compromising the integrity of commercial records.

## 7. Decisions to settle before the PRD

The product definition has established the direction. The following decisions remain important for detailed requirements.

1. **Engagement creation:** Does accepting a quote always create an engagement, or can a provider choose whether to activate one?
2. **Agreement model:** Is an accepted quote sufficient for most engagements, with a separate contract where required?
3. **Milestone design:** Which milestone types and dependencies are necessary initially, and which would be unnecessary project-management complexity?
4. **Retainer model:** Which billing periods, allowances, renewals, and excess-work rules are essential for the first version?
5. **Billing triggers:** Which events can generate invoices automatically, and which require provider confirmation?
6. **Payment evidence:** What confirmation standard applies to each supported payment provider and bank-transfer workflow?
7. **File release:** Which release policies are supported initially, and how are exceptions authorised and recorded?
8. **External files:** Which providers can reliably support the required preview, authentication, and access-control behaviour?
9. **Client identity:** Which client actions can use secure share links, and which require authentication?
10. **Team permissions:** Which actions—especially payment confirmation, commercial changes, and file release—require role-based permissions?
11. **Current pricing:** How should the existing Free, ₦25,000/year, and ₦60,000/year plans map to the expanded product?
12. **Production readiness:** What deployment, security, reliability, and recovery requirements must be satisfied before public launch?

## 8. Recommended priority order

The recommended order is:

1. **Verify and secure what already exists.**
2. **Build the shared engagement model for both projects and retainers.**
3. **Connect accepted quotes, delivery obligations, invoices, and payments.**
4. **Build client-facing deliverables, feedback, approvals, and scope changes.**
5. **Implement payment-conditioned release with secure access enforcement.**
6. **Improve templates, retainers, integrations, and AI-assisted workflows.**

This sequence protects the value already present in Bagg while ensuring that new capabilities are built on a reliable financial foundation.

## 9. Limitations of this assessment

This is a static repository assessment of the `dev` branch. It does not establish:

- That the current branch is deployed to production.
- That the application or tests currently run successfully.
- That every frontend path has been manually exercised.
- That payment-provider credentials, webhooks, or production settings are correctly configured.
- That no relevant work exists on other branches or in uncommitted local changes.
- That the current UI and all API behaviours match the intended product experience.

Before using this map as a definitive implementation inventory, the team should run the application and test suite, inspect deployment configuration, and verify the relevant workflows end to end.

## 10. Conclusion

Bagg should preserve its current strengths in quoting, invoicing, payment follow-up, and receipts. The next major step is to make the engagement—not the invoice—the organising concept for service delivery.

The target product should connect commercial commitments, delivery, client decisions, payment confirmation, and handover while preserving the distinction between each.

The highest-value gap is not a large collection of generic project-management features. It is the ability to manage an engagement from accepted scope through delivery and approval to confirmed payment and controlled handover, with first-class support for both one-off projects and retainers.

That is the foundation on which the detailed PRD should be built.

**Assessment status:** Draft baseline for product and engineering review. Not a production-readiness certification.