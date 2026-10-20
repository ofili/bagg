# Bagg: Product Requirements Document

Version 0.1 (draft) | October 20, 2026 | Owner: Lewis

## 1. Summary

Bagg is an invoicing and get-paid workspace for African freelancers and creators. A freelancer builds a professional invoice in minutes and shares it by link, WhatsApp, email or PDF. Bagg shows the client exactly how to pay in the right currency, then tracks the invoice and follows up until it is paid.

The product is inspired by Hagfish (hagfish.app), a deliberately narrow invoicing tool. Bagg keeps that scope discipline but shifts the emphasis from making an invoice to getting paid.

**Positioning:** Invoice like a pro. Get paid without chasing.

**Borrowed from Hagfish:** a narrow scope (invoices, clients, payment status, no accounting suite); a private share link that needs no client account and supports line-item comments; charging at the moment of delivery rather than creation; multi-currency; an API-first foundation that can host agent integrations later.

**Different in Bagg:** a payments-first design (payment methods per currency, a client I've paid flow, automated reminders, and integrated collection in phase 2); local fit (NGN and other African currencies, WhatsApp sharing, mobile-first, local-currency pricing and checkout); and withholding-tax support for freelancers who invoice local companies.

For reference, Hagfish does not collect client payments (it leaves that to the user), and its public pages describe no automated reminders.

## 2. Problem Statement

African freelancers and creators routinely bill a mix of local and international clients, each needing a different currency and payment method. Many assemble invoices by hand in documents, spreadsheets or chat messages, scatter payment details across conversations, and chase late payments manually. The result is unprofessional-looking invoices, unclear payment instructions, slow payment, and no reliable record of who owes what.

The cost of not solving it: delayed income, awkward follow-ups, lost credibility with international clients, and messy records at tax time.

**Evidence status:** this is a working hypothesis built from desk research (Hagfish's public pages, including its Naira pricing and the ₦55.9M invoiced on its homepage). Phase 0 replaces it with interviews and real invoice samples.

## 3. Target Users

**Primary: the African freelancer or creator.** Designers, developers, writers, editors, photographers, consultants and creators with brand deals who invoice both local businesses and international clients, often in different currencies. Typically a sole operator, mobile-first, and short on time for admin.

**Secondary: the client (payer).** Receives the invoice through a link, needs no account, and wants a clear total, clear payment instructions, a way to ask questions, and a receipt.

**Assumptions to validate in Phase 0:**

- Nigeria is the launch beachhead (NGN payments, support, distribution), while the product is multi-currency and multi-country from day one.
- WhatsApp is the dominant channel for sending invoices and chasing payment.
- Most usage happens on phones, often on variable connections.
- Local clients commonly pay by bank transfer and then send proof of payment.

## 4. Goals

1. **Speed:** a new user sends a first invoice in under 5 minutes from signup, and later invoices in under 2 minutes.
2. **Clarity:** every invoice shows the client exactly how to pay in the invoice's currency.
3. **Faster payment:** reduce median days-to-paid by at least 25% against the freelancer's self-reported baseline within 90 days of use.
4. **Traction:** reach 150 monthly active senders within six months of public launch (stretch: 500).
5. **Sustainability:** convert at least 5% of activated users to a paid plan or recurring credit purchases within 60 days.

## 5. Non-Goals

- **Accounting or bookkeeping** (ledgers, bank sync, financial statements). A different product, and it invites comparison with mature tools.
- **Payroll, inventory, time tracking, project management.** Every feature must make invoicing or getting paid easier, or it does not ship.
- **Holding or moving client funds.** Bagg never holds funds. Later collection goes through licensed processors that settle directly to the freelancer.
- **Teams, roles and multi-user workspaces in v1.** Solo operators first.
- **Native mobile apps in v1.** A mobile-first responsive web app (installable as a PWA) covers launch.
- **Tax e-invoicing or fiscalization in v1.** Confirm whether it applies to individual freelancers before building anything.
- **A marketplace or client discovery.** Bagg serves freelancers who already have clients.

## 6. User Stories

### Freelancer (sender)

- As a freelancer, I want to save my business profile and logo once so that every invoice looks professional without repeated setup.
- As a freelancer, I want to save my bank, PayPal or mobile money details per currency so that each invoice tells the client how to pay without me retyping anything.
- As a freelancer, I want to create an invoice for a saved client in under two minutes so that billing does not interrupt my work.
- As a freelancer, I want to send an invoice by WhatsApp link when my client has no email or prefers chat, so that I meet clients where they are.
- As a freelancer, I want to know when a client has viewed my invoice so that I can follow up at the right time.
- As a freelancer, I want automatic polite reminders so that I do not have to chase payment myself.
- As a freelancer, I want to confirm or reject a client's I've paid claim so that my records only show money I actually received.
- As a freelancer, I want to see what is outstanding and overdue, grouped by currency, so that I know where my money is.
- As a freelancer, I want to export my data and delete my account so that I stay in control of my records.

### Client (payer)

- As a client, I want to open an invoice on my phone without creating an account so that paying is quick.
- As a client, I want to see how to pay in my currency, with copy buttons, so that I do not make mistakes.
- As a client, I want to comment on a line item so that I can raise questions without a long email thread.
- As a client, I want to tell the freelancer I have paid and attach proof so that they can confirm quickly and I get a receipt.

### Edge cases and empty states

- A new user with no clients or invoices sees a guided first-invoice flow, not an empty table.
- A client with no email can still receive the invoice by link or WhatsApp.
- An email that fails to deliver shows its status and offers the share link as a fallback.
- A rejected payment claim returns the invoice to its previous status with the freelancer's note visible to the client.
- An invoice sent in a currency with no saved payment profile prompts the freelancer before sending.

## 7. Core Flows

### Flow A: Create and send

1. The freelancer picks or creates a client; currency and payment terms prefill.
2. They add line items; Bagg totals the invoice, applies tax and discount, and assigns the next invoice number.
3. Bagg attaches the payment profile that matches the invoice currency.
4. The freelancer previews, then sends by link, WhatsApp or email, or downloads the PDF. Any credit cost is shown before the action.

### Flow B: Client pays

1. The client opens the link on their phone and sees the amount, due date and line items.
2. They see the payment method for the invoice currency, with copy buttons.
3. They may comment on a line item; the freelancer is notified.
4. After paying, they tap I've paid and enter the date, an optional reference, and optional proof.
5. The freelancer is notified and confirms or rejects. On confirmation the invoice becomes Paid and the client receives a receipt.

### Flow C: Chasing

1. Reminders go out on a schedule: before the due date, on it, and after it.
2. Each reminder goes by email and prompts the freelancer with a one-tap WhatsApp nudge with pre-filled text.
3. Reminders stop as soon as the invoice is paid or voided.

## 8. Requirements

### Must-Have (P0): the MVP

**P0-1 Account and business profile.** Sign up with email or Google. Business name, logo, brand color, address, country, default currency, optional tax ID.

- Acceptance: a user can sign up and send a first invoice without entering a card.
- Acceptance: profile edits apply to drafts but never change an invoice already sent.

**P0-2 Clients.** Create, edit and archive clients with billing name, email, phone, address, country, preferred currency, default payment terms and optional tax ID. Each client shows invoice history with totals invoiced, paid and outstanding.

- Acceptance: given a client with a USD preference, when a new invoice is started for them, then currency and terms prefill.
- Acceptance: a client without an email can be saved and invoiced by link or WhatsApp.

**P0-3 Invoice editor.** Line items (description, quantity, unit price), discount, named tax percentage (for example VAT), notes, issue and due dates, currency, sequential numbering with an editable prefix (for example INV-0001), autosave and live preview.

- Acceptance: totals are computed in minor units with correct rounding for each currency.
- Acceptance: once sent, an invoice is locked; edits create a visible revision and the client sees an updated banner.
- Acceptance: invoice numbers are unique per workspace.

**P0-4 Currencies.** Launch with NGN, USD, GBP, EUR, GHS, KES and ZAR, with a simple path to add more. One currency per invoice; no conversion in v1.

- Acceptance: symbols and number formats are correct per currency.
- Acceptance: changing a draft's currency prompts for the matching payment profile.

**P0-5 Payment profiles.** Save payment methods per currency: bank transfer details, a payment link (PayPal, Payoneer or similar), a mobile money number, and free-text instructions. One default per currency, attached automatically.

- Acceptance: given a USD invoice and a saved USD profile, the client view shows those details with copy buttons.
- Acceptance: if no profile exists for the currency, sending is blocked with a clear prompt to add one (the freelancer may override).

**P0-6 Delivery.** A private, unguessable share link (no client account), WhatsApp click-to-share with a pre-filled message, email send, and PDF download. Free-tier invoices carry a small Bagg footer.

- Acceptance: transient email failures are retried and delivery status is visible.
- Acceptance: a share link can be revoked at any time.

**P0-7 Client view and I've paid.** A mobile-first invoice page with totals, due date, payment instructions, comment threads on line items (resolve and reopen), and an I've paid action with date, reference and optional proof upload (image or PDF). A receipt is issued on confirmation.

- Acceptance: given a client submits I've paid, then the freelancer is notified and the invoice shows Payment claimed.
- Acceptance: the freelancer can confirm in full, confirm a partial amount, or reject with a note.
- Scope flex: if capacity is tight, line-item comments can fall back to invoice-level comments.

**P0-8 Status tracking.** Statuses: Draft, Sent, Viewed, Payment claimed, Partially paid, Paid, Overdue (derived from the due date) and Void. A manual Mark as paid records full or partial amount, date and method. The dashboard shows outstanding, overdue and paid-this-month, grouped by currency.

- Acceptance: totals never mix currencies.
- Acceptance: every status change is timestamped and visible in the invoice history.

**P0-9 Reminders.** Default schedule: 3 days before due, on the due date, and 3 and 7 days after. Editable, with per-invoice override and plain, polite templates. Delivered by email, with a WhatsApp nudge prompt for the freelancer.

- Acceptance: reminders stop when the invoice is paid or voided, and the freelancer can pause them.
- Acceptance: a client is never sent more than one reminder per day, and every send is logged.

**P0-10 Pricing and credits.** Free tier, credits ledger and an optional subscription (see section 9). Checkout in NGN and USD. The cost of any metered action is shown before it happens.

- Acceptance: the credits ledger is append-only and the balance can never go negative.
- Acceptance: a failed delivery refunds its credits, and purchases are idempotent.

**P0-11 Data rights.** Export all invoices and clients (CSV and PDFs), delete the account with documented retention and backup rules, and publish terms and a privacy policy.

- Acceptance: an export completes without support involvement; deletion removes active data immediately.

### Nice-to-Have (P1): fast follows

- **Integrated payments.** A pay link on each invoice through Paystack and/or Flutterwave (cards, bank transfer and other methods they support), with webhook-driven auto-reconciliation, direct settlement to the freelancer's own account, and automatic receipts. This is the highest-value P1 and the main differentiator against Hagfish.
- **Deposits and milestones.** Request a percentage up front and track partial payments against one invoice.
- **Withholding tax.** Record tax withheld by a client, show net payable, and keep supporting documentation. Rates must be configurable; verify current rules before building.
- **Recurring invoice drafts** (never auto-sent) and **scheduled sending.**
- **Business expense tracking** with categories.
- **Client onboarding invites** so clients fill in their own billing details.
- **Estimates** that convert into invoices.
- **Optional late fees** and additional invoice templates.

### Future Considerations (P2): design for them now

- Public API, CLI and agent (MCP) integration with human approval of every action.
- Mobile money collection (for example M-Pesa and MTN MoMo) and rails for additional countries.
- WhatsApp Business API for automated reminders (cost and template approval apply).
- A public pay page or link-in-bio per freelancer.
- Teams, accountant access and tax summary exports.
- AI-assisted drafting: build an invoice from a pasted chat message or voice note, and import past invoices from a photo or PDF.

**Architectural implications of P2:** every UI action goes through an internal API, writes carry idempotency keys, the system keeps an event log, access uses scoped tokens, and data is multi-tenant from day one.

## 9. Pricing and Monetization (hypothesis)

**Model:** a free tier, pay-as-you-go credits and a subscription. Bagg charges at the moment of delivery and for money-in features, never for creating or editing.

- **Free:** unlimited drafts, clients, share links and WhatsApp sharing (with a small Bagg footer), plus a small number of metered sends per month (for example 3).
- **Credits:** top-up packs in local currency for PDF and email delivery beyond the free allowance.
- **Subscription:** unlimited PDF and email, no Bagg footer, full reminder customization, and integrated payments when they ship.
- **Benchmark:** Hagfish charges ₦2,000 per 200-credit pack and ₦14,000 (Creator) or ₦28,000 (Professional) per year, with 40 free credits at signup. Bagg's prices get set after Phase 0 willingness-to-pay interviews.
- **Integrated payments (P1):** a small per-transaction fee, structure to be decided.
- **Bagg's own billing:** local checkout through a local processor for local currencies, and a merchant-of-record or equivalent for USD. Hagfish appears to use Lemon Squeezy for its checkout and affiliates.

Why the free share link: every client view is a distribution moment. The footer turns each invoice into acquisition for Bagg, so link sharing should not be metered.

## 10. Payments, Compliance and Trust

- **Funds:** Bagg never holds funds. In v1 the freelancer is paid directly by the client. In P1, licensed processors settle straight to the freelancer's account.
- **Data protection:** Nigeria's NDPA 2023 applies from day one; other target markets have their own regimes (for example Ghana, Kenya and South Africa). Get counsel to confirm obligations, including consent and cross-border transfer rules.
- **Tax:** invoices support named taxes and tax ID fields. Withholding tax (P1) matters for freelancers invoicing local companies. E-invoicing regimes (for example Nigeria's NRS and Kenya's eTIMS) may apply to some businesses; confirm whether they reach individual freelancers before launch.
- **Abuse and fraud:** fake or phishing invoices are a real risk for a tool that emails strangers. Rate-limit sends, add an abuse report link on every client view, and warm up and authenticate the sending domain (SPF, DKIM, DMARC).
- **Trust signals:** show view history to the freelancer, show a revision banner to the client, and keep the client page free of dark patterns.

## 11. Technical Architecture

Bagg is built API-first: a Next.js PWA over a FastAPI service, with PostgreSQL as the source of truth and Redis running background work. The stack below is the proposal to confirm in open question 3.

### Proposed stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js, TypeScript, Tailwind, installable PWA | Server-rendered client invoice page loads fast on phones; one codebase for the freelancer app and the client view |
| API | FastAPI, SQLAlchemy, Alembic, Pydantic | The auto-generated OpenAPI spec seeds the public API, SDKs and agent layer (P2) |
| Database | PostgreSQL | Source of truth, including the credits ledger and the job schedule |
| Queue and cache | Redis with a worker (Celery or ARQ) | Runs sends, reminders and PDF jobs; also handles rate limiting |
| PDFs | WeasyPrint, with Playwright as fallback | HTML and CSS to PDF without a headless browser; fall back if fonts or layout fidelity fall short |
| Email | Postmark or Resend | Deliverability and event webhooks; move to SES only if volume makes cost matter |
| File storage | S3-compatible storage (Cloudflare R2 or Azure Blob) with signed URLs | Logos, PDFs and payment proof |
| Auth | Email one-time code and Google, handled in the API with httpOnly session cookies | No per-user vendor bill, and sessions stay in our own database |
| Payments | Paystack for local-currency billing, a merchant-of-record for USD, Paystack and Flutterwave APIs for P1 collection | Local checkout for local currencies; see open question 7 for USD |
| Analytics and errors | PostHog, Sentry | Funnel metrics from section 12 and error tracking |
| Hosting | Containers on a managed host, managed PostgreSQL and Redis, a CDN with African points of presence (Cloudflare is the usual choice) | Keep it simple; pick regions after benchmarking from Lagos and Nairobi, because an African region is not automatically the fastest route for West African users |

### Engineering decisions

- **Mobile-first and light:** the client page must load quickly on a mid-range phone and a variable connection. Set a concrete performance budget during design.
- **API-first:** the web app consumes the same internal API that a public API will later expose.
- **Money:** store amounts as integers in minor units with currency-aware rounding. Never use floating point.
- **Immutability:** sent invoices are versioned. Edits create revisions with history.
- **Credits ledger:** append-only, idempotent, with reservation and refund on failure. It lives in PostgreSQL inside transactions, never in Redis.
- **Background jobs:** each scheduled send and reminder stores its due time in PostgreSQL, and workers claim due rows with row-level locking (SKIP LOCKED). Redis runs the work, so a Redis restart cannot lose a reminder. Jobs run at-least-once with idempotency to prevent duplicates.
- **Webhooks:** persist the raw event first, verify its signature, then process it asynchronously and idempotently.
- **PDF generation:** server-side, deterministic, cached once generated. WeasyPrint first; Playwright if fidelity falls short.
- **Security:** unguessable, revocable share tokens stored hashed; an audit log of views; single-owner permissions in v1.
- **Observability:** email delivery events, PDF failures, reminder sends and payment-claim events are all tracked.
- **Core entities:** User, Workspace, Client, Invoice, InvoiceRevision, LineItem, PaymentProfile, PaymentClaim, Comment, ShareLink, Reminder, CreditLedgerEntry, Subscription, EmailLog, AuditEvent, WebhookEvent, Job.

**Alternative considered:** an all-TypeScript build (Next.js and PostgreSQL with a worker in the same codebase) is faster for one developer, but it gives up the spec-generated API that seeds the public API and the agent layer.

## 12. Success Metrics

All targets are initial hypotheses and should be revisited after Phase 0 and the private beta.

### Leading indicators

- **Activation:** share of signups who send a first invoice within 7 days. Success 40%, stretch 55%.
- **Time to first invoice** (median). Success under 5 minutes, stretch under 3.
- **Payment profile attach rate:** share of sent invoices that carry payment instructions. Success 90%, stretch 97%.
- **View rate:** share of sent invoices opened by the client. Success 70%, stretch 85%.

### Lagging indicators

- **Days-to-paid:** median reduction against the freelancer's self-reported baseline after 90 days. Success 25%, stretch 40%.
- **Week-8 retention** of active senders. Success 35%, stretch 50%.
- **Paid conversion** of activated users within 60 days. Success 5%, stretch 10%.
- **Monthly active senders** six months after public launch. Success 150, stretch 500.

**Measurement:** product analytics events for every step of the create, send, view, claim and confirm funnel, plus a short onboarding survey for the days-to-paid baseline. Evaluate at 30, 60 and 90 days after launch.

## 13. Phasing and Timeline

Estimates assume one to two engineers and part-time design.

**Phase 0: Validate (weeks 0-2).** Interview 15-20 African freelancers across at least two countries, collect 10 real invoices, test willingness to pay, run a waitlist page, spike two technical risks (hosting latency from Lagos and Nairobi, and PDF rendering with WeasyPrint against Playwright), and confirm the brand name, domain and handles.

**Phase 1: MVP (weeks 3-10).** Build P0. Run a private beta with 20-30 freelancers from week 8.

**Phase 2: Launch and payments (weeks 11-18).** Public launch, integrated payments, deposits and milestones, and withholding tax.

**Phase 3: Expansion (weeks 19+).** Recurring and scheduled invoices, expenses, estimates, additional country rails, then API, CLI and agent integration.

**Dependencies and lead times:** payment processor business verification, merchant-of-record approval, sending-domain warm-up, and legal review of terms and privacy policy. Start these during Phase 0 and Phase 1 because they can take longer than the build.

**If capacity is tight, cut in this order:** line-item comments fall back to invoice-level comments, then the client revision banner, then proof upload. Reminders and payment profiles stay, since they are the core of the positioning.

## 14. Risks and Mitigations

- **Invoicing is a commodity.** Many generators exist. Mitigation: win on the payments loop, WhatsApp and local currencies; test the claim in Phase 0.
- **Low willingness to pay for invoicing.** Mitigation: free tier, small credit packs, and tying paid value to money-in features (reminders, integrated payments).
- **Processor and regulatory dependency.** Mitigation: use licensed processors, never hold funds, and get legal sign-off before P1.
- **Email deliverability and abuse.** Mitigation: share link and WhatsApp as primary channels, authenticated sending domain, rate limits and abuse reporting.
- **Multi-country complexity.** Mitigation: ship multi-currency from day one, but add country-specific rails and tax features only on demand.
- **Chat-based payment claims are unverifiable.** Mitigation: the freelancer always confirms; Bagg records claims but never marks Paid on its own until integrated payments exist.

## 15. Open Questions

### Blocking

1. **Stakeholder:** confirm Nigeria as the launch beachhead and pick the second market.
2. **Research:** do the target freelancers prefer sending by WhatsApp link over email and PDF? This decides channel priority.
3. **Engineering:** confirm the proposed stack in section 11 (or choose an all-TypeScript build), and choose hosting regions and the PDF renderer after the Phase 0 spikes.
4. **Legal:** are any licenses or registrations needed for integrated payment links in P1 when using Paystack or Flutterwave as processors?

### Non-blocking

5. **Data:** price points, free-tier limits and the credit pack structure.
6. **Legal:** do tax e-invoicing regimes apply to individual freelancers in the target markets?
7. **Engineering:** which merchant-of-record options accept a Nigerian-registered business for USD billing?
8. **Design:** sequential invoice numbers by default, or random IDs as Hagfish uses?
9. **Stakeholder:** is a Bagg footer on free-tier invoices acceptable, or does it hurt perceived professionalism?
10. **Stakeholder:** confirm Bagg name availability (domain, trademark, social handles).

## Appendix: Hagfish Reference Snapshot (as of October 20, 2026)

- Narrow invoicing tool for creators and freelancers, built by a solo founder.
- Features: invoices with branding, multi-currency, scheduled sending, recurring drafts, expense tracking, client management and onboarding invites, shareable invoices with real-time comments, PDF download and email delivery.
- Agent and developer layer: API, CLI and MCP integration, where an agent drafts and the human approves the exact action.
- Pricing: 40 free credits at signup; 200 credits for $1.99 or ₦2,000 (20 credits to unlock a PDF, 20 more to email it); Creator at $7.89 per month billed annually or ₦14,000 per year; Professional at $12.63 per month billed annually or ₦28,000 per year.
- Scale shown on its homepage: about 300 creators in 39 countries, roughly $196.8K and ₦55.9M invoiced.
- Stated limits: it does not collect client payments, and it avoids inventory, payroll and project tracking.
