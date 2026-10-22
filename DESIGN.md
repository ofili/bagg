# Bagg design system

Version 0.1 · 22 October 2026 · Owner: Lewis

This file is the source of truth for how Bagg looks, reads and behaves. Designers, engineers and AI coding tools should read it before building or changing any screen, email, PDF or marketing page. If a screen and this file disagree, fix the screen or update this file in the same change.

Bagg helps creatives, freelancers and independent consultants get paid. The product is warm and playful at the edges and calm and exact wherever money is involved. Everything below serves that one idea.

Status notes:
- Values marked "estimate" were calculated by hand during design and must be re-checked in the real build.
- Currency glyph coverage for the chosen font must be verified in the build (see section 4.4).
- Dropbox, Box and Microsoft integration rules are not covered here.

---

## 1. Principles

1. **Money first, joy around.** Colour, stickers and humour live at the edges: onboarding, empty states, success moments, marketing. Amounts, tables and client documents stay clean.
2. **Calm when it matters.** Payment screens, failures and overdue notices are plain, white or cream, and reassuring. Never alarming, never cute.
3. **Show every cost before it is paid.** Fees, conversion and the amount received appear above the confirm button, and the button repeats the amount.
4. **Status is text, not just colour.** Every status has a word. Colour only reinforces it.
5. **Clients never need an account.** Client-facing pages are public, mobile first, and work with no sign-in.
6. **One family, one voice.** One typeface, one tone (the friendly big sister), one way of doing each thing.
7. **Spend boldness in one place.** The orange is the memorable thing. Everything around it stays quiet. When in doubt, remove a decoration.
8. **Never claim what is not built.** Trust and security copy ships only when it is true.

---

## 2. Brand

**Name.** bagg, always lowercase in the wordmark and in headlines.

**Logo.** Two lockups, used in different places.
- **App icon and favicon:** the sticker coin. An orange circle with a dashed dark-brown border, a lowercase b in dark brown, rotated about 8 degrees counter-clockwise.
- **Wordmark lockup (website, documents, emails, footers):** lowercase "bagg" in the brand typeface at weight 800, with a pink squiggle underneath.
- The bag mark (orange rounded bag with a pink handle and a small smile) is the product character, not a logo. It appears in empty states and the 404 page, not in navigation.

**Clear space.** Keep at least the height of the lowercase letter "g" free on every side of the wordmark. Minimum wordmark height is 16 px on screen.

**Never.** Recolour the coin, stretch the wordmark, place the wordmark on a busy photo, or put the squiggle under anything except the wordmark and one headline per screen.

---

## 3. Colour

### 3.1 Brand palette (Mango Sunrise)

| Token | Hex | Role |
|---|---|---|
| mango | #FF7A1A | Anchor colour. Primary buttons, selected states, the earnings card. |
| pink | #FF4F8B | Accent. Squiggles, secondary primary actions in the freelancer app, rare highlights. |
| sun | #FFC933 | Due soon, awaiting, caution (non-blocking). |
| leaf | #1FA971 | Paid. Used only for paid and success meaning. |
| cocoa | #3A1F0A | Text on light surfaces, outlines, the dark ink for stickers. |
| cream | #FFF8EE | Page background in the freelancer app and marketing. |
| danger | #B3261E | Destructive actions only. Sits outside the playful palette on purpose. |

Rules:
- Text on mango uses #2B1405. Text on pink uses #3D0618. Never white on mango or pink.
- Green means paid or success. Do not use it for decoration or for generic "good" states that are not about money or completion.
- Danger red is for destructive buttons and errors that need action. Overdue states use the soft late tones below, not danger.
- Pink and mango never touch as large adjacent fills. Separate them with cream, white or cocoa.

### 3.2 Neutrals (light)

