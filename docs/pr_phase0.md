## Phase 0: Integrity Fixes

Fixes 6 correctness bugs identified in the activation/retention spec audit against `f785240`. No new features; all changes are data-truth and contract fixes.

---

### P0-1 — Invoice & quote number not consumed by drafts

**`apps/api/app/domains/invoices/service.py`**  
`finalize_invoice` was unconditionally reassigning `invoice_number` even when one was already assigned at draft-creation time. Every draft that was later finalized burned a second sequence number.

Fix: only assign `invoice_number` (and increment `next_invoice_number`) when `invoice.invoice_number is None`.

**`apps/api/app/domains/quotes/service.py`**  
Same guard added to `finalize_quote`.

---

### P0-2 — `sent` only means actually dispatched

**`apps/api/app/domains/invoices/service.py`** · **`apps/api/app/domains/quotes/service.py`**  
Both `send_invoice` and `send_quote` unconditionally set `status='sent'` and `sent_at` regardless of whether an email was sent (`send_email=False` or SMTP failure). A share-link copy on the quote page was also flipping the quote to `sent`.

Fix: `status='sent'` and `sent_at` are only set when `email_sent is True`.

---

### P0-3 — Metering atomicity (no post-send 402)

**`apps/api/app/domains/billing/service.py`**

`check_delivery_quota` now returns a `bool`:
- `False` → free tier still within allowance, or paid tier (no deduction needed)
- `True` → credit must be deducted after successful delivery
- raises `402` → allowance exhausted, no credits

`consume_delivery_send` now accepts `deduct_credit: bool = False` and only deducts when the flag is `True`. The post-send `get_free_sends_used_this_month` re-count is gone, eliminating the off-by-one 402 that fired after the email had already been sent.

Callers (`send_invoice`, `send_quote`) capture the return value and pass it through.

---

### P0-4 — `quotes/service.py` logger `NameError`

`logger.warning(...)` was used on the notification failure path but `logging` was never imported. Any notification failure in the public quote view triggered a `NameError`.

Fix: added `import logging` and `logger = logging.getLogger(__name__)` at the top of the file.

---

### P0-5 — Dashboard empty-state CTA unreachable for new users

**`apps/web/src/app/(app)/dashboard/NewQuoteDesktop.tsx`**

`isEmpty` checked `metrics.length === 0`, but the invoices-metrics API always seeds an NGN row for every workspace, so new users always had `metrics.length === 1` and the onboarding CTA never rendered.

Fix:
```ts
const isEmpty =
    !loading &&
    !failed &&
    (metrics.length === 0 || metrics.every((m) => (m.invoices_count ?? 0) === 0));
```

---

### P0-6 — Signup signal for analytics

**`apps/api/app/domains/auth/schemas.py`** — `AuthResponse` gains `is_new_user: bool = False`  
**`apps/api/app/domains/auth/service.py`** — `verify_login` detects new-user creation and returns a 4-tuple `(User, Workspace, str, bool)`  
**`apps/api/app/domains/auth/router.py`** — unpacks the 4-tuple and passes `is_new_user` through `AuthResponse`

This is the event source ACT-001 (`auth.signup_completed`) needs.

---

### Tests

All 96 backend tests pass. TypeScript: 0 errors.
