# Bagg Application Design Specification

**Workstream:** APP-UI  
**Package:** APP-UI-01 — Design specification and system baseline  
**Status:** Baseline specification for implementation  
**Applies to:** Authenticated Bagg application  
**Primary source of truth:** `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts`

---

## 1. Design intent

Bagg's authenticated application should feel like a confident, practical financial workspace for freelancers, consultants and creative businesses.

The visual language is warm, distinctive and recognisably Bagg. It uses strong typography, clear ink outlines, selective hard shadows and warm brand colours. These elements should support the user's understanding of financial information and actions—not compete with it.

The application is not the marketing website. It should not reproduce marketing-page typography, storytelling layouts or decorative compositions inside operational workflows.

### Core principles

1. **Clarity before expression.** Users should immediately understand what is owed, what has been paid, what needs attention and what action is available.
2. **Consistency without uniformity.** Shared patterns should behave and look consistently, but dashboards, tables, forms and document details have different information needs.
3. **Money and status are prominent.** Financial amounts, due dates, payment states and document references must be easy to scan.
4. **Function before decoration.** Borders, colours and shadows should establish hierarchy, not simply add visual weight.
5. **Mobile is a first-class experience.** Mobile layouts must be intentionally designed, not merely compressed desktop layouts.
6. **Domain behaviour is preserved.** UI changes must not alter document lifecycle, payment confirmation, quote acceptance, recurring invoice or other business rules.
7. **Accessible by default.** Interaction, contrast, keyboard access, labels and focus states are part of the design system.

---

## 2. Existing design-system baseline

The current application already implements a substantial portion of the visual language. This specification formalises it.

### 2.1 Brand palette

| Token             | Current value | Intended use                                                                   |
| ----------------- | ------------- | ------------------------------------------------------------------------------ |
| `--bagg-mango`    | `#FF7A1A`     | Primary action and primary brand emphasis                                      |
| `--bagg-pink`     | `#FF4F8B`     | Secondary brand emphasis and selected expressive actions                       |
| `--bagg-pink-ink` | `#F53F7E`     | Legacy/compatibility token; do not introduce into new UI without a defined use |
| `--bagg-sun`      | `#FFC933`     | Highlight, attention and supporting emphasis                                   |
| `--bagg-leaf`     | `#1FA971`     | Positive brand surface                                                         |
| `--ink`           | `#2B1405`     | Strong text, borders and hard shadows                                          |
| `--danger`        | `#B3261E`     | Destructive and error states                                                   |

Text-on-brand tokens must be used rather than assuming a foreground colour:

- `--on-mango`
- `--on-pink`
- `--on-sun`
- `--on-leaf`
- `--on-danger`

**Usage rules**

- Mango is the default primary action colour.
- Pink is an accent, not a second competing primary action.
- Sun is for highlights and attention, not a general-purpose background.
- Leaf is for positive emphasis, not a substitute for semantic paid-state styling.
- Danger is reserved for destructive actions and error communication.
- Do not place mango and pink expressive surfaces directly beside each other.
- Avoid using brand colours for information that has a dedicated semantic status token.

### 2.2 Neutral surfaces

| Token              | Current light value | Intended use                           |
| ------------------ | ------------------- | -------------------------------------- |
| `--bg`             | `#FFF8EE`           | Application canvas                     |
| `--surface`        | `#FFFFFF`           | Cards, panels, forms and menus         |
| `--surface-sunken` | `#FBF1E2`           | Read-only or recessed areas            |
| `--surface-tint`   | `#F6E8D4`           | Hover, selected and secondary surfaces |
| `--border`         | `#E3D6C4`           | Neutral boundaries                     |
| `--border-subtle`  | `#F1DFC6`           | Dividers and low-emphasis boundaries   |
| `--peach`          | `#FFE9D6`           | Warm supporting surface                |
| `--peach-chip`     | `#FFE3CC`           | Small supporting indicators            |

Text tokens:

- `--text`: primary body text.
- `--text-soft`: secondary explanatory text.
- `--text-muted`: supporting labels and metadata.
- `--link`: interactive text links.

Use semantic tokens in components. Do not introduce arbitrary hex values into page-level components.

### 2.3 Semantic status palette

The existing semantic status tokens are the authoritative starting point.