| Token | Hex | Use |
|---|---|---|
| bg | #FFF8EE | App and marketing background |
| surface | #FFFFFF | Cards, rows, inputs, client pages |
| surface-sunken | #FBF1E2 | Table headers, info strips, locked rows |
| surface-tint | #F6E8D4 | Segmented control track, skeleton base |
| border | #E3D6C4 | Inputs and outlines |
| border-subtle | #F1DFC6 | Card and row borders |
| text | #3A1F0A | Primary text |
| text-soft | #6B5642 | Secondary body text |
| text-muted | #8A6A50 | Captions, labels, placeholders |
| link | #8A3D0C | Text links and quiet actions |
| peach | #FFE9D6 | Highlight strips, suggested reminder, nudge cards |
| peach-chip | #FFE3CC | Variable chips, avatars, default tag |

### 3.3 Status tokens

Each status has a pill background and text colour. The word is always shown.

| Status | Pill background | Pill text | Notes |
|---|---|---|---|
| paid | #1FA971 | #052E1B | Solid pill. Soft variant: #D8F5E6 with #0F6B45. |
| due soon | #FFC933 | #4A3200 | |
| late | #FFB3B3 | #5A1010 | Row highlight is warm (#FFF4E6), never red. Text-only mentions use #B3261E. |
| draft | #E6DAC6 | #5A4A35 | |
| awaiting approval | #FFC933 | #4A3200 | Used for milestones. |
| pending (transfer) | #FFF1C2 | #8A6200 | |
| upcoming | #E6DAC6 | #5A4A35 | |
| accepted | #E6DAC6 | #5A4A35 | Quotes. |
| voided or not active | #EFE6D8 | #8A6A50 | |

### 3.4 Dark mode tokens

Dark mode is a warm brown-black, never pure black. Brand colours stay the same. Neutrals and status text swap.

| Token | Light | Dark |
|---|---|---|
| bg | #FFF8EE | #1A110A |
| surface | #FFFFFF | #261A12 |
| border | #E3D6C4 | #3A2A1E |
| text | #3A1F0A | #FFF1E0 |
| text-muted | #8A6A50 | #BFA88F |
| paid text | #1FA971 | #3DD598 |
| late text | #B3261E | #FFB3A8 |
| overdue card | #FFE9E6 | #3A1F1B (border #5A2E28) |
| nudge or peach card | #FFE9D6 | #3A2616 |

Mango and pink buttons keep their dark label text in dark mode. Client-facing pages follow the viewer's device setting. PDFs are always light.

### 3.5 Contrast (estimates)

