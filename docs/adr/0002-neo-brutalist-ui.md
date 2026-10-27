# ADR 0002: Neo-brutalist UI, with calm money screens

Status: Accepted (2026-10-25)
Supersedes: parts of DESIGN.md v0.1 (listed below). DESIGN.md v0.2 should absorb this ADR.

## Context

DESIGN.md v0.1 chose a soft, pill-shaped, border-light look. We want Bagg to feel bolder and more
distinctive for African freelancers and creatives, and our sticker and hand-drawn illustration
direction already suits a neo-brutalist style: flat saturated colour, thick outlines, hard offset shadows.

The risk is trust. People send invoices and receive money in Bagg, and heavy brutalism on money
screens can read as unserious. Dense screens (tables, settings) also get noisy if every element is outlined.

## Decision

Use neo-brutalism for the frame and personality of the product, and keep the money moments calm.

| Zone | Where | Treatment |
|---|---|---|
| Expressive | Marketing site, onboarding, empty states, dashboard cards, app shell (nav, buttons, chips), stickers | 2px ink outline, hard offset shadow, flat colour |
| Working | Tables, forms, settings, builder fields, side panels | 1.5px ink outline on inputs, 1px subtle borders on rows and tables, no offset shadows |
| Calm | Client invoice, quote and receipt pages, client payment screen, failure and overdue screens, PDFs, emails | Unchanged from v0.1: white surface, 1px subtle borders, no shadows. The one mango button gets a 1.5px ink outline and no shadow |

## Tokens

- Ink: `#2B1405` (light), `#FFF1E0` (dark). Used for outlines and hard shadows.
- Border width: `border-brut` 2px, `border-brut-thin` 1.5px.
- Hard shadows, never blurred: `shadow-brut-sm` 2px, `shadow-brut` 3px, `shadow-brut-lg` 5px.
- Radius: button 10, card 12, row 8, input 8, small 6, sheet 16 (top). Pills only for status pills and chips.
- Colour is flat. No gradients, no translucent fills, no glow.
- Pressed state: translate by the shadow offset and drop the shadow (80ms).
- Focus: 2px mango outline with 2px offset, on top of any outline.
- Colours, type scale and tokens live in `globals.css` and `tailwind.config.ts`.

## What this supersedes in DESIGN.md v0.1

- Principle 7 ("Spend boldness in one place"): becomes "Bold in the frame, calm in the money".
- 5.3 Radius (pill for buttons, 16 for cards): replaced by the radius tokens above.
- 5.4 Borders and elevation ("prefer borders to shadows, only shadows on sheets"): replaced by the zone rules above.
- 8.1 Buttons (pill shape): buttons are 10px radius with a 2px ink outline and hard shadow in expressive zones.
- 8.2 Text fields (1px border): 1.5px ink outline.
- 8.3 Chips and 8.7 Cards: outlined, with shadows only in expressive zones.
- 6.2 Stickers: unchanged. Stickers still never appear on client invoices or quotes.

## Unchanged

Palette, Bricolage Grotesque, lowercase headlines, voice, status-by-word, one primary action per screen,
44px targets, contrast minimums (3:1 for outlines and large text, 4.5:1 for body text), reduced motion.

## Consequences

- Existing screens still use `emerald-*` and `neutral-*` utilities. They keep working but look off-brand until migrated.
- Next: UI primitives (Button, Input, Chip, Card, StatusPill, Toggle, Modal, Money), then app shell, then `InvoiceDocument`.
- Dark mode values are a first pass and need a pass on real screens.
- Confirm the four currency glyphs render in Bricolage Grotesque before shipping.