| Status               | Background token      | Foreground token      |
| -------------------- | --------------------- | --------------------- |
| Paid                 | `--status-paid-bg`    | `--status-paid-fg`    |
| Due / due soon       | `--status-due-bg`     | `--status-due-fg`     |
| Overdue / late       | `--status-late-bg`    | `--status-late-fg`    |
| Draft                | `--status-draft-bg`   | `--status-draft-fg`   |
| Pending / processing | `--status-pending-bg` | `--status-pending-fg` |
| Cancelled / void     | `--status-void-bg`    | `--status-void-fg`    |

Rules:

- Status colours communicate business state, not decoration.
- Status labels must remain explicit. Colour alone is insufficient.
- A document's actual domain status must determine its visual status.
- Do not invent new status colours at page level.
- If a new business status is introduced, define its semantic mapping centrally.

### 2.4 Dark theme

The current system includes a dark theme through `[data-theme='dark']`.

The dark theme changes the canvas, surfaces, text, borders, shadows and semantic status surfaces while retaining the brand colours.

Dark mode should remain supported throughout the authenticated application. New components must use semantic Tailwind tokens or CSS variables rather than fixed light-mode colours.

The current dark theme is a first-pass implementation. APP-UI-03 should verify contrast, disabled states, hover states, form controls, overlays and status pills in both themes. Do not treat the presence of dark-theme variables as proof that every component is already dark-mode complete.

---

## 3. Shape, borders and elevation

### 3.1 Shape tokens

| Token            | Current value | Rule                                 |
| ---------------- | ------------: | ------------------------------------ |
| `--radius-card`  |         `0px` | Cards and major panels remain square |
| `--radius-row`   |         `0px` | Data rows remain square              |
| `--radius-btn`   |        `10px` | Buttons                              |
| `--radius-input` |         `8px` | Inputs and form controls             |
| `--radius-small` |         `6px` | Small labels and compact elements    |
| `--radius-sheet` |        `16px` | Drawers and sheets                   |

Square cards and panels are a defining part of the Bagg visual language. Do not add rounded card corners to make the application look like a generic SaaS dashboard.

Pills and circular icon containers may use their own full-round shape where semantically appropriate.

### 3.2 Borders

- Standard strong border: `2px` (`--border-width-brut`).
- Thin border: `1.5px` (`--border-width-brut-thin`).
- Major application panels use the strong ink border.
- Inputs and compact controls use the thin ink border.
- Neutral dividers use the line tokens rather than strong ink borders.
- Avoid stacking multiple strong borders around nested components.

### 3.3 Elevation

Existing hard-shadow tokens:

- `shadow-brut-sm`: `2px 2px 0`.
- `shadow-brut`: `3px 3px 0`.
- `shadow-brut-lg`: `5px 5px 0`.
- `shadow-menu`: soft floating menu elevation.
- `shadow-sheet`: drawer elevation.

**Elevation policy**

| Component                    | Elevation                          |
| ---------------------------- | ---------------------------------- |
| Primary expressive action    | Small hard shadow                  |
| Dominant dashboard card      | Standard hard shadow               |
| Ordinary content card        | No shadow by default               |
| Form section                 | No shadow                          |
| Table container              | No shadow                          |
| Dropdown/menu                | Soft menu shadow                   |
| Sheet/drawer                 | Sheet shadow                       |
| Hoverable expressive element | May increase hard shadow           |
| Destructive action           | No additional decorative elevation |

The `expressive` and `calm` zones remain the standard mechanism for controlling visual emphasis.

- **Expressive:** strong border and hard shadow. Use sparingly for dominant actions or focal surfaces.
- **Calm:** strong border without hard shadow. Use for operational content, money-focused views, forms and nested panels.

A page should have a clear visual focal point. Do not make every card expressive.

---

## 4. Typography

The application uses Bricolage Grotesque through the `--font-bricolage` variable.

The type scale exposed in Tailwind is:

| Token       | Size / line height | Intended use                        |
| ----------- | ------------------ | ----------------------------------- |
| `display`   | 40 / 40 px         | Rare, high-emphasis dashboard value |
| `title-l`   | 28 / 30 px         | Page title                          |
| `title`     | 22 / 26 px         | Dialog and prominent panel title    |
| `heading`   | 18 / 22 px         | Section title                       |
| `body-l`    | 16 / 24 px         | Important body text and input text  |
| `body`      | 14 / 20 px         | Standard operational content        |
| `label`     | 14 / 18 px         | Form labels                         |
| `caption`   | 12 / 16 px         | Supporting metadata                 |
| `amount-s`  | 16 / 20 px         | Compact financial amount            |
| `amount-m`  | 20 / 24 px         | Standard prominent financial amount |
| `amount-l`  | 28 / 32 px         | Large financial amount              |
| `amount-xl` | 40 / 44 px         | Dominant financial amount           |

