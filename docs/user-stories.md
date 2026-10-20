# Bagg: End-to-End User Stories & Lifecycle Specifications

**Version:** 1.0  
**Target:** Engineering, QA, and Product Teams  
**Scope:** Complete Product Lifecycle (Onboarding → Invoicing → Delivery → Client Payment → Chasing → Verification → Monetization → Fast Follows)  
**Reference Document:** [Bagg PRD v0.1.md](../Bagg%20PRD%20v0.1.md)

---

## Table of Contents
1. [Overview & Personas](#1-overview--personas)
2. [Lifecycle 1: Freelancer Onboarding & Business Profile](#lifecycle-1-freelancer-onboarding--business-profile)
3. [Lifecycle 2: Multi-Currency Payment Profiles](#lifecycle-2-multi-currency-payment-profiles)
4. [Lifecycle 3: Client Management & Directory](#lifecycle-3-client-management--directory)
5. [Lifecycle 4: Invoice Drafting, Minor-Unit Math & Numbering](#lifecycle-4-invoice-drafting-minor-unit-math--numbering)
6. [Lifecycle 5: Multi-Channel Delivery & Immutability Versioning](#lifecycle-5-multi-channel-delivery--immutability-versioning)
7. [Lifecycle 6: Public Client Portal (Zero-Account Payer View)](#lifecycle-6-public-client-portal-zero-account-payer-view)
8. [Lifecycle 7: "I've Paid" Proof-of-Payment & Verification Loop](#lifecycle-7-ive-paid-proof-of-payment--verification-loop)
9. [Lifecycle 8: Automated Polite Chasing & Reminders](#lifecycle-8-automated-polite-chasing--reminders)
10. [Lifecycle 9: Multi-Currency Financial Dashboard & Tracking](#lifecycle-9-multi-currency-financial-dashboard--tracking)
11. [Lifecycle 10: Credits Ledger, Metering & Subscriptions](#lifecycle-10-credits-ledger-metering--subscriptions)
12. [Lifecycle 11: Phase 1 Fast-Follows (Integrated Rails & Taxes)](#lifecycle-11-phase-1-fast-follows-integrated-rails--taxes)
13. [Lifecycle 12: Data Rights, Compliance, Security & Auditability](#lifecycle-12-data-rights-compliance-security--auditability)

---

## 1. Overview & Personas

* **Freelancer (Sender):** African solo creator/operator (developer, designer, consultant, writer) billing local and international clients across NGN, USD, GBP, EUR, GHS, KES, ZAR. Mobile-first, busy, needs minimal administrative friction.
* **Client (Payer):** Business or individual paying the invoice. Accessed via private web link with **zero account creation** required.
* **System / Background Worker:** Asynchronous job runner handling scheduled email reminders, PDF compilation, webhooks, and ledger reservations.

---

## Lifecycle 1: Freelancer Onboarding & Business Profile

### US-ONB-01: Passwordless Sign Up & Onboarding
* **Role:** Freelancer
* **Story:** As a freelancer, I want to sign up with just my email address or Google account so that I can start drafting invoices immediately without a card or complex passwords.
* **Acceptance Criteria:**
  - Given an unauthenticated user enters their email, when they submit, a secure one-time magic link / 6-digit code is generated and delivered within 10 seconds.
  - Given the user clicks the magic link or enters the code, a new `User` and default `Workspace` record are created with a secure `httpOnly` session cookie.
  - The user lands on a guided first-invoice creation flow rather than an empty dashboard.
* **Priority:** P0 (MVP)

### US-ONB-02: Business Branding & Workspace Settings
* **Role:** Freelancer
* **Story:** As a freelancer, I want to save my business name, logo, brand color, country, address, and default currency once so that all my future invoices look professional.
* **Acceptance Criteria:**
  - Given a freelancer in workspace settings, they can upload a PNG/JPEG logo (max 2MB), set a primary hex color, and enter business contact info and optional Tax Identification Number (TIN).
  - Given a logo is uploaded, it is stored in S3/MinIO and served via a public CDN URL.
  - Given an invoice that was **already sent**, updating workspace branding **never retroactively modifies** the sent invoice (immutability rule). Only drafts reflect updated branding.
* **Priority:** P0 (MVP)

---

## Lifecycle 2: Multi-Currency Payment Profiles

### US-PAY-01: Save Bank and Digital Payment Rails per Currency
* **Role:** Freelancer
* **Story:** As a freelancer, I want to save distinct payout details for each currency (e.g. GTBank for NGN, PayPal/wire link for USD, M-Pesa for KES) so that I never have to retype banking details in client chats.
* **Acceptance Criteria:**
  - Given a freelancer in settings, they can add a payment profile for any supported currency (`NGN`, `USD`, `GBP`, `EUR`, `GHS`, `KES`, `ZAR`).
  - Available profile fields include:
    - **Bank Transfer:** Bank name, account holder name, account number, routing/sort code.
    - **Payment Link:** URL (e.g., Payoneer, PayPal, Stripe checkout).
    - **Mobile Money:** Mobile provider name, phone number, registered account name.
    - **Custom Instructions:** Freeform text (e.g., "Use INV-0001 as transfer remark").
  - A user can mark one profile as the default for that specific currency.
* **Priority:** P0 (MVP)

### US-PAY-02: Missing Payment Profile Warning on Draft
* **Role:** Freelancer
* **Story:** As a freelancer, I want Bagg to alert me if I draft an invoice in a currency without a saved payment profile so that I don't send an invoice my client cannot pay.
* **Acceptance Criteria:**
  - Given an invoice drafted in `KES` where no `KES` payment profile exists, when the freelancer taps "Send", a blocking modal prompts them: *"You haven't added payment instructions for KES. Add your M-Pesa or bank details so your client knows how to pay."*
  - The freelancer can either configure the profile inline or explicitly override to send with freeform notes.
* **Priority:** P0 (MVP)

---

## Lifecycle 3: Client Management & Directory

### US-CLI-01: Create and Manage Clients with Preferred Currency
* **Role:** Freelancer
* **Story:** As a freelancer, I want to save my clients' contact details, default currency, and payment terms so that subsequent invoices can be generated in under 60 seconds.
* **Acceptance Criteria:**
  - A client record requires: Billing Name, Preferred Currency (`NGN`, `USD`, etc.), and Default Payment Terms (default: 14 days).
  - Optional fields: Email, phone number, physical address, country, client tax ID.
  - **Phone-Only / WhatsApp Clients:** The email field must be optional. A client with only a phone number or name can be saved and invoiced via shareable link or WhatsApp.
* **Priority:** P0 (MVP)

### US-CLI-02: Client Invoice & Balance Summary
* **Role:** Freelancer
* **Story:** As a freelancer, I want to view a client's page and see their entire billing history so that I know their lifetime value and outstanding debt.
* **Acceptance Criteria:**
  - Client detail view displays:
    - Lifetime invoiced amount (grouped by currency).
    - Total paid amount.
    - Current outstanding balance.
    - List of all invoices associated with this client with status badges.
* **Priority:** P0 (MVP)

---

## Lifecycle 4: Invoice Drafting, Minor-Unit Math & Numbering

### US-INV-01: Sequential Invoice Numbering
* **Role:** Freelancer
* **Story:** As a freelancer, I want Bagg to automatically assign sequential, unique invoice numbers so that my accounting records remain organized and audit-compliant.
* **Acceptance Criteria:**
  - Invoices automatically increment based on workspace settings (e.g. `INV-0001`, `INV-0002`).
  - The prefix is customizable in settings (e.g. `SB-`, `2026-`).
  - Invoice numbers are strictly unique within each workspace (enforced by DB unique index).
* **Priority:** P0 (MVP)

### US-INV-02: Precise Financial Arithmetic in Minor Units (No Floats)
* **Role:** System / Engineering
* **Story:** As the Bagg financial calculation engine, I want to compute all totals in minor integer units (kobo, cents, pesewas) using half-up rounding so that invoices never have 1-cent discrepancy errors.
* **Acceptance Criteria:**
  - Line item total: $\text{quantity} \times \text{unit\_price\_minor}$
  - Subtotal: $\sum \text{line\_item\_totals}$
  - Discounted subtotal: $\max(0, \text{subtotal} - \text{discount\_minor})$
  - Tax (e.g. 7.5% VAT): $\text{round\_half\_up}(\text{discounted\_subtotal} \times \frac{\text{tax\_rate}}{100})$
  - Total: $\text{discounted\_subtotal} + \text{tax\_minor}$
  - All test vectors in [`fixtures/money-vectors.json`](file:///c:/dev/GitHub/ofili/bagg/fixtures/money-vectors.json) must pass without float approximations.
* **Priority:** P0 (MVP)

### US-INV-03: Real-Time Auto-Save and Preview
* **Role:** Freelancer
* **Story:** As a freelancer, I want my invoice draft to autosave continuously as I type so that I never lose work if my connection drops.
* **Acceptance Criteria:**
  - Changes to line items, notes, or dates are debounced and saved to the backend within 1 second.
  - A visual "Draft saved" indicator confirms state persistence.
  - A toggle allows the freelancer to view an exact live preview of what the client will see.
* **Priority:** P0 (MVP)

---

## Lifecycle 5: Multi-Channel Delivery & Immutability Versioning

### US-DEL-01: Private Cryptographic Share Link
* **Role:** Freelancer
* **Story:** As a freelancer, I want to generate a private, unguessable web link for each invoice so that I can send it via any chat app without forcing my client to log in.
* **Acceptance Criteria:**
  - Upon sending, Bagg generates a 32-byte cryptographic token (`token_urlsafe`).
  - The raw token is included in the URL (`/i/{token}`); the SHA-256 hash is stored in the database.
  - The freelancer can revoke or regenerate the link at any time from their dashboard.
* **Priority:** P0 (MVP)

### US-DEL-02: WhatsApp 1-Click Share
* **Role:** Freelancer
* **Story:** As a freelancer, I want to click a WhatsApp button to open a pre-filled chat with my client so that delivering the invoice takes one tap on my phone.
* **Acceptance Criteria:**
  - Clicking WhatsApp share triggers a `https://wa.me/{phone}?text={encoded_message}` intent.
  - Pre-filled message text:
    > *"Hi {client_name}, here is your invoice {invoice_number} for {formatted_total} from {business_name}: {share_link}. Due on {due_date}. Thanks!"*
  - Works on both mobile WhatsApp app and WhatsApp Web on desktop.
* **Priority:** P0 (MVP)

### US-DEL-03: Automated Email Delivery with Retries
* **Role:** Freelancer / Worker
* **Story:** As a freelancer, I want Bagg to email the invoice directly to the client's inbox so that formal corporate clients receive clean records.
* **Acceptance Criteria:**
  - Sent via Postmark/Resend/SMTP background queue.
  - Delivery status is tracked (`queued`, `delivered`, `opened`, `bounced`).
  - Transient SMTP failures retry 3 times with exponential backoff.
  - Hard bounces trigger an in-app warning offering the share link as a fallback.
* **Priority:** P0 (MVP)

### US-DEL-04: Deterministic PDF Generation & Caching
* **Role:** Freelancer & Client
* **Story:** As a freelancer or client, I want to download a crisp, professional PDF of the invoice so that accounting departments can archive it.
* **Acceptance Criteria:**
  - Rendered server-side using WeasyPrint / Playwright.
  - Once generated for an immutable version, the PDF binary is cached in S3/storage and served via CDN.
  - Matches the exact layout, font metrics, and branding of the web view.
* **Priority:** P0 (MVP)

### US-DEL-05: Immutability & Revision Banners
* **Role:** Client & Freelancer
* **Story:** As a client, I want to be certain that the invoice I am paying has not been silently altered behind my back.
* **Acceptance Criteria:**
  - Once an invoice moves from `draft` to `sent`, it is locked against direct in-place edits.
  - If the freelancer edits a sent invoice, a new `InvoiceRevision` is created (e.g. Rev 2).
  - When the client opens the link, an informational top banner states: *"This invoice was revised on {date}. View original version."*
* **Priority:** P0 (MVP)

---

## Lifecycle 6: Public Client Portal (Zero-Account Payer View)

### US-CLV-01: Zero-Friction Mobile Invoice Loading
* **Role:** Client (Payer)
* **Story:** As a client opening an invoice link on my phone, I want the page to load instantly without prompting me to register, log in, or install an app.
* **Acceptance Criteria:**
  - Initial HTML + CSS payload loads in under 1.5 seconds on 3G connections.
  - Total first-load JavaScript budget under 110 KB.
  - Displays business name, logo, issue/due dates, itemized table, and total payable in the invoice currency.
* **Priority:** P0 (MVP)

### US-CLV-02: 1-Tap Copy for Local Bank Details
* **Role:** Client (Payer)
* **Story:** As a client making a mobile bank transfer in Nigeria (or other African market), I want to copy the account number with one tap so that I don't mistype numbers when switching to my banking app.
* **Acceptance Criteria:**
  - Prominent card titled: *"How to Pay in {Currency}"*.
  - Account Number, Bank Name, and Account Holder Name have individual copy buttons.
  - Tapping copy immediately updates the button icon to a green checkmark and triggers a native toast: *"Account number copied"*.
* **Priority:** P0 (MVP)

### US-CLV-03: Line-Item Question & Comment Thread
* **Role:** Client (Payer)
* **Story:** As a client, I want to leave a question directly on a specific line item so that discrepancies are resolved quickly without messy email back-and-forths.
* **Acceptance Criteria:**
  - Client can tap "Ask a question" on any line item or at the invoice level.
  - Client enters their name and comment text; comment appears immediately in the thread.
  - Freelancer receives an email and in-app notification with a direct link to reply.
* **Priority:** P0 (MVP)

### US-CLV-04: Viral Acquisition Footer
* **Role:** System / Bagg Marketing
* **Story:** As Bagg, I want all free-tier client invoices to carry a tasteful footer so that clients who are also freelancers/creators discover and adopt Bagg.
* **Acceptance Criteria:**
  - On the free plan, invoices show: *"Powered by bagg. — Invoicing & get-paid workspace for African creators"*.
  - Clicking the footer links to the Bagg landing page with UTM tracking tags.
  - Pro subscribers have the Bagg footer removed automatically.
* **Priority:** P0 (MVP)

---

## Lifecycle 7: "I've Paid" Proof-of-Payment & Verification Loop

### US-CLM-01: Client Submits "I've Paid" Claim
* **Role:** Client (Payer)
* **Story:** As a client who just completed a bank transfer, I want to tap "I've Paid" and submit my transaction reference/proof so that the freelancer knows to check their account and send a receipt.
* **Acceptance Criteria:**
  - Client taps the primary *"I Have Paid This Invoice"* button.
  - Modal form collects:
    - Amount transferred (pre-filled with total due, editable for partial payments).
    - Date of payment.
    - Transaction Reference / Session ID / Narration remark.
    - Optional proof upload (image or PDF receipt up to 5MB uploaded via presigned S3 URL).
  - On submission:
    - Invoice status immediately updates from `viewed` to `payment_claimed`.
    - Client view updates with confirmation banner: *"Payment claim submitted. The freelancer will verify and issue your receipt."*
* **Priority:** P0 (MVP)

### US-CLM-02: Freelancer Verification (Confirm vs Reject)
* **Role:** Freelancer
* **Story:** As a freelancer, I want to review the client's payment claim and proof so that I only mark invoices as paid when funds actually arrive in my bank.
* **Acceptance Criteria:**
  - Freelancer receives instant notification with claim details and uploaded proof image.
  - In their dashboard, the freelancer can choose:
    1. **Confirm Full Payment:** Invoice status transitions to `paid`. Paid date is locked, and an official PDF receipt is generated and emailed to the client.
    2. **Confirm Partial Payment:** Freelancer inputs actual amount received. Invoice status transitions to `partially_paid`. Remaining balance is recalculated and displayed on the client view.
    3. **Reject Claim:** Freelancer enters an explanation (e.g., *"Funds have not cleared into GTBank yet"*). Invoice reverts to previous status, and the client view displays the rejection note.
* **Priority:** P0 (MVP)

---

## Lifecycle 8: Automated Polite Chasing & Reminders

### US-REM-01: Scheduled Polite Email Reminders
* **Role:** System / Background Worker
* **Story:** As a freelancer, I want Bagg to automatically send courteous payment reminders so that I don't have to experience the social awkwardness of chasing late clients.
* **Acceptance Criteria:**
  - Default reminder cadence:
    - 3 days before due date (Upcoming)
    - On the due date (Due today)
    - 3 days after due date (Overdue polite nudge)
    - 7 days after due date (Firm overdue reminder)
  - Emails are warm, polite, and include the direct payment link.
  - **Auto-Stop Guarantee:** The moment an invoice moves to `payment_claimed`, `paid`, or `void`, all future scheduled reminders are permanently canceled.
  - A client is never sent more than 1 automated email per 24 hours.
* **Priority:** P0 (MVP)

### US-REM-02: 1-Tap WhatsApp Nudge for Freelancer
* **Role:** Freelancer
* **Story:** As a freelancer whose client ignores email, I want Bagg to notify me with a pre-composed WhatsApp message when an invoice becomes overdue so that I can nudge them in chat with one click.
* **Acceptance Criteria:**
  - When an invoice becomes 3 days overdue, the freelancer receives an alert: *"INV-0001 for Acme Global is overdue. Nudge on WhatsApp?"*
  - Tapping "Send Nudge" opens WhatsApp with polite pre-filled text referencing the invoice number, amount, and link.
* **Priority:** P0 (MVP)

### US-REM-03: Reliable Job Claiming via PostgreSQL `SKIP LOCKED`
* **Role:** System / Engineering
* **Story:** As the Bagg worker infrastructure, I want reminder jobs to be claimed from PostgreSQL using `SELECT ... FOR UPDATE SKIP LOCKED` so that no reminder is ever duplicated or lost during Redis/worker restarts.
* **Acceptance Criteria:**
  - Scheduled jobs store `due_at`, `status`, and `idempotency_key` in PostgreSQL.
  - Multiple worker processes can run concurrently without race conditions.
  - Failed job runs record error traces and retry up to 3 times before dead-lettering.
* **Priority:** P0 (MVP)

---

## Lifecycle 9: Multi-Currency Financial Dashboard & Tracking

### US-DSH-01: Currency-Segregated Metrics
* **Role:** Freelancer
* **Story:** As a freelancer billing in both NGN and USD, I want my dashboard to display totals strictly grouped by currency so that foreign exchange and domestic balances are never confused.
* **Acceptance Criteria:**
  - Dashboard breaks down metrics by currency cards:
    - **Outstanding:** Invoices sent/viewed but unpaid.
    - **Overdue:** Invoices past due date.
    - **Paid this Month:** Total confirmed revenue for the current calendar month.
  - Totals across different currencies are **never summed together** (no fake conversions).
* **Priority:** P0 (MVP)

### US-DSH-02: Complete Invoice State Machine & Filter
* **Role:** Freelancer
* **Story:** As a freelancer, I want to filter my invoices by lifecycle state so that I know exactly which invoices need action.
* **Acceptance Criteria:**
  - Filterable statuses:
    - `draft`: Work in progress.
    - `sent`: Delivered, unread.
    - `viewed`: Client has opened the link.
    - `payment_claimed`: Client clicked "I've paid", awaiting freelancer review.
    - `partially_paid`: Received deposit or partial installment.
    - `paid`: Fully settled with receipt.
    - `overdue`: Past due date without payment claim.
    - `void`: Canceled invoice.
* **Priority:** P0 (MVP)

---

## Lifecycle 10: Subscription & Monetization Lifecycle

### US-SUB-01: Free Tier Metering & Delivery Quotas
* **Role:** Freelancer
* **Story:** As a new freelancer, I want to use Bagg for free to draft invoices, manage clients, and share via web links and WhatsApp so that I experience immediate value before paying.
* **Acceptance Criteria:**
  - Free Tier includes:
    - Unlimited invoice drafting and client records.
    - Unlimited web share links and WhatsApp click-to-share.
    - Full "I've paid" proof submission and verification flow.
    - Small Bagg viral acquisition footer on public client view.
    - 3 free PDF/email delivery sends per month (resets on 1st of each calendar month).
  - Attempting to send a 4th email/PDF prompts for a credit pack top-up or Creator Pro upgrade.
* **Priority:** P0 (MVP)

### US-SUB-02: Local Currency Subscription Checkout (Paystack & MoR)
* **Role:** Freelancer
* **Story:** As an active freelancer, I want to upgrade to Creator Pro (₦14,000/yr) or Professional (₦28,000/yr) using my local debit card in NGN or card in USD so that I can invoice without limits.
* **Acceptance Criteria:**
  - Plan comparison modal clearly displays features:
    - **Creator Pro:** Unlimited PDF & email sends, no Bagg footer branding, custom reminder schedules.
    - **Professional:** All Pro features plus priority queueing and multi-currency bank account switching.
  - Checkout integrates Paystack Inline modal for NGN (cards, bank transfer, USSD) and Merchant-of-Record (MoR) for USD.
  - Generates an `idempotency_key` and initializes customer subscription code on Paystack.
* **Priority:** P0 (MVP)

### US-SUB-03: Instant Webhook Provisioning & Entitlement Activation
* **Role:** System / Engineering
* **Story:** As the billing engine, I want to process processor webhooks asynchronously and idempotently so that the freelancer's paid entitlements unlock immediately upon payment.
* **Acceptance Criteria:**
  - Webhook listener receives `subscription.create` or `charge.success` from Paystack.
  - Raw payload signature (HMAC SHA512) is verified before processing.
  - Event is saved to `webhook_events` table for idempotency.
  - Table `subscriptions`: updates `tier = 'creator_pro'`, `status = 'active'`, `current_period_start`, and `current_period_end`.
  - Invoices for this workspace immediately cease displaying the Bagg footer.
* **Priority:** P0 (MVP)

### US-SUB-04: Recurring Renewals, Dunning & Grace Period
* **Role:** Freelancer & System
* **Story:** As a subscriber whose debit card expires or fails at renewal, I want a grace period with polite email alerts so that my invoices are not abruptly disrupted.
* **Acceptance Criteria:**
  - Paystack attempts annual renewal charge.
  - If charge fails:
    - Status transitions from `active` to `past_due`.
    - Freelancer enters a 3-day grace period where Pro entitlements remain active.
    - System emails polite dunning notice: *"Your Bagg Pro renewal failed. Please update your payment card within 3 days."*
  - Paystack retries charge up to 3 times over 72 hours.
  - If unrecovered after grace period, status transitions to `downgraded` / `free`. No past data is deleted; Bagg footer reappears on future sends.
* **Priority:** P0 (MVP)

### US-SUB-05: Self-Serve In-App Subscription Management & Cancellation
* **Role:** Freelancer
* **Story:** As a subscriber, I want to view my renewal date, download payment receipts, or cancel auto-renew at any time without having to contact support.
* **Acceptance Criteria:**
  - Settings > Billing shows: Active Plan, Next Billing Date, Payment Method on file, and VAT-compliant receipt download link.
  - Clicking "Cancel Subscription" opens a confirmation modal.
  - Upon cancellation:
    - Status transitions to `canceled`.
    - Paystack recurring mandate is disabled.
    - **Retained Benefits:** Freelancer retains Pro benefits until the end of their paid annual billing cycle (`current_period_end`).
* **Priority:** P0 (MVP)

### US-SUB-06: Pay-As-You-Go Credit Packs & Append-Only Ledger
* **Role:** Freelancer & System
* **Story:** As an occasional sender who doesn't need an annual subscription, I want to buy a 200-credit top-up pack for ₦2,000 so that I can send PDFs and emails as needed.
* **Acceptance Criteria:**
  - Pack purchase (e.g. 200 credits for ₦2,000) creates an entry in `credit_ledger_entry`.
  - Ledger schema: `id`, `workspace_id`, `amount`, `balance_after`, `reason` (`pack_purchase`, `send_deduction`, `failed_refund`), `created_at`.
  - All credit reservations and deductions occur within PostgreSQL transactions with row-level locks.
  - Metered email failure triggers an automatic refund ledger entry.
  - Balance can never drop below zero.
* **Priority:** P0 (MVP)

---

## Lifecycle 11: Phase 1 Fast-Follows (Integrated Rails & Taxes)

### US-INT-01: Integrated Direct Payer Checkout (Paystack / Flutterwave)
* **Role:** Client & Freelancer
* **Story:** As a client, I want to pay directly on the invoice page via Debit Card, Apple Pay, or Virtual Bank Transfer so that payment reconciles automatically in seconds.
* **Acceptance Criteria:**
  - The client view displays a *"Pay with Card / Bank Transfer"* button.
  - Funds settle directly to the freelancer's verified merchant subaccount (Bagg never holds funds).
  - Paystack/Flutterwave webhook reconciles the payment, marks invoice as `paid`, and issues an instant receipt with zero manual freelancer intervention.
* **Priority:** P1 (Fast Follow)

### US-INT-02: Milestone Payments & Upfront Deposits
* **Role:** Freelancer
* **Story:** As a freelancer starting a large project, I want to invoice for a 50% upfront deposit and 50% upon completion on a single invoice record.
* **Acceptance Criteria:**
  - Freelancer can configure milestone breakdown (e.g. 50% deposit required to start).
  - Client view shows "Deposit Due Today: {amount}" and "Total Project Value: {amount}".
  - Receiving the deposit updates status to `partially_paid` and tracks the remaining balance.
* **Priority:** P1 (Fast Follow)

### US-INT-03: Withholding Tax (WHT) Tracking
* **Role:** Freelancer billing corporate clients
* **Story:** As a Nigerian freelancer invoicing registered companies, I want to specify Withholding Tax (e.g. 5% or 10%) so that the invoice shows the exact net payable amount and tracks tax credit notes.
* **Acceptance Criteria:**
  - Invoice breakdown displays: Gross Total, Less Withholding Tax (WHT @ 5%), Net Payable to Freelancer.
  - Freelancer can log the WHT credit note number when received from the client for tax filing.
* **Priority:** P1 (Fast Follow)

---

## Lifecycle 12: Data Rights, Compliance, Security & Auditability

### US-SEC-01: One-Click Data Export & Portability
* **Role:** Freelancer
* **Story:** As a freelancer, I want to export all my client lists, invoices, and payment histories as CSV and ZIP files so that I stay in full control of my financial records.
* **Acceptance Criteria:**
  - Export action generates a CSV of all invoice records and client records.
  - Option to download a ZIP containing all generated invoice PDFs.
  - Completed within 30 seconds without requiring customer support.
* **Priority:** P0 (MVP)

### US-SEC-02: Abuse Reporting & Phishing Protection
* **Role:** Client & System
* **Story:** As an invoice recipient, I want a way to report suspicious or fraudulent invoices so that Bagg cannot be abused for email phishing scams.
* **Acceptance Criteria:**
  - Every client share page contains a subtle link: *"Report this invoice as suspicious"*.
  - Submitting an abuse report flags the workspace for admin review and restricts outbound automated emails pending inspection.
  - Outbound email sending domain is authenticated with SPF, DKIM, and DMARC.
* **Priority:** P0 (MVP)

### US-SEC-03: Right to Erasure (Account Deletion)
* **Role:** Freelancer
* **Story:** As a user, I want to delete my account and all associated client data in compliance with the Nigeria Data Protection Act (NDPA 2023) and global privacy regulations.
* **Acceptance Criteria:**
  - Freelancer can initiate account deletion from settings with a confirmation password/code.
  - Active workspaces, clients, and invoice links are immediately invalidated.
  - Encrypted backups are hard-deleted in accordance with the documented 30-day retention schedule.
* **Priority:** P0 (MVP)

---

## 13. Summary Matrix & Implementation Status

| Lifecycle Phase | Stories | MVP (P0) | Fast Follow (P1) | Status |
| :--- | :--- | :---: | :---: | :---: |
| **1. Onboarding & Profile** | Magic link login, branding, logo upload | ✅ 2 stories | — | **Completed & Pushed** (`5639a45`) |
| **2. Payment Profiles** | Multi-currency bank & digital rail setup, missing profile guard | ✅ 2 stories | — | **Completed & Pushed** (`5639a45`) |
| **3. Client Directory** | Clients with preferred currencies, phone-only WhatsApp support, balance stats | ✅ 2 stories | — | **Completed & Pushed** (`6045edf`) |
| **4. Invoice Drafting** | Sequential numbering, minor-unit integer math, autosave preview | ✅ 3 stories | — | **Completed & Pushed** (`50b3388`) |
| **5. Delivery & Versioning** | Share link, WhatsApp 1-click, email worker, PDF cache, revision banner | ✅ 5 stories | — | **Completed & Pushed** (`35da767`) |
| **6. Client Portal** | Instant mobile load, 1-tap bank copy, line comments, viral footer | ✅ 4 stories | — | **Completed & Pushed** (`cc20d9a`) |
| **7. "I've Paid" Loop** | Client proof submission modal, freelancer confirm/reject/receipt | ✅ 2 stories | — | **Completed & Pushed** (`ac8a1f2`) |
| **8. Automated Chasing** | Scheduled polite emails, 1-tap WhatsApp nudge, Postgres SKIP LOCKED worker | ✅ 3 stories | — | **Completed & Pushed** (`aba38b2`) |
| **9. Financial Dashboard** | Segregated multi-currency cards, full 8-state machine filtering | ✅ 2 stories | — | **Completed & Pushed** (`5c44236`) |
| **10. Subscription & Billing** | Free metering, Paystack/MoR checkout, webhooks, dunning/grace period, cancellations, credits | ✅ 6 stories | — | **Completed & Pushed** (`6ff3fb6`) |
| **11. Phase 1 Rails & Taxes** | Direct payment links, milestone deposits, withholding tax (WHT) | — | ✅ 3 stories | **Completed & Pushed** (`dd63e5f`) |
| **12. Security & Rights** | Full CSV/ZIP export, abuse reporting, NDPA account deletion | ✅ 3 stories | — | **Completed & Pushed** (`6f01bb2`) |
| **Total** | **34 E2E Stories** | **31 P0 Stories** | **3 P1 Stories** | **100% Shipped to `dev`** |