- Cocoa-dark text on mango: about 6.7 to 1.
- Dark text on pink: about 5.5 to 1.
- Dark text on the green paid pill: about 4.9 to 1.
- Muted text (#8A6A50) on cream: about 4.7 to 1. This only just passes AA for normal text, so muted text must never go lighter.

Re-check all pairs with a contrast tool in the real build. Any new colour pair must reach 4.5 to 1 for text under 18 px and 3 to 1 for large text and UI outlines.

### 3.6 User accent colour (documents and emails)

Freelancers can choose an accent in Settings. Options: mango (default), pink, green, plum (#5B3FA8), charcoal (#2B2B2B). The accent colours the word "invoice", the pay button and small highlights on documents and emails. Button text switches to white automatically on plum and charcoal. The picker must reject any accent that fails 4.5 to 1 against its button label.

---

## 4. Typography

### 4.1 Family

**Bricolage Grotesque**, one family for everything in the product, the marketing site and PDFs. Weights used: 400 (body), 500 (labels and names), 800 (headlines, amounts, buttons). Do not use other weights.

Fallback stack for the web: `"Bricolage Grotesque", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif`.

Email uses system fonts only (see section 12), because most email apps ignore web fonts.

No script or handwritten fonts anywhere. Hand-drawn character comes from doodles and stickers, never from lettering.

### 4.2 Scale

Sizes are real product sizes, not the shrunken sizes in early previews.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| display | 40 / 40 desktop, 32 / 34 phone | 800 | Marketing hero, lowercase |
| title-l | 28 / 30 | 800 | Screen titles, lowercase |
| title | 22 / 26 | 800 | Section titles, modal titles |
| heading | 18 / 22 | 800 | Card titles |
| body-l | 16 / 24 | 400 | Default body |
| body | 14 / 20 | 400 | Rows, secondary text |
| label | 14 / 18 | 500 | Names, field labels |
| caption | 12 / 16 | 400 | Captions, helper text. The smallest allowed size. |

Amounts:

| Style | Size / line height | Weight |
|---|---|---|
| amount-xl | 40 / 44 | 800 |
| amount-l | 28 / 32 | 800 |
| amount-m | 20 / 24 | 800 |
| amount-s | 16 / 20 | 800 |

### 4.3 Rules

- Headlines and screen titles are lowercase (for example "hey ada", "send. chase. get paid."). Buttons, labels and body copy use sentence case.
- No all-caps labels. No tracked-out eyebrow text above headings.
- Keep body lines under 70 characters on wide screens.
- Use tabular numerals for amounts in tables so digits align (`font-variant-numeric: tabular-nums`, if the font provides them).
- Right-align amounts in tables and lists.
- Never accent a single word in a headline with a different colour or italic.

### 4.4 Currency glyph check (required)

Bagg shows ₦, $, £ and €. Every one must render in Bricolage Grotesque itself, not a fallback font. Verify in the build, in every weight used. A quick browser test: measure the glyph with a serif fallback and a monospace fallback; if the widths differ, the font is missing the glyph.

```js
function hasGlyph(font, ch) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `800 40px "${font}", serif`;
  const a = c.measureText(ch).width;
  c.font = `800 40px "${font}", monospace`;
  const b = c.measureText(ch).width;
  return Math.abs(a - b) < 0.5;
}
['₦','$','£','€'].every(ch => hasGlyph('Bricolage Grotesque', ch));
```

If any glyph is missing, switch the family to Plus Jakarta Sans (after running the same test) or add a subset font that supplies the missing symbol and matches the weight. Do not let the browser silently substitute.

---

## 5. Layout, spacing and shape

### 5.1 Spacing

Base unit 4 px. Allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Screen padding is 16 px on phone, 24 px on tablet, 32 px on desktop.

### 5.2 Breakpoints

| Name | Width | Navigation | Lists |
|---|---|---|---|
| phone | under 640 | Bottom tab bar (Home, Docs, Clients, Balance) | Cards, one per document |
| tablet | 640 to 1023 | Icon rail on the left | Table with 3 or 4 columns |
| desktop | 1024 and up | Labelled sidebar | Full table plus a side panel on row click |

Max content width 1200 px. Client pages: payment 480 px, documents and portal 720 px, centred.

### 5.3 Radius

| Token | Value | Use |
|---|---|---|
| pill | 999 px | Buttons, chips, segmented controls, toggles |
| card | 16 px | Summary cards, hero cards, earnings card |
| row | 12 px | List rows, document cards, file rows |
| input | 10 px | Text fields, selects |
| small | 8 px | Status pills, stickers, thumbnails |
| sheet | 20 px (top corners) | Bottom sheets and modals |

Do not use one radius for everything. Radius follows the size and role of the element.

### 5.4 Borders and elevation

Prefer borders to shadows. Cards and rows use a 0.5 to 1 px border in `border-subtle`. Inputs use `border`. The only shadow is for sheets and modals: `0 -8px 24px rgba(58, 31, 10, 0.12)`. Modal backdrop is `#7A6A58` at 70 percent (light) or black at 60 percent (dark).

---

## 6. Iconography and illustration

### 6.1 Icons

Use one outline icon set (Tabler Icons) at 16, 18 or 22 px with a 1.5 px stroke. Icons always sit beside or inside a label unless the action is universally known (close, back, search). Icon-only buttons need an accessible name and a 44 px hit area.

Standard icons: home, file-invoice (documents), users (clients), wallet (balance), settings, plus, check, circle-check, alert-circle, alert-triangle, clock, lock, link-off, wifi-off, shield-check, building-bank, credit-card, device-mobile.

### 6.2 Stickers and doodles

Stickers are the signature playful element. They follow strict rules.

| Sticker | Look | Where it appears |
|---|---|---|
| Paid stamp | The word "paid" in a double-border box, green on soft green, rotated about 6 to 9 degrees | Paid invoice rows, receipts, the success page |
| Milestone star | Yellow five-point star with a dark outline, rotated about 8 degrees | First invoice sent, first payment received, project completed |
| Locked milestone | The same star in grey with a dashed outline | Onboarding empty state |
| Bag character | Orange rounded bag, pink handle, dot eyes, pink cheeks, small smile | Empty states, onboarding, 404 (sleepy eyes) |
| Squiggle | Pink wavy line under a headline | One per screen, under the greeting or main title |

Rules:
- Stickers never carry meaning alone. A paid stamp always sits beside the word status or amount.
- Never put stickers on a client-facing invoice or quote. A small paid stamp is allowed on receipts and the success page.
- Never use more than one celebratory element on screen at a time.
- Every sticker has a text description for screen readers.
- Doodles are drawn with simple rounded strokes, 2 to 2.5 px, in pink or cocoa.

### 6.3 Photography

Marketing uses real freelancers in their own settings (Lagos, Nairobi, Accra and beyond). No stock handshake photos. Until real customer stories exist, show the product itself (a live invoice preview) instead of stock imagery.

---

## 7. Motion

| Moment | Duration | Easing | Notes |
|---|---|---|---|
| Micro (press, toggle) | 120 ms | ease-out | |
| Standard (expand, tab change) | 200 ms | cubic-bezier(0.2, 0.8, 0.2, 1) | |
| Sheets and modals | 320 ms | cubic-bezier(0.2, 0.8, 0.2, 1) | Slide up on phone, fade and scale on desktop |
| Paid stamp | 400 ms | spring | Scales down and settles into place, once |
| Confetti | up to 1.5 s | | Only for first invoice paid and project completion |

Rules:
- Motion answers a user action or marks a milestone. No entrance animations on every section and no hover transitions on every card.
- Honour reduced motion. With it on, celebrations become a static sticker and sheets simply appear.
- Never animate amounts counting up on a money screen.

---

## 8. Components

All interactive targets are at least 44 by 44 px, even when the visible element is smaller.

### 8.1 Buttons

| Variant | Fill | Label | Use |
|---|---|---|---|
| primary | mango | #2B1405, weight 800 | The one main action on a screen |
| accent | pink | #3D0618, weight 800 | The main action on freelancer-side home screens (for example New invoice). Never on client pages. |
| outline | transparent, 1.5 px cocoa border | cocoa, weight 800 | Secondary action |
| link | none | link colour, weight 800 | Tertiary actions (Send a nudge, Edit) |
| danger | #B3261E | white | Destructive confirmations only |

Shape is pill, height 44 (48 for the main action on a phone). One primary per screen. Disabled buttons use 40 percent opacity and keep their label. Loading buttons keep their width and show a spinner before the label. Client pages use mango only, never pink.

### 8.2 Text fields

Height 44, radius 10, 1 px `border`, white or surface fill, 16 px text (so mobile browsers do not zoom). Label above in `caption` or `label`. Placeholder in muted text, never the only label. Focus: 2 px mango ring plus a cocoa border. Error: danger border plus a message below that says what is wrong and how to fix it. Verified values (for example an account name) show a green check with the verified text.

### 8.3 Chips and segmented controls

Selected chip: mango fill, dark label, weight 800. Unselected: white fill, 1 px border, regular label. Segmented control: track in `surface-tint`, selected segment in mango. Use chips for 2 to 4 short options (currency, due date, tone). Use a select for longer lists.

### 8.4 Toggles

Visible size 28 by 16, hit area 44 by 44. On: mango with a white knob on the right. Off: #D9C3A5 with the knob on the left. A toggle always has a visible label and, when the effect is not obvious, a one-line helper below it.

### 8.5 Status pill

Radius 8, padding 2 by 8, caption size, weight 800, colours from section 3.3. Shows a word such as paid, due in 3 days, 2 days late, draft, awaiting approval. Never colour alone.

### 8.6 Money (amount) component

- Symbol before the amount, no space (₦450,000, $850.00).
- Show the ISO code when the symbol is ambiguous or when several currencies share a screen.
- Two decimals on documents; no decimals on naira in lists. Always two decimals for USD, GBP and EUR.
- Large amounts use amount-xl on documents, amount-l on summaries, amount-s in rows.
- Right-aligned in tables and rows.
- Each amount carries its own currency. Never add or compare different currencies silently, and never convert without showing the rate and the result.

### 8.7 Cards and rows

Summary card (card radius): earnings card in mango with dark text, other cards in white with a subtle border. Overdue card uses the late tone (soft red tint), not danger. List row (row radius): white, subtle border, name and status on the left, amount on the right, 12 px padding. Rows show a chevron only if the whole row opens something.

### 8.8 Avatars

Circular. Use initials on a soft tint when there is no logo or photo. Client avatars cycle through peach, soft pink, soft yellow and soft green tints with a dark matching letter.

### 8.9 Navigation

- **Bottom tab bar (phone):** four items (Home, Docs, Clients, Balance). Selected item uses mango icon and label in weight 800. Settings opens from the avatar, not the tab bar.
- **Icon rail (tablet):** coin at the top, then icons. The selected icon sits in a mango rounded square.
- **Sidebar (desktop):** same items with labels, plus a New invoice button at the top.
- **Back link:** a plain "Back" or the parent name with an arrow, in link colour.

### 8.10 Documents list and tables

Header row on `surface-sunken`, caption size. Columns on desktop: client and number, status, issued, due, currency, amount, actions. Phone shows cards instead. Hover on desktop highlights the row with a warm tint and reveals actions (remind, duplicate, mark paid, PDF). Sort defaults to needs attention first: overdue, due soon, draft, paid. Pagination footer shows the range.

### 8.11 Side panel (desktop)

Opens on row click beside the table, about 360 px wide. Contains status, client, amount, due date, actions, a suggested reminder, and an activity timeline (latest first, orange dot for the latest event, grey dots for earlier ones). Close with the X or Escape.

### 8.12 Modals and sheets

Phone uses bottom sheets with a drag handle; desktop uses centred modals (max 440 px). Title in `title` lowercase, one or two lines of explanation, then buttons. The safe action sits on the left, the committing action on the right. Confirm modals that send something in the user's name show the exact message. Destructive modals say what will happen and that it cannot be undone, with the default action being Keep it.

### 8.13 Banners and toasts

- **Offline banner:** cocoa background, cream text, wifi-off icon, at the top of the screen.
- **Warning strip (inline):** #FFF1C2 with a dark-gold border and an alert-triangle icon, with the fix link in the strip.
- **Info strip:** peach background with a shield or info icon.
- **Toast:** bottom of the screen, 4 seconds, cocoa background. The wording repeats the action's verb (Publish then Published). Errors never use toasts alone; they also appear where the problem is.

### 8.14 Skeletons

Skeleton bars use `surface-tint` and `border-subtle`, copy the real layout (row height, widths), and appear after 300 ms of waiting. No shimmer animation when reduced motion is on.

### 8.15 Empty states

Bag character, a lowercase headline, one sentence on what to do, one primary action. Example: "all set, ada. Send your first invoice and earn a sticker." Empty states are invitations to act, not apologies.

### 8.16 Progress

- Step bar for flows (onboarding, invoice builder): equal segments, mango for done, `border-subtle` for remaining.
- Project progress: a thin bar showing the share of money paid, in green, with a text line such as "$255 of $850 paid".

### 8.17 Project components (Phase 2)

- **Milestone card:** name, amount, status pill. The current milestone has a 1.5 px mango border. Upcoming milestones are at 75 percent opacity. A lock icon and a one-line note appear when final files are tied to that milestone.
- **Approval block:** previews of the delivered work, a plain-language note about what approval does, an Approve button (primary) and Request changes (outline). Shows revision round counts.
- **Change order summary:** a peach block listing what changes (total, new milestone, delivery date).
- **Contract key terms card:** two-column rows (term and value). Each value needs confirmation before it is relied on.
- **File row:** file icon, name, source and size. Locked state: lock icon on a sunken background and the unlock condition in plain words. Unavailable state: link-off icon with the reason and a contact action.

---

## 9. Patterns

### 9.1 Two moods

| | Freelancer views | Client views |
|---|---|---|
| Background | cream | white |
| Tone | warm and playful | calm and professional |
| Primary action | mango (pink for main home action) | mango only |
| Stickers | allowed | paid stamp on receipts and success only |
| Branding | full | one small "Sent with bagg" line |

### 9.2 Document family

Quotes, invoices and receipts share one layout: sender (logo or initials and name) at the top, an amount-xl block with its label and date, line items, a total, then one action, then the footer. Only the status and the action change.

- Quote: validity date, deposit line if any, Accept quote (primary) and Ask a question (outline).
- Invoice: due date, Pay (primary).
- Receipt: small paid stamp, payment date and method, reference, Download PDF (outline).

### 9.3 Builders and forms

Break long forms into 3 or fewer short steps with a step bar. Show the running total as soon as there is one. Keep optional things behind links (Add discount, Add tax). Defaults come from Settings and apply to new documents only. Line items suggest from past line items, including the last rate.

### 9.4 Money flows

- Fees and the amount received appear above the button.
- The confirm button repeats the amount ("Withdraw ₦500,000", "Pay $850.00").
- Verified account names appear before any payout.
- Failed payments say the card was not charged, if true.
- Pending transfers show a reference and an expected time.

### 9.5 Reminders

Schedule rows with toggles, then a message editor with tone options, variable chips (client, number, amount, date, link) and a preview. Manual reminders show the exact message in a confirm modal. Reminders stop automatically when paid.

### 9.6 Delivery and release on payment

The client delivery page shows low-resolution previews first, then a locked final-files row, then one button that does both jobs: "Pay $255.00 to unlock". After payment, the row unlocks without any manual step. When a file is added, a public link triggers a warning that anyone with the link could skip the lock, with an offer to make it private.

---

## 10. Content and voice

### 10.1 Voice

The friendly big sister: warm, direct, never gushing and never scolding. Playful about wins, calm and clear about late payments, plain about money.

### 10.2 Writing rules

- Sentence case for buttons, labels and body. Lowercase for screen titles and headlines.
- Active voice. A button says exactly what happens: "Send invoice", "Save message", not "Submit".
- Keep one verb for one action through the flow (Withdraw produces "Withdrawn", not "Transfer started").
- Name things in the user's words (documents, clients, balance), not system words.
- Errors say what happened, what did not happen, and what to do next. They do not apologise and are never vague.
- One idea per line. Cut filler.
- No exclamation marks on money screens. One is allowed on a milestone ("northwind paid you!").

### 10.3 Tone by situation

| Situation | Example |
|---|---|
| Payment received | "Tolu paid. Go eat something nice." |
| Onboarding done | "all set, ada" |
| Invoice a few days late | "Tolu is 2 days late. Want me to send a nudge?" |
| Payment failed (client) | "that didn't go through. Your card wasn't charged." |
| Pending transfer | "waiting for your transfer. We'll confirm as soon as it lands." |
| Link not active | "this invoice isn't active. Ask Ada for a fresh link." |
| Destructive | "void invoice 0041? Tolu Studio won't be able to pay it. This can't be undone." |
| Offline | "You're offline. Changes will sync later." |
| 404 | "this page took the day off" |

### 10.4 Reminder tone ladder

- **Before due (friendly):** "Hi Tolu, a heads up: invoice 0041 for ₦450,000 is due on 22 Oct."
- **On due date (friendly):** "Hi Tolu, invoice 0041 for ₦450,000 is due today. Here's the link."
- **3 days after (friendly or direct):** "Hi Tolu, a quick nudge: invoice 0041 was due on 19 Oct. Here's the link whenever you're ready."
- **7 days after (direct):** "Hi Tolu, invoice 0041 is now 7 days overdue. Please pay today or reply to let me know the plan."

All reminders end with "Already paid? Please ignore this note." and are editable per reminder.

### 10.5 Formats

- Currency: ₦1,240,000, $850.00, £320.00, €210.00. Symbol first, comma thousands, ISO code when ambiguous.
- Dates: 4 Nov 2026. Never numeric-only dates (04/11/2026). Relative text for near dates ("due in 3 days", "2 days late").
- Times: local to the viewer, 24-hour or 12-hour by locale.
- Document numbers: four digits with leading zeros (0043), per document type.
- Reminders send at a sensible local hour for the client, not the freelancer.

---

## 11. Accessibility

- Meet WCAG 2.1 AA as the floor.
- Contrast: 4.5 to 1 for text under 18 px, 3 to 1 for large text and UI outlines.
- Tap targets of 44 by 44 px.
- Visible focus ring on every interactive element: 2 px mango outline with 2 px offset.
- Status never by colour alone.
- Respect reduced motion (section 7).
- Inputs have real labels; placeholders are hints only.
- Table reading order: client, status, amount, actions. Row actions are reachable by keyboard.
- Stickers and illustrations have text descriptions or are marked decorative.
- Text scales to 200 percent without loss of content or function.
- Errors move focus to the first problem and are announced to screen readers.
- Dialogs trap focus and return it on close.

---

## 12. Email and PDF

### 12.1 Email

- System font stack (`-apple-system, "Segoe UI", Helvetica, Arial, sans-serif`). Brand shows through colour, the large amount and one orange button.
- Layout: sender name first ("Ada Okafor Design via bagg"), short subject with number, amount and due date, a small logo or initials circle, one sentence, the amount, one solid mango button with a 6 px radius, a PDF note, and a footer ("Sent with bagg").
- Solid-colour buttons only (no gradients, no images for buttons).
- Reminder emails add "Already paid? Please ignore this note."
- Receipt emails use a small green check, the amount, three details (receipt number, date, method) and an outline Download receipt button.
- Keep total width at 600 px or less and test in light and dark clients.

### 12.2 PDF

- A4 by default, US Letter for US clients. Margins at least 16 mm.
- Embedded Bricolage Grotesque (verify currency glyphs).
- Black and white with one accent (the word "invoice" and highlights). Prints well in black and white.
- Contents: logo or initials and business name, document number and dates, billed-to, line items, tax lines, total in amount-l, payment link and QR code, optional bank details only if the freelancer turned them on, footer "Sent with bagg" (unless removed).
- No stickers except a small paid stamp on receipts.

---

## 13. Marketing site

- Hero: a lowercase headline ("send. chase. get paid."), one sentence, one Start free button, and a live piece of product (a paid invoice card) in place of a stock image.
- Proof: real freelancer stories and numbers as they become available. Until then, show product proof only.
- Fees page: plain list of what is free and what costs money, with an example showing the fee and the amount received. Rates remain placeholders until pricing is set.
- Trust page: four safeguards (encryption, account-name checks, change alerts, no stored card numbers), each only if true at launch, and a link to the help centre.
- 404: sleepy bag character, "this page took the day off", Take me home, Contact support.
- Same palette, same font, same voice as the product, with a little more room and more playfulness than the app.

---

## 14. Implementation notes

### 14.1 Token file

Define tokens once as CSS variables and map them into the styling system (Tailwind theme or equivalent). Names below are suggestions; adapt them to the codebase when the repo is reviewed.

```css
:root {
  --bagg-mango: #FF7A1A;
  --bagg-pink: #FF4F8B;
  --bagg-sun: #FFC933;
  --bagg-leaf: #1FA971;
  --bagg-danger: #B3261E;

  --bg: #FFF8EE;
  --surface: #FFFFFF;
  --surface-sunken: #FBF1E2;
  --surface-tint: #F6E8D4;
  --border: #E3D6C4;
  --border-subtle: #F1DFC6;
  --text: #3A1F0A;
  --text-soft: #6B5642;
  --text-muted: #8A6A50;
  --link: #8A3D0C;
  --peach: #FFE9D6;
  --on-mango: #2B1405;
  --on-pink: #3D0618;

  --radius-pill: 999px;
  --radius-card: 16px;
  --radius-row: 12px;
  --radius-input: 10px;
  --radius-small: 8px;
  --radius-sheet: 20px;
}

[data-theme="dark"] {
  --bg: #1A110A;
  --surface: #261A12;
  --border: #3A2A1E;
  --border-subtle: #3A2A1E;
  --text: #FFF1E0;
  --text-muted: #BFA88F;
  --paid-text: #3DD598;
  --late-text: #FFB3A8;
  --peach: #3A2616;
}
```

```js
// Tailwind theme extension (adapt to the repo's setup)
export default {
  theme: {
    extend: {
      colors: {
        mango: '#FF7A1A', pink: '#FF4F8B', sun: '#FFC933', leaf: '#1FA971',
        cocoa: '#3A1F0A', cream: '#FFF8EE', danger: '#B3261E',
      },
      borderRadius: { card: '16px', row: '12px', input: '10px', small: '8px', sheet: '20px' },
      fontFamily: { sans: ['Bricolage Grotesque', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'] },
    },
  },
};
```

### 14.2 Fonts

Self-host the font files and subset them to Latin plus Latin Extended, and make sure U+20A6 (₦) is included. Use `font-display: swap` with a metric-matched fallback to avoid layout shift. Preload the 800 weight used in headlines and amounts.

### 14.3 Money in code

Store amounts as integers in minor units with a currency code. Format with the locale-aware Intl number formatter, then apply the Bagg rules (symbol first, decimals by currency and context, ISO code when ambiguous). Never format with string concatenation.

### 14.4 Build checklist for any new screen

1. Is it a freelancer view (cream, warm) or a client view (white, calm)?
2. One primary action only?
3. Every status has a word?
4. Every amount carries its own currency?
5. Any fee or conversion shown before the confirm button?
6. Empty, loading, error and offline states designed?
7. Works at phone, tablet and desktop widths?
8. Light and dark checked?
9. Focus order, labels and contrast checked?
10. Copy follows section 10?

### 14.5 Assets to produce

Coin and wordmark (SVG, light and dark), app icon sizes, favicon, bag character in four expressions (default, sleepy, cheering, confused), paid stamp, milestone star (earned and locked), squiggle, email header, PDF template, and Open Graph image.

### 14.6 Known open items

- Verify ₦ $ £ € glyphs in the chosen font and weights.
- Re-check all contrast estimates in the build.
- Dark-mode values are a first pass and need a full pass on real screens.
- Dropbox, Box and OneDrive picker styling is not defined yet.
- WhatsApp message formatting is not defined yet.

---

## 15. Do and don't

**Do**
- Let the mango carry the screen and keep everything else quiet.
- Put the amount first on every money screen.
- Show the word for every status.
- Write like a friendly big sister: warm, direct, plain.
- Keep client pages white, calm and branded lightly.

**Don't**
- Put white text on mango or pink.
- Use green for anything other than paid or success.
- Put stickers on client invoices.
- Use all-caps labels, script fonts or tracked eyebrow text.
- Convert currencies without showing the rate and result.
- Make failure screens cute.
- Claim a security feature that is not built.

---

## 16. Changelog

- 0.1 (22 October 2026): first version, written from the design discussion covering core billing, projects, contracts and delivery.