Rules:

- Page titles use `title-l`.
- Section headings use `heading`.
- Body copy uses `body` or `body-l`.
- Form labels use `label`.
- Metadata uses `caption`.
- Amounts use the amount scale and tabular numerals.
- Use heavier weights for hierarchy, not as a substitute for hierarchy.
- Avoid uppercase labels as a default styling treatment.
- Avoid introducing arbitrary font sizes in individual pages.
- Keep long explanatory copy readable and restrained.

Financial values should use tabular numerals wherever possible so that columns and changing amounts remain easy to compare.

---

## 5. Layout and spacing

### 5.1 Application shell

The authenticated application uses:

- Desktop sidebar.
- Desktop header bar.
- Mobile header.
- Mobile bottom navigation.
- Main content region.
- Breadcrumb region where applicable.

The current sidebar supports collapsed and expanded states. Its preference is stored in local storage.

The mobile bottom navigation provides access to Home, Invoices, Create, Clients and Me. The document section groups invoices, quotes, receipts and recurring invoices.

These navigation concepts should be preserved unless a later information-architecture decision explicitly changes them.

### 5.2 Page container widths

The existing `PageContainer` defines:

| Width  | Maximum width | Use                                     |
| ------ | ------------: | --------------------------------------- |
| `form` |        960 px | Create/edit forms                       |
| `list` |      1,200 px | Standard list pages                     |
| `wide` |      1,280 px | Dashboard and wider operational layouts |
| `full` |  Unrestricted | Specialised wide views                  |

Page content should be centred within the available application region.

Current default page padding is:

- Mobile: 16 px.
- Small screens and above: 24 px.
- Large screens: 32 px.

Current default vertical section spacing is 24 px.

These values are the baseline. Page-specific exceptions should be limited to cases where the information architecture requires them.

### 5.3 Spacing conventions

Use a consistent 4 px base spacing rhythm.

|  Spacing | Typical use                          |
| -------: | ------------------------------------ |
|     4 px | Icon-to-label or very tight grouping |
|     8 px | Related controls and metadata        |
|    12 px | Compact component grouping           |
|    16 px | Card padding and related fields      |
|    20 px | Form subsection spacing              |
|    24 px | Major section spacing                |
|    32 px | Page-level separation                |
| 40–48 px | Exceptional large layout separation  |

Do not use large empty gaps to simulate hierarchy. Use headings, grouping, alignment and dividers.

---

## 6. Shared component rules

All shared components should be reusable, typed, accessible and theme-aware. Page-level components should compose them rather than recreate their visual styles.

### 6.1 Buttons

The existing button variants remain:

| Variant   | Purpose                        |
| --------- | ------------------------------ |
| `primary` | Main action; mango             |
| `accent`  | Secondary brand emphasis; pink |
| `ink`     | Strong neutral action          |
| `outline` | Secondary action               |
| `link`    | Inline text action             |
| `danger`  | Destructive action             |
| `ghost`   | Low-emphasis action            |

Sizes:

- `md`: minimum height 44 px.
- `lg`: minimum height 48 px.

Zones:

- `expressive`: strong border and hard shadow.
- `calm`: thin border without shadow.

Width conventions:

- Desktop actions should generally use intrinsic width.
- Mobile primary actions may use full width when they are the main next step in a form or workflow.
- Use `fullWidth` when the action should remain full width at every breakpoint.
- Use `mobileFullWidth` when it should be full width only below the small-screen breakpoint.
- Do not make every button full width by default.
- Avoid multiple competing primary buttons in one action group.

Loading buttons must preserve their dimensions, expose a busy state and prevent duplicate submissions.

### 6.2 Cards and panels

The existing `Card` component supports `expressive` and `calm` zones and the surface, mango, peach, sun and pink tones.

Rules:

- Surface is the default content tone.
- Expressive cards are reserved for focal information.
- Calm cards are the default for operational content.
- Avoid placing multiple expressive colour cards next to one another.
- Avoid nesting cards unnecessarily.
- Do not use cards for every section; use headings and dividers where a bounded surface is not needed.

### 6.3 Form controls

Inputs, selects, textareas, date controls, checkboxes, radio groups and toggles must follow the shared control language.

Baseline rules:

- Minimum interactive height: 44 px.
- Input text: 16 px or larger.
- Thin ink border.
- White or theme-aware surface.
- Consistent placeholder colour.
- Visible focus state.
- Explicit label.
- Supporting hint and validation error associated with the field.
- Disabled and read-only states must be visually distinct.

Errors should appear next to the affected field and should not rely solely on a page-level notification.

Do not use placeholder text as the only label.

### 6.4 Status pills

`StatusPill` is the shared document-status component.

Rules:

- Use it for document and payment workflow statuses.
- Preserve central status-to-colour mappings.
- Use concise, human-readable labels.
- Icons may reinforce status but must not replace the label.
- Do not create page-specific status pills with different colour logic.
- Do not use status pills for arbitrary categories or decorative tags.

### 6.5 Tables and data lists

The existing `DataTable` supports desktop tables and mobile cards.

Rules:

- Desktop tables should prioritise scanning, alignment and comparison.
- Amounts should be right-aligned and tabular.
- Dates and document numbers should be consistently formatted.
- Status should remain visible without requiring a detail-page visit.
- Row actions should not be confused with row navigation.
- Sorting and filtering should be visually and behaviourally consistent.
- Mobile should use purpose-built cards rather than force a wide table into a narrow viewport.
- Horizontal scrolling is acceptable only where a genuinely tabular comparison cannot be represented clearly as cards.

### 6.6 Dialogs and sheets

Use dialogs for focused decisions and confirmation. Use sheets for mobile-friendly contextual workflows and larger side-panel interactions.

Rules:

- Clear title and, where necessary, explanatory description.
- Obvious close or cancel action.
- Primary action visually distinct from secondary actions.
- Destructive actions clearly labelled.
- Keyboard focus managed correctly.
- Avoid opening a dialog for information that belongs directly on the page.
- Do not nest dialogs or sheets unless a specific workflow justifies it.

### 6.7 Empty, loading and error states

Every data-driven page must define:

- Loading state.
- Empty state.
- No-results state.
- Error state.
- Retry or recovery action where appropriate.

Empty states should explain what is absent and what the user can do next. Use Bagg's character illustrations selectively; do not turn every empty state into a large promotional illustration.

Errors must not imply that a financial or document action succeeded when its outcome is unknown.

---

## 7. Standard page templates

The following templates establish consistent page structure while allowing each workflow to retain its own information hierarchy.

### 7.1 List page

Recommended structure:

1. `PageContainer`.
2. `PageHeader` with title, concise description and primary action.
3. Optional document navigation or section tabs.
4. Attention notice, if there is a meaningful condition requiring action.
5. `TableToolbar` with search, filters and relevant status chips.
6. Data table or mobile card list.
7. Pagination.
8. Empty, loading and error states.

Rules:

- The primary action belongs in the page header on desktop.
- On mobile, it may move to a floating or compact action when that improves usability.
- Do not repeat the same action in multiple prominent places.
- Do not show attention banners when there is nothing meaningful to communicate.

### 7.2 Detail page

Recommended structure:

1. Breadcrumbs.
2. Document or record identity.
3. Status and key metadata.
4. Primary actions appropriate to the current lifecycle state.
5. Main information and financial summary.
6. Supporting activity, payment history or related records.
7. Secondary actions.

Rules:

- The document number is the record identity; do not expose database IDs as user-facing references.
- Actions must be determined by the domain state.
- Avoid presenting unavailable actions as disabled controls without explaining why.
- Preserve the distinction between issuing/finalising a document and sending it to a client.
- Keep payment state, claims and confirmed transactions distinct.

### 7.3 Create/edit form

Recommended structure:

1. Breadcrumb or clear return path.
2. Page title and concise description.
3. Form sections grouped by user task.
4. Main form column.
5. Summary/action rail on desktop where useful.
6. Sticky or clearly visible submit actions.
7. Validation summary where the form has multiple fields or sections.

The existing `FormPageLayout`, `FormSection`, `FormSubsection`, `FormGrid`, `SummaryRail` and `StickyFormActions` provide the starting component vocabulary.

Rules:

- Forms collapse to one column on mobile.
- The summary rail moves below the main form on narrow screens.
- Sticky actions must not obscure fields or mobile navigation.
- Preserve entered values when validation fails.
- Clearly distinguish save-draft, issue, send and other domain actions.

### 7.4 Dashboard

The dashboard is an operational overview, not a collection of generic analytics cards.

It should answer:

- What money is outstanding?
- What needs attention?
- What has happened recently?
- What should I do next?

The existing dashboard components—owed card, attention strip, monthly summary, activity feed and setup checklist—remain the baseline.

Rules:

- Financial priority should determine visual hierarchy.
- Setup guidance must not permanently obstruct the dashboard.
- Onboarding must remain minimisable and dismissible according to the existing workspace-specific preference behaviour.
- A first-payment celebration should remain a meaningful, rare event.
- Empty and first-use experiences should guide the user toward the next useful action.

### 7.5 Settings pages

Settings should use a consistent section-based layout with clear navigation and explicit save behaviour.

Rules:

- Group settings by user intent.
- Keep account, workspace, payment and subscription concerns distinct.
- Make irreversible or sensitive changes explicit.
- Show saved, saving and error states.
- Do not silently discard unsaved changes.

---

## 8. Responsive conventions

Use the existing Tailwind breakpoints as the baseline:

| Breakpoint     | Design intent                             |
| -------------- | ----------------------------------------- |
| Below `sm`     | Phone-first single-column layout          |
| `sm` and above | Compact tablet / small desktop transition |
| `md` and above | Desktop table layouts where appropriate   |
| `lg` and above | Multi-column forms and dashboard layouts  |

Rules:

1. No page should require horizontal scrolling at common phone widths unless the data genuinely requires a tabular comparison.
2. Desktop sidebar is hidden on mobile; mobile navigation remains available.
3. Forms become one column on mobile.
4. Tables switch to mobile cards where a mobile renderer exists.
5. Action groups wrap or stack intentionally.
6. Touch targets should be at least 44 px.
7. Fixed and sticky elements must respect safe-area insets.
8. Mobile bottom navigation must not cover page actions or form submission controls.
9. Do not simply shrink desktop typography and spacing until the page fits.

Responsive behaviour must be checked at minimum at 360 px, 390 px, 768 px, 1024 px and 1440 px viewport widths.

---

## 9. Navigation and breadcrumbs

The shell is responsible for consistent application navigation.

### Desktop

- Collapsible sidebar.
- Workspace/header context.
- Theme control.
- Notifications.
- User/account menu.

### Mobile

- Mobile header.
- Bottom navigation.
- Create-action sheet.
- Account menu sheet.

### Breadcrumb rules

Breadcrumbs should communicate the user's location in the application and provide a reliable path back.

For document detail pages:

- Show the parent collection.
- Show the actual document number as the current record label.
- Never show a database ID as the user-facing breadcrumb.
- For nested edit or contact routes, show the correct hierarchy.
- Breadcrumbs should not be added to every list page merely for decoration.

The current implementation provides a breadcrumb context and a breadcrumb renderer, but the renderer currently limits itself to record-detail routes in selected sections. APP-UI-02 should review this behaviour against the intended global application experience and extend it deliberately.

---

## 10. Motion and interaction

Motion should communicate state changes and feedback.

Permitted patterns:

- Short hover and active transitions.
- Button press feedback.
- Sidebar width transition.
- Loading indicators.
- Sheet and dialog transitions.
- Subtle skeleton loading.

Rules:

- Avoid decorative motion that does not communicate state.
- Respect `prefers-reduced-motion`.
- Never use animation as the only indication of a state change.
- Avoid layout shifts during loading.
- Do not animate financial values in a way that makes them difficult to read.

---

## 11. Accessibility and interaction requirements

Every shared component and migrated page must satisfy these requirements:

- Semantic HTML.
- Keyboard-operable controls.
- Visible focus indicators.
- Accessible names for icon-only actions.
- Correct heading hierarchy.
- Explicit form labels.
- Programmatically associated hints and errors.
- Status labels that do not depend on colour alone.
- Sufficient text and control contrast in light and dark themes.
- No interaction available only on hover.
- Appropriate focus management for dialogs and sheets.
- Touch targets of at least 44 px.
- Reduced-motion support.

Do not remove an existing accessibility attribute merely to simplify styling.

---

## 12. Engineering and implementation constraints

### 12.1 Token ownership

- `globals.css` owns CSS variable definitions.
- `tailwind.config.ts` exposes semantic utilities.
- Shared UI components own reusable visual patterns.
- Page components compose shared components.
- Page-level arbitrary colours, radii, shadows and control styles should be treated as migration debt.

Do not create a second parallel token system.

### 12.2 Component ownership

Use the existing `components/ui` library as the starting point. Extend or refactor existing components before introducing replacements.

A new shared component should be created only when:

- The pattern appears in multiple workflows.
- Its behaviour is sufficiently stable to standardise.
- It has a clear API and ownership.
- It reduces duplication rather than merely moving markup.

### 12.3 Domain behaviour

Visual migrations must not change:

- Invoice draft, issue, send, payment and cancellation rules.
- Quote acceptance, decline, expiry and conversion behaviour.
- Payment claim review and confirmation rules.
- Confirmed payment records and receipts.
- Recurring invoice schedule and generation rules.
- Workspace ownership and access control.
- Subscription entitlements.
- Audit and security behaviour.

UI state must reflect authoritative domain state. A visual success message is not a substitute for a confirmed backend result.

### 12.4 Data integrity

- Never use database identifiers as document references.
- Do not infer payment confirmation from a client-side action.
- Do not represent pending claims as confirmed payments.
- Do not hide material financial information behind decorative interactions.
- Do not remove information from mobile layouts simply because it is difficult to fit.

### 12.5 Implementation discipline

For each migration:

1. Inspect the current source.
2. Identify existing shared components and domain behaviour.
3. Define the target UI structure.
4. Deliver complete files for the agreed scope.
5. Preserve unrelated functionality.
6. Run lint and build checks.
7. Review desktop and mobile behaviour.
8. Record any follow-up debt explicitly.

Do not perform a broad visual rewrite without a defined package and acceptance criteria.

---

## 13. APP-UI migration sequence

The implementation sequence is:

| Package   | Scope                            | Deliverable                                                                                        |
| --------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| APP-UI-01 | Design system and audit          | This specification and source baseline                                                             |
| APP-UI-02 | Application shell                | Navigation, header, responsive shell and breadcrumb experience                                     |
| APP-UI-03 | Shared components                | Standardised component APIs, visual rules and interaction states                                   |
| APP-UI-04 | Dashboard                        | Dashboard refined using the established system                                                     |
| APP-UI-05 | Business workflows               | Invoices reference implementation, then quotes, receipts, payments, clients and recurring invoices |
| APP-UI-06 | Settings and secondary workflows | Settings, profile, subscription, onboarding and supporting application pages                       |

### APP-UI-05 migration order

Invoices are the reference implementation because they exercise the largest set of important application patterns:

- List and detail pages.
- Search, filters and pagination.
- Status and financial summaries.
- Create/edit forms.
- Payment claims and confirmation.
- Document actions.
- Mobile table-to-card behaviour.
- Empty, loading and error states.

Once the invoice experience establishes the reusable patterns, apply them to:

1. Quotes.
2. Receipts.
3. Payments and payment-related views.
4. Clients and contacts.
5. Recurring invoices.

The order may be adjusted only where a dependency or shared component makes another sequence more efficient.

---

## 14. Acceptance criteria

APP-UI-01 is considered complete when:

- The existing design tokens are documented.
- The distinction between expressive and calm UI is explicit.
- Typography, spacing, borders, shadows and radii have defined usage rules.
- Shared component responsibilities are clear.
- Standard page templates are documented.
- Responsive and accessibility conventions are explicit.
- Domain behaviour and data-integrity constraints are recorded.
- The migration order and implementation boundaries are agreed.

A later package is not complete merely because it looks visually consistent. It must also preserve the underlying workflow and pass the agreed technical checks.

---

## 15. Source baseline reviewed

The specification is grounded in the current `dev` source, including:

- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/components/shell/AppShell.tsx`
- `apps/web/src/components/shell/Sidebar.tsx`
- `apps/web/src/components/shell/HeaderBar.tsx`
- `apps/web/src/components/mobile/BottomNav.tsx`
- `apps/web/src/components/ui/PageContainer.tsx`
- `apps/web/src/components/ui/PageHeader.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/DataTable.tsx`
- `apps/web/src/components/ui/FormPageLayout.tsx`
- `apps/web/src/components/ui/FormSection.tsx`
- `apps/web/src/components/ui/Dialog.tsx`
- `apps/web/src/components/ui/EmptyState.tsx`
- `apps/web/src/components/status/StatusPill.tsx`
- `apps/web/src/components/navigation/AppBreadcrumbs.tsx`
- `apps/web/src/components/navigation/BreadcrumbContext.tsx`

**Baseline principle:** APP-UI is a controlled standardisation of the existing Bagg application—not a replacement of its product identity or a change to its business logic.