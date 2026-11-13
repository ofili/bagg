Bagg Design System

Version: 0.3
Date: 11 November 2026
Owner: Product and Engineering
Status: Design and implementation contract
Supersedes: Version 0.2

---

1. Purpose and authority

This document defines how Bagg looks, reads, and behaves across the product.

It is the shared design contract for:

- Product designers and frontend engineers.
- Product managers and domain designers.
- AI coding tools contributing to the frontend.
- Anyone creating Bagg emails, PDFs, marketing pages, or client-facing experiences.

A screen must not introduce a new visual or interaction convention without either reusing an existing pattern or updating this document.

When implementation and this document disagree, the discrepancy must be resolved deliberately. Do not silently create a third convention.

1.1 Product context

Bagg is an invoicing and get-paid workspace for African freelancers, creators, and independent consultants.

Its central promise is:

Invoice like a pro. Get paid without chasing.

The product supports a commercial workflow that extends beyond document creation:

1. Agree work and commercial terms.
2. Create and send quotes.
3. Obtain client acceptance.
4. Organise projects and milestones.
5. Issue invoices.
6. Receive and reconcile payments.
7. Generate receipts.
8. Follow up on outstanding payments.
9. Deliver work and manage client approval.

The design system must support this broader lifecycle without making the application feel like a complicated enterprise accounting suite.

1.2 Core design principle

Personality around the work. Precision in the work.

Bagg should feel distinctive, warm and confident. However, money, payment status, document details, client commitments and financial actions must always be clear and dependable.

1.3 Experience contexts

Bagg has three related but distinct visual contexts.

Context| Primary objective| Visual character
Public marketing| Explain value and drive activation| Expressive, bold, neo-brutalist
Authenticated workspace| Help freelancers manage commercial work| Functional, structured, financially precise
Client-facing experience| Build trust and make client actions easy| Calm, professional, mobile-first

All three share brand tokens, typography, iconography, accessibility rules and interaction principles. They do not need identical layouts or visual density.

---

2. Design principles

3. Money first. Financial values, payment status and next actions must be immediately understandable.
4. Personality around the work. Use brand expression in onboarding, empty states, marketing and celebrations—not in ways that compromise financial clarity.
5. One obvious next action. A screen should have one visually dominant primary action.
6. Status is explicit. Never communicate financial or workflow status through colour alone.
7. Clients do not need an account. Public document and payment experiences must work without client registration.
8. Show the full cost. Fees, conversion rates and amounts received must be visible before a payment-related confirmation.
9. No false certainty. A click, payment claim or pending provider event must never be presented as confirmed payment.
10. Progressive complexity. Keep common tasks simple; reveal advanced controls when needed.
11. Responsive by design. Mobile is a first-class product experience, not a compressed desktop layout.
12. Trust is factual. Do not make security, compliance or payment claims that the implementation cannot substantiate.
13. Consistency over novelty. Prefer a familiar component over a bespoke one unless the workflow has a genuine need.
14. Accessibility is part of correctness. A component is not complete if it cannot be used with a keyboard or assistive technology.

---

3. Brand identity

3.1 Name

The brand name is "bagg".

- Use lowercase in the wordmark and brand headlines.
- Use normal sentence case in product copy.
- Do not use all-uppercase branding.

3.2 Logo system

There are two primary logo treatments.

Bag mark

- The current official Bagg symbol.
- Used for the app icon, favicon, and compact brand identification.
- Must use the approved Bag mark artwork.
- Do not recreate, approximate, rotate, or distort the mark.

Wordmark

- Lowercase "bagg".
- Bricolage Grotesque, weight 800.
- Pink squiggle beneath the wordmark.
- Used on marketing pages, documents, emails and footers.

The Bag mark and wordmark form the primary brand identity. The Bag mark may be used independently where space is limited.

3.3 Brand assets

The brand asset family includes:

- Bag mark.
- Wordmark.
- Squiggle.
- Bag character, where distinct from the Bag mark.
- Paid stamp.
- Milestone star.
- Empty-state illustrations.
- Marketing and Open Graph artwork.

Do not create inconsistent alternatives to these assets for individual pages.

**Retired asset:** The former orange circular coin mark with a lowercase b is deprecated. It must not be
used in new designs or reintroduced as a fallback.

3.4 Clear space

Maintain clear space around the Bag mark equal to at least 25% of its displayed width.

Never stretch, recolour or distort the logo. Do not place it over visually busy photography.

---

4. Colour system

4.1 Brand palette

Token| Value| Purpose
mango| "#FF7A1A"| Primary brand action and highlights
pink| "#FF4F8B"| Secondary brand accent
sun| "#FFC933"| Due-soon and caution indicators
leaf| "#1FA971"| Paid and successful completion
danger| "#B3261E"| Errors and destructive actions
ink| "#2B1405"| Neo-brutalist outlines, shadows and dark labels

The brand palette is not a licence to use every colour everywhere.

4.2 Light neutrals

Token| Value| Purpose
cream| "#FFF8EE"| Main application background
surface| "#FFFFFF"| Cards, inputs and client-facing surfaces
surface-sunken| "#FBF1E2"| Recessed areas and table headers
surface-tint| "#F6E8D4"| Selected tracks and subtle backgrounds
line| "#E3D6C4"| Borders and input outlines
line-subtle| "#F1DFC6"| Low-emphasis separators
peach| "#FFE9D6"| Highlight and hover surfaces
peach-chip| "#FFE3CC"| Chips and avatar backgrounds
text| "#3A1F0A"| Primary text
text-soft| "#6B5642"| Secondary text
text-muted| "#8A6A50"| Captions and hints
link| "#8A3D0C"| Text links and quiet actions

4.3 Text-on-brand tokens

Token| Value
on-mango| "#2B1405"
on-pink| "#3D0618"
on-sun | "#4A3200"

Never use white text on mango or pink.

Mango and pink are not suitable for ordinary text on cream or white surfaces. Use "link", "text" or "ink" for readable text.

4.4 Status colours

Status| Background| Foreground
Paid| "#D8F5E6"| "#0F6B45"
Paid soft| "#D8F5E6"| "#0F6B45"
Due soon| "#FFF0C2"| "#6B4D00"
Late| "#FCE0DE"| "#8A1C14"
Draft| "#EDE7DF"| "#5B4A3B"
Awaiting approval| "#FFF0C2"| "#6B4D00"
Pending transfer| "#DCEBFF"| "#174A7E"
Upcoming| "#EDE7DF"| "#174A7E"
Accepted| "#EDE7DF"| "#5B4A3B"
Voided or inactive| "#EFE9E3"| "#75685C"

Rules:

- Every status includes visible text.
- Green is reserved for paid or successful completion.
- Overdue is not a destructive error. Use late tones.
- Red is reserved for destructive actions and errors requiring attention.
- A status must remain understandable in monochrome.

4.5 Dark mode

Dark mode uses warm brown-black surfaces rather than pure black.

Token| Light| Dark
cream| "#FFF8EE"| "#1A110A"
surface| "#FFFFFF"| "#261A12"
surface-sunken| "#FBF1E2"| "#1F150E"
surface-tint| "#F6E8D4"| "#33241A"
line| "#E3D6C4"| "#3A2A1E"
line-subtle| "#F1DFC6"| "#3A2A1E"
text| "#3A1F0A"| "#FFF1E0"
text-soft| "#6B5642"| "#DCC6AB"
text-muted| "#8A6A50"| "#BFA88F"
link| "#8A3D0C"| "#FFB27A"
peach| "#FFE9D6"| "#3A2616"
peach-chip| "#FFE3CC"| "#4A3220"

The application supports system, light and dark theme preferences. The root layout applies the stored preference before hydration to minimize theme flash. The ThemeProvider manages preference changes, operating-system changes while in system mode, and cross-tab synchronization. Tailwind dark-mode utilities are activated through [data-theme="dark"].

Client-facing pages should respect the selected viewer theme where appropriate. PDFs remain light.

4.6 Contrast

Minimum requirements:

- Normal text: WCAG AA, 4.5:1.
- Large text: 3:1.
- Meaningful UI boundaries and focus indicators: 3:1 against adjacent colours.
- Do not reduce muted text contrast to make a layout appear lighter.

Contrast estimates in older design work are not certification. Verify actual rendered pairs.

---

5. Typography

5.1 Typeface

Primary family: Bricolage Grotesque.

Current application loading uses "next/font/google" with "latin" and "latin-ext" subsets.

Fallback stack:

""Bricolage Grotesque", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif"

Weights:

- 400: body copy.
- 500: labels and names.
- 600–700: emphasis where required by component implementation.
- 800: display, headings, amounts and primary action labels.

The established scale uses weight 800 for headings and financial amount styles.

5.2 Type scale

Style| Size / line height| Intended use
display| 40 / 40 desktop; 32 / 34 mobile| Marketing hero
title-l| 28 / 30| Page title
title| 22 / 26| Section and modal title
heading| 18 / 22| Card and panel title
body-l| 16 / 24| Main body copy
body| 14 / 20| Rows and secondary content
label| 14 / 18| Field labels and names. Implemented in Tailwind as text-label with 14px font-size, 18px line height 500 weight.
caption| 12 / 16| Helper text and metadata

Financial amounts:

Style| Size / line height
amount-xl| 40 / 44
amount-l| 28 / 32
amount-m| 20 / 24
amount-s| 16 / 20

The existing Tailwind configuration includes the amount scale.

5.3 Typography rules

- Screen titles and brand headlines use lowercase where appropriate.
- Buttons, field labels and body copy use sentence case.
- No all-caps labels.
- No tracked-out eyebrow headings.
- Body lines should generally remain below 70 characters on wide screens.
- Use tabular numerals for financial tables.
- Amounts align to the right in financial lists and tables.
- Do not use colour or italics to accent isolated words in headings.

5.4 Currency glyph verification

The application must verify that Bricolage Grotesque renders:

- ₦
- $
- £
- €

Verify all four glyphs at the weights used in the product.

If any glyph is missing, use a verified fallback font or a compatible font subset. Do not silently accept inconsistent fallback rendering.

---

1. Layout, spacing and shape

6.1 Spacing scale

Base unit: 4 px.

Approved spacing steps:

"4, 8, 12, 16, 20, 24, 32, 40, 48, 64"

Default horizontal page padding:

Viewport| Padding
Phone| 16 px
Tablet| 24 px
Desktop| 32 px

Spacing should express hierarchy, not merely fill available space.

6.2 Breakpoints

The product's intended responsive model is:

Range| Layout
Under 640 px| Phone
640–767 px| Compact tablet / large phone
768–1023 px| Tablet navigation and adapted content
1024 px and above| Desktop

The current shell uses Tailwind "md" (768 px) and "lg" (1024 px) conventions. The 640 px boundary is a content adaptation threshold, not necessarily a navigation transition.

Do not introduce custom breakpoints without a demonstrated layout need.

6.3 Content width

- Main authenticated content: maximum 1200 px.
- Payment pages: maximum 480 px.
- Client documents and portals: maximum 720 px.
- Marketing content: use a deliberate editorial width; avoid stretching paragraphs across the full viewport.

6.4 Radius

The current Tailwind configuration is the implementation baseline.

Token| Current value| Intended use
btn| 10 px| Buttons
card| 12 px| Cards
row| 8 px| Compact rows
input| 8 px| Inputs
small| 6 px| Small elements
sheet| 16 px| Sheets and overlays
full| 999 px| Pills and circular controls

6.5 Neo-brutalist borders and shadows

The authenticated application uses the neo-brutalist foundation already established in the repository.

Current Tailwind shadow tokens:

- "shadow-brut-sm": 2 px × 2 px hard offset.
- "shadow-brut": 3 px × 3 px hard offset.
- "shadow-brut-lg": 5 px × 5 px hard offset.
- "shadow-sheet": soft overlay shadow.

Rules:

- Hard shadows are reserved for deliberate emphasis.
- Do not apply hard shadows to every card.
- Prefer a strong border or a hard offset shadow—not both at maximum intensity on every element.
- Avoid decorative blur shadows.
- Use the soft sheet shadow for overlays where appropriate.
- A component's shadow must not make its text or boundary difficult to distinguish.

---

1. Iconography and illustration

7.1 Icon library

The repository currently includes both "lucide-react" and "@phosphor-icons/react".

Standardisation decision: use Lucide React as the default icon library for new shared UI components. Existing Phosphor usage may remain until migrated; do not mix icon families within one component or interaction surface.

Icon guidelines:

- Prefer outline icons.
- Standard sizes: 16, 18 and 22 px.
- Typical stroke width: 1.5–1.75.
- Icon-only controls require an accessible name.
- Icon-only controls have a minimum 44 × 44 px interactive area.
- Icons supplement labels; they do not replace important financial or workflow text.

7.2 Brand illustrations

Approved illustration types:

- Bag character.
- Paid stamp.
- Milestone star.
- Squiggle.
- Empty-state illustrations.
- Onboarding illustrations.

Rules:

- Illustrations never carry essential meaning alone.
- Every meaningful illustration has an accessible description.
- Decorative illustrations are hidden from assistive technology.
- Never use more than one major celebratory illustration on a screen.
- Do not put playful stickers on client invoices or quotes.
- A small paid stamp is acceptable on receipts and payment success pages.

7.3 Photography

Marketing photography should show real freelancers and their working environments.

Avoid generic handshake imagery and stock corporate photography.

Until authentic customer stories are available, use product demonstrations and real interface previews rather than fabricated testimonials or implied customer proof.

---

8. Motion and feedback

Interaction| Duration| Behaviour
Press and toggle| 120 ms| Immediate response
Expand and tab change| 200 ms| Controlled transition
Modal and sheet| 320 ms| Slide or fade based on viewport
Paid stamp| 400 ms| One-time settling motion
Celebration| Up to 1.5 s| Limited to meaningful milestones

Rules:

- Motion must communicate a response or change.
- Do not animate every card on entry.
- Do not animate financial amounts counting up.
- Respect "prefers-reduced-motion".
- Under reduced motion, replace celebrations with static illustrations and remove unnecessary transitions.
- Do not use animation to imply payment confirmation or background completion before the server confirms it.

---

9. Component and interface vocabulary

The following definitions are normative. Designers and engineers should use these terms consistently.

9.1 Application

The complete product experience for a particular user context.

Examples:

- Authenticated freelancer workspace.
- Public marketing website.
- Client-facing document experience.

An application contains routes, shared shell elements, pages, overlays and global feedback.

9.2 Route

A navigable URL representing a resource or workflow.

Examples:

- "/invoices"
- "/invoices/{invoice_id}"
- "/clients"
- "/settings/business"

A route may render a full page, a page with a contextual panel, or a workflow step.

9.3 Page

The primary content surface rendered for a route.

A page normally contains:

1. Application shell, where applicable.
2. Breadcrumb or back navigation, where applicable.
3. Page header.
4. Primary action.
5. Main content sections.
6. Contextual feedback or secondary actions.

A page is not a modal. A complex workflow should generally have a route and a page.

9.4 Page header

The top-level identification and action area of a page.

It can contain:

- Breadcrumb or back link.
- Title.
- Supporting description.
- Status.
- Primary action.
- Secondary actions.
- Contextual metadata.

A page header should not become a second navigation system.

9.5 Section

A meaningful grouping of related content within a page.

A section has a clear purpose and may have:

- A heading.
- Supporting text.
- A section-level action.
- One or more panels, cards, lists or forms.

Sections organise information; they are not necessarily bordered containers.

9.6 Panel

A bounded area used to display related information or controls.

Use a panel when grouping improves comprehension or establishes a distinct working area.

Examples:

- Invoice summary.
- Client details.
- Payment breakdown.
- Activity history.

Do not wrap every section in a panel.

9.7 Card

A compact, visually bounded component representing a discrete item or summary.

Examples:

- Earnings summary.
- Invoice preview.
- Client summary.
- Project milestone.

Cards should not be used as a substitute for a proper table or list when users need to compare many records.

9.8 Widget

A self-contained functional unit that presents a summary or a small interaction.

Examples:

- Outstanding balance.
- Recent activity.
- Payment performance.
- Upcoming milestones.

A widget must have a clear data source, loading state and failure state.

9.9 List

An ordered or unordered collection of related items.

Use lists for navigation, activity, compact records and mobile document collections.

9.10 Table

A structured, column-based representation used for comparison and scanning.

Use tables when column relationships matter and the viewport supports them.

Tables must define:

- Column headings.
- Alignment.
- Sorting behaviour where applicable.
- Empty state.
- Loading state.
- Error state.
- Pagination or virtualisation where appropriate.
- Keyboard access to row actions.

9.11 Form

A collection of controls used to create, edit or submit a coherent resource.

A form owns validation, dirty state, submission state and error presentation.

Related fields should be grouped into sections. A form should not be broken into a multi-step workflow unless there is a genuine sequencing or complexity requirement.

9.12 Modal

A blocking dialog that requires the user to respond before returning to the underlying context.

Use for:

- Short confirmations.
- Simple destructive-action confirmation.
- Small, focused forms.
- Brief decisions.

Do not use a modal for a complex resource editor.

9.13 Drawer

A contextual panel entering from the side of the screen.

Use primarily on desktop for:

- Record previews.
- Quick details.
- Contextual actions.
- Activity timelines.

On mobile, a drawer should become a full-screen route or an appropriate bottom sheet.

9.14 Bottom sheet

A mobile-oriented overlay that enters from the bottom of the viewport.

Use for:

- Short confirmations.
- Action menus.
- Simple selections.
- Small contextual forms.

A bottom sheet must respect device safe areas and provide an obvious close or dismissal action.

9.15 Popover

A small anchored surface associated with a control.

Use for:

- Short option lists.
- Date or filter selections.
- Contextual actions.

A popover must not contain a large workflow or lengthy form.

9.16 Tooltip

A short explanation associated with an element.

Use only for supplementary information. Never hide essential instructions, field labels or status meanings inside a tooltip.

9.17 Toast

A transient notification that confirms a completed action or reports a non-blocking event.

A toast must not be the only place where important information appears.

9.18 Banner

A persistent or semi-persistent message displayed within a page or application shell.

Use for:

- Account or payment warnings.
- Important configuration requirements.
- Service availability.
- Actionable notices.

9.19 Empty state

A designed response to a resource collection with no relevant records.

It must explain why the area is empty and, where appropriate, provide a next action.

9.20 Skeleton

A temporary visual representation of expected content while data is loading.

Use skeletons when the shape of the content is predictable. Use a spinner for a local operation that does not justify a skeleton.

---

10. Component catalogue

This catalogue defines the shared component families required by the product. Individual components should be introduced as reusable primitives or domain compositions rather than implemented independently on every page.

10.1 Foundations

Component| Purpose
Typography| Standard text hierarchy
Colour tokens| Consistent colour application
Spacing utilities| Layout rhythm
Radius utilities| Consistent shape
Border utilities| Boundaries and emphasis
Shadow utilities| Elevation and neo-brutalist emphasis
Icon wrapper| Consistent icon sizing
Avatar| Person or organisation identity
Logo| Brand identification
Brand illustration| Brand personality
MoneyAmount| Correct financial formatting
DateDisplay| Consistent date presentation
RelativeTime| Relative timestamps
CopyToClipboard| Copy references and values
ExternalLink| Clearly identified external navigation

10.2 Application shell and navigation

Component| Purpose
AppShell| Authenticated application structure
Sidebar| Desktop primary navigation
NavigationRail| Tablet primary navigation
BottomTabBar| Mobile primary navigation
HeaderBar| Global page controls
WorkspaceSwitcher| Workspace selection
AccountMenu| User and account actions
Breadcrumbs| Hierarchical navigation
BackLink| Return to parent context
PageHeader| Page title and actions
CommandMenu| Global command or search entry point, if implemented

Navigation must reflect actual available product capabilities. Do not expose placeholder destinations as though they are functional.

10.3 Buttons and actions

Component| Purpose
Button| Primary action control
IconButton| Compact icon action
ButtonGroup| Related actions
SplitButton| Primary action with alternatives
LinkButton| Navigation styled as an action
MenuButton| Opens an action menu
FloatingActionButton| Mobile quick action where justified
DestructiveAction| Explicitly destructive operation

Button variants:

- Primary.
- Secondary or outline.
- Accent.
- Tertiary or link.
- Danger.
- Ghost.
- Icon-only.

Not every variant needs to appear on every page.

10.4 Form controls

Component| Purpose
TextInput| Single-line text
TextArea| Multi-line text
EmailInput| Email entry
PhoneInput| Telephone entry
NumberInput| Numeric entry
MoneyInput| Amount and currency entry
DatePicker| Date selection
DateRangePicker| Date range selection
Select| Single selection
Combobox| Searchable selection
MultiSelect| Multiple selection
Checkbox| Independent boolean choice
RadioGroup| Mutually exclusive choice
Switch| Immediate boolean setting
SegmentedControl| Short set of alternatives
SearchInput| Search query
FileUpload| File selection and upload
FormField| Label, control, hint and error composition
FormSection| Grouped related fields
FormActions| Submit and cancel controls
ValidationSummary| Consolidated validation feedback

10.5 Data display

Component| Purpose
DataTable| Structured desktop records
DataList| Compact record collection
DataCard| Mobile record presentation
StatCard| Key metric
SummaryPanel| Grouped summary
StatusBadge| Status with explicit label
AvatarGroup| Multiple identities
ProgressBar| Progress measurement
ProgressSteps| Sequential workflow
Timeline| Chronological activity
KeyValueList| Label-value pairs
DefinitionList| Structured metadata
Pagination| Page navigation
SortControl| Sorting
FilterBar| Applied filter controls
FilterPopover| Filter selection
SearchAndFilter| Combined record discovery
EmptyState| No-data presentation
Skeleton| Loading placeholder
ErrorState| Failed data presentation

10.6 Financial and document components

Component| Purpose
MoneyAmount| Currency-aware display
MoneyInput| Currency-aware entry
CurrencySelect| Currency selection
ExchangeRateDisplay| Explicit conversion rate
FeeBreakdown| Charges and deductions
PaymentSummary| Amount due, received and outstanding
PaymentMethodCard| Payment method presentation
PaymentStatus| Payment lifecycle status
PaymentClaimCard| User-reported payment awaiting verification
InvoiceCard| Invoice summary
InvoicePreview| Document preview
QuoteCard| Quote summary
QuotePreview| Quote preview
ReceiptCard| Receipt summary
ReceiptPreview| Receipt preview
DocumentNumber| Document identifier
DocumentStatus| Document lifecycle status
DocumentActions| Document-level actions
DueDateDisplay| Due-date presentation
OverdueIndicator| Late payment indicator
ReminderComposer| Payment reminder composition
PaymentLink| Client payment action
BankDetails| Configured bank payment information
FinancialActivity| Financial event timeline

10.7 Client and project components

Component| Purpose
ClientCard| Client summary
ClientSelector| Client selection
ClientProfileHeader| Client identity and overview
ProjectCard| Project summary
ProjectHeader| Project identity and status
MilestoneCard| Milestone details and progress
MilestoneTimeline| Milestone sequence
ContractSummary| Contract status and key terms
FileCard| Uploaded or linked file
FileList| Project file collection
DeliveryPreview| Preview of deliverable
RevisionThread| Revision and feedback history
ApprovalPanel| Client approval interaction
DeliveryStatus| Delivery lifecycle status

10.8 Feedback and system state

Component| Purpose
Toast| Transient feedback
Banner| Persistent notice
InlineAlert| Contextual feedback
ConfirmationDialog| Confirmation
LoadingIndicator| Local loading
ProgressIndicator| Long-running operation
ErrorBoundary| Unexpected rendering failure
OfflineNotice| Connectivity issue
SessionNotice| Authentication or session issue
PermissionNotice| Access restriction
FeatureGate| Plan or entitlement restriction
SecurityChallenge| Additional verification
UnsavedChangesDialog| Navigation with unsaved changes

10.9 Overlays and contextual controls

Component| Purpose
Modal| Blocking dialog
Drawer| Contextual side panel
BottomSheet| Mobile overlay
Popover| Anchored surface
Tooltip| Supplementary explanation
DropdownMenu| Action list
ContextMenu| Contextual action list
CommandMenu| Searchable action interface
DatePopover| Anchored date selection

10.10 Brand and onboarding

Component| Purpose
BagIllustration| Brand character
PaidStamp| Payment celebration
MilestoneStar| Achievement marker
Squiggle| Brand accent
OnboardingStep| Guided setup
OnboardingChecklist| Activation progress
Celebration| Meaningful milestone feedback
ProductPreview| Product demonstration

---

11. Component contracts

Every reusable component must have a documented contract.

At minimum, define:

1. Purpose.
2. Appropriate use.
3. Inappropriate use.
4. Variants.
5. Sizes.
6. Supported states.
7. Responsive behaviour.
8. Keyboard behaviour.
9. Accessibility requirements.
10. State ownership.
11. Data and API boundary.
12. Composition rules.

11.1 Component state ownership

Shared UI primitives own presentation and local interaction state only.

Examples:

- A modal owns whether it is open.
- A select owns its open and highlighted-option state.
- A button owns its visual loading presentation when given a loading state.
- A form controller owns dirty and validation state.

Domain components may interpret domain data, but must not invent or mutate business rules.

For example:

- "StatusBadge" renders a supplied status.
- "PaymentSummary" displays supplied financial totals.
- A payment domain workflow determines whether a payment is confirmed.
- A UI component must not infer payment confirmation from a button click.

11.2 Button contract

A button must define:

- Variant.
- Size.
- Label.
- Optional leading or trailing icon.
- Disabled state.
- Loading state.
- Accessible name.
- Action behaviour.

Rules:

- One visually dominant primary action per page or modal.
- Standard minimum height: 44 px.
- Main mobile action may use 48 px.
- Loading must not cause width changes.
- Disabled controls must remain understandable.
- Destructive actions require explicit confirmation when the consequence is material.
- Do not use a button for navigation when a link is semantically correct.

11.3 Input contract

Every input must support:

- Label.
- Value.
- Placeholder, where useful.
- Helper text.
- Required indication.
- Disabled state.
- Read-only state.
- Error state.
- Focus state.
- Accessible description.

Rules:

- Labels are visible.
- Placeholder text is never the only label.
- Input text is at least 16 px on mobile.
- Controls have a minimum practical height of 44 px.
- Errors explain the problem and how to resolve it.
- Validation must not depend only on colour.

11.4 MoneyAmount contract

Every financial amount must have an explicit currency.

The component receives a numeric amount, currency code and formatting context.

Rules:

- Never concatenate currency symbols and numeric strings manually.
- Use locale-aware formatting.
- Symbol precedes the amount where the symbol is unambiguous.
- Show ISO currency codes where ambiguity exists.
- Documents show two decimal places.
- Naira lists may omit decimals where the value is an ordinary whole-naira amount.
- USD, GBP and EUR use two decimals.
- Amounts align consistently in tables.
- Do not compare or aggregate different currencies without an explicit conversion model.

11.5 StatusBadge contract

A status badge receives a domain status and a display label.

It must not determine the domain status itself.

Rules:

- Text is always visible.
- Colour is supplementary.
- Unknown statuses have a safe neutral presentation.
- A new domain status requires an explicit visual mapping.
- Do not silently map unknown states to paid, accepted or successful.

11.6 DataTable contract

A table must define:

- Column model.
- Column alignment.
- Sortable columns.
- Row action behaviour.
- Pagination or virtualisation.
- Loading state.
- Empty state.
- Filtered-empty state.
- Error state.
- Responsive alternative.

Financial columns are right-aligned.

On mobile, use a data card or list that preserves the information needed to identify, compare and act on the record. Do not simply hide important columns.

11.7 Modal and bottom-sheet contract

A modal or sheet must define:

- Title.
- Description.
- Primary action.
- Secondary or cancel action.
- Dismissal behaviour.
- Focus management.
- Escape behaviour where applicable.
- Loading and error presentation.

A blocking operation must not be dismissible in a way that leaves the user uncertain about whether it completed.

11.8 Toast contract

Toasts are for short-lived confirmation or non-blocking notices.

They must not be used for:

- Critical payment failure.
- Important security warnings.
- Required user decisions.
- Long explanations.
- Errors that disappear before the user can act.

Important outcomes must also be reflected in persistent page state.

---

12. State model

Every page and interactive component must define the states relevant to its behaviour.

Do not implement only the happy path.

12.1 Page data states

State| Meaning| Expected presentation
Initial| No request has started| Stable page structure
Loading| Request is in progress| Skeleton or loading indicator
Loaded| Data successfully retrieved| Normal content
Empty| No records exist| Empty state and useful next action
Filtered empty| Records exist but filters exclude them| Explain filters and offer reset
Partial| Some data is unavailable| Show available data and disclose missing sections
Stale| Displayed data may be outdated| Refresh or stale-data indication
Error| Request failed| Recovery action and error explanation
Not found| Resource does not exist| Not-found presentation
Forbidden| User lacks permission| Permission explanation
Unauthenticated| Session is missing or invalid| Authentication recovery

12.2 Interaction states

Interactive components should support the states relevant to their role:

- Default.
- Hover.
- Focus.
- Active or pressed.
- Selected.
- Disabled.
- Read-only.
- Loading.
- Success.
- Error.
- Dirty.
- Validating.
- Invalid.

Not every component needs every state. The component contract must state which apply.

12.3 Form states

A form must account for:

1. Pristine.
2. Dirty.
3. Valid.
4. Invalid.
5. Validating.
6. Submitting.
7. Submission success.
8. Submission failure.
9. Server validation failure.
10. Session expired.
11. Conflict or stale version.
12. Unsaved changes.

A successful submission must be based on the server response, not on the fact that the submit handler ran.

12.4 Network and session states

The application must account for:

- Online.
- Offline.
- Reconnecting.
- Request timeout.
- Server unavailable.
- Authentication required.
- Session expired.
- Session revoked.

Do not assume that a failed request means the underlying action failed. For operations with uncertain outcomes, provide a safe way to verify the resulting server state before retrying.

12.5 Permission and entitlement states

The UI must be able to represent:

- Owner.
- Administrator.
- Member.
- Read-only.
- Insufficient permission.
- Feature unavailable on current plan.
- Additional security verification required.
- Explicit confirmation required.

Permission and entitlement decisions must come from authoritative application data. Hiding a button is not an access-control mechanism.

---

13. Financial and document lifecycle states

The backend is the source of truth for financial and document state.

The frontend may display and request transitions, but must not independently invent a successful transition.

13.1 Invoice and quote presentation

The design system must support the relevant lifecycle labels, including:

- Draft.
- Issued.
- Sent.
- Viewed.
- Awaiting approval.
- Accepted.
- Awaiting payment.
- Payment claimed.
- Partially paid.
- Paid.
- Overdue.
- Cancelled.
- Recalled.
- Expired.
- Refunded, where supported.

The exact state model is owned by the relevant domain. This list is a presentation catalogue, not a declaration that every document supports every state.

13.2 Payment integrity

The UI must distinguish:

- Payment initiated.
- Payment processing.
- Payment claimed by a client.
- Payment verified by a provider or authorised reconciliation process.
- Payment confirmed.
- Payment failed.
- Payment reversed or refunded.

A payment claim is not a confirmed payment.

A client clicking a payment button is not a confirmed payment.

A success redirect is not, by itself, authoritative confirmation.

Only a server-confirmed financial state may be presented as paid.

13.3 Financial action confirmations

Before a consequential financial action, show:

- What is about to happen.
- The affected document or payment.
- The amount and currency, where relevant.
- Whether the action is reversible.
- Any material downstream effect.

The confirmation action should use an explicit label. Avoid generic labels such as "Yes" or "Continue" where the consequence is significant.

13.4 Payment presentation

Payment pages must show:

- Amount due.
- Currency.
- Relevant document reference.
- Payment methods actually available.
- Fees and conversion details, if applicable.
- Amount expected to be received, where relevant.
- Clear pending, successful or failed outcomes.

Do not display a payment method as available when it is not configured or supported for that transaction.

---

14. Page architecture and composition

14.1 Standard authenticated page

A standard authenticated page is composed as follows:

AppShell
  HeaderBar / Navigation
  Main
    Breadcrumb (optional)
    PageHeader
    PageContent
      Section
        Panel / Card / Table / Form
      Section
        Panel / List / Timeline

Pages should not introduce arbitrary nesting simply to achieve a visual effect.

14.2 Page templates

The following page templates should cover most application routes.

Dashboard

- Greeting or concise title.
- Key financial summary.
- Important actions.
- Outstanding work.
- Recent activity.
- Upcoming milestones or due dates.

Resource list

- Page header.
- Create action.
- Search and filters.
- Data table on desktop.
- Data cards or list on mobile.
- Pagination or load-more behaviour.
- Empty and filtered-empty states.

Resource detail

- Resource identity and status.
- Main financial or operational summary.
- Primary actions.
- Supporting information.
- Activity history.
- Related resources.

Creation and editing

- Page or focused modal depending on complexity.
- Clear field grouping.
- Inline validation.
- Persistent submit actions where useful.
- Unsaved-change handling.

Client-facing document

- Brand identification.
- Business identity.
- Document metadata.
- Line items.
- Totals and taxes.
- Payment or acceptance action.
- Clear status and next step.

Client portal

- Client identity and project context.
- Deliverable or milestone status.
- Available previews and files.
- Revision or approval actions.
- Payment state where relevant.

14.3 Choosing a page or overlay

Task| Preferred presentation
Complex creation| Dedicated page
Complex editing| Dedicated page
Quick confirmation| Modal on desktop; sheet on mobile
Destructive confirmation| Modal or sheet with explicit consequence
Record preview| Desktop drawer; mobile detail page
Quick selection| Popover or select
Multi-step workflow| Dedicated page with progress
Short action menu| Dropdown or bottom sheet
Long-running operation| Persistent progress presentation

Do not put a complex workflow inside a modal simply to avoid creating a route.

---

15. Navigation and application shell

15.1 Mobile

The current navigation direction is a four-item bottom navigation.

The intended eventual structure is:

- Home.
- Documents.
- Clients.
- Balance.

Until the combined Documents and Balance destinations exist, use the implemented destinations rather than exposing dead navigation items.

Settings should remain accessible from the account or avatar menu.

15.2 Tablet

Use a compact navigation rail with icons and clear selected-state treatment.

The rail must not reduce the main content area to an unusable width.

15.3 Desktop

Use a labelled sidebar with:

- Brand mark.
- Primary navigation.
- New invoice or equivalent primary creation action.
- Account access.
- Settings access.

15.4 Navigation behaviour

- Selected state must be visually clear.
- Keyboard navigation must work.
- Every icon-only destination has an accessible name.
- Navigation must reflect permissions and available product features.
- Back navigation must preserve expected list or workflow context where possible.

---

16. Forms and validation

16.1 Form design

Forms should be divided into meaningful groups.

For example, an invoice form may have:

1. Client and document details.
2. Line items.
3. Tax and discount.
4. Payment terms.
5. Notes and delivery.

Do not create unnecessary steps for short forms.

16.2 Validation

- Validate required fields.
- Validate data format.
- Validate domain constraints.
- Validate server-side constraints.
- Display field-level errors.
- Provide a summary when multiple errors require attention.
- Move focus to the first invalid field when appropriate.
- Preserve entered data after recoverable failures.

Client-side validation improves usability but does not replace server validation.

16.3 Financial fields

Money inputs must make currency explicit.

Do not allow an amount to be submitted without a currency when the domain requires one.

Show formatting and precision expectations before the user submits.

16.4 Unsaved changes

Where a user can lose meaningful work:

- Track dirty state.
- Warn before leaving.
- Provide a clear stay or discard decision.
- Do not display a warning after a successful save.
- Do not discard a form because a transient request failed.

---

17. Responsive behaviour

17.1 General rules

- No horizontal page overflow.
- No clipped primary actions.
- No inaccessible hover-only controls.
- No essential information hidden on mobile.
- No truncated financial values.
- Adequate touch targets.
- Content-driven layout changes.

17.2 Tables

Desktop tables may become:

- Stacked data cards.
- Compact lists.
- Horizontally scrollable tables only where preserving a tabular relationship is essential and the scrolling behaviour is clear.

Do not solve mobile layout by simply hiding status, currency, amount or key action information.

17.3 Drawers and sheets

- Desktop contextual drawers may become mobile detail pages.
- Mobile sheets must respect safe-area insets.
- Full-screen mobile overlays must have clear dismissal and navigation behaviour.

17.4 Forms

- Single-column layout on narrow screens.
- Multi-column layout only for logically related fields.
- Full-width primary action where appropriate.
- No fixed-width form controls that overflow.

---

18. Accessibility

Target: WCAG 2.1 AA as a minimum.

Requirements:

- Semantic HTML.
- Keyboard-accessible controls.
- Visible focus indicators.
- Accessible names for icon-only controls.
- Labels associated with inputs.
- Status conveyed through text as well as colour.
- Meaningful image descriptions.
- Decorative images hidden from assistive technology.
- Dialog focus management.
- Focus returned to the invoking control after a dialog closes.
- Screen-reader announcements for relevant async feedback.
- Text zoom to 200% without loss of content or functionality.
- Reduced-motion support.
- Adequate colour contrast.
- Logical heading hierarchy.
- No keyboard traps except correctly managed modal focus.

The current CSS uses a mango focus outline. Retain it only where the rendered contrast is sufficient against the adjacent surface. Test actual focus states rather than assuming the brand colour always passes.

---

19. Content and voice

19.1 Voice

Bagg is warm, direct, plain-spoken and confident.

The voice should feel human without being childish.

19.2 Writing rules

- Use short, clear sentences.
- Explain financial consequences plainly.
- Use familiar language.
- Avoid unnecessary technical language in customer-facing copy.
- Use humour sparingly.
- Do not shame users for late payments.
- Do not blame clients.
- Avoid vague success messages.
- Tell users what happened and what happens next.

19.3 Examples

Prefer:

- "Your invoice is ready."
- "Payment is being verified."
- "This invoice is 3 days overdue."
- "We couldn't send the reminder. Try again."
- "Your changes haven't been saved."

Avoid:

- "Oopsie!"
- "Something magical happened."
- "Payment successful" when the payment is only pending.
- "Error 500" as the only explanation.

19.4 Financial communication

Financial copy must be precise about:

- Amount.
- Currency.
- Payment state.
- Due date.
- Fees.
- Exchange rate.
- Expected receipt.
- Next action.

---

20. Client-facing experience

Client-facing pages are public, mobile-first and trust-oriented.

They should be visually simpler than the authenticated freelancer workspace.

20.1 Document pages

A client-facing invoice or quote should contain:

- Freelancer or business identity.
- Document type and number.
- Issue and due dates.
- Client details.
- Line items.
- Tax and discount breakdowns.
- Total amount and currency.
- Current document status.
- Relevant acceptance or payment action.

20.2 Payment pages

Payment pages should prioritise:

1. Amount due.
2. Document reference.
3. Available payment methods.
4. Fees and conversion information.
5. Payment action.
6. Confirmation or recovery state.

Do not add unnecessary account registration steps.

20.3 Client actions

Acceptance, revision requests, payment claims and approvals must have clear consequences.

After submission, show the server-confirmed result.

Do not imply that a document has been accepted or a payment confirmed until the backend establishes that state.

20.4 Client trust

Only display trust and security statements that are accurate for the deployed system.

---

21. Email and PDF

21.1 Email

Use system fonts:

"-apple-system, "Segoe UI", Helvetica, Arial, sans-serif"

Email layout should be simple and robust across email clients.

A typical invoice email contains:

- Sender identity.
- Document number.
- Amount.
- Due date.
- Short explanation.
- One clear primary action.
- PDF attachment or download reference.
- Bagg footer.

Reminder emails should include a polite instruction to disregard the reminder if payment has already been made.

Receipt emails should show:

- Receipt number.
- Amount and currency.
- Payment date.
- Payment method.
- Download receipt action.

21.2 PDF

Default format: A4. Use US Letter where appropriate for the recipient.

Requirements:

- Minimum 16 mm margins.
- Embedded and verified font.
- Print-friendly design.
- Clear business identity.
- Document number and dates.
- Billed-to information.
- Line items.
- Tax and discount breakdown.
- Total.
- Payment instructions or link.
- QR code where supported.
- Bank details only when configured by the freelancer.
- Bagg attribution where applicable.

PDFs should remain legible when printed in black and white.

---

22. Marketing site

The marketing experience may use more expressive neo-brutalist styling than the authenticated application.

22.1 Hero

The hero should communicate the product outcome, not merely its feature set.

The product preview should show a real or representative Bagg interface.

Do not use fabricated customer metrics or testimonials.

22.2 Proof

Use:

- Real customer stories.
- Verified product outcomes.
- Real product demonstrations.
- Accurate feature descriptions.

Until customer proof exists, use product proof.

22.3 Pricing

Pricing must clearly explain:

- What is included.
- What is limited.
- What costs extra.
- Billing period.
- Applicable currency.
- Any payment-related fees.

Do not publish placeholder rates as final pricing.

22.4 Trust

Security claims must correspond to deployed controls.

The marketing site must not imply that a planned feature is already available.

22.5 Marketing expression

Marketing pages use the same tokens and primitives as the rest of the product, arranged with more expression. Expression is a composition choice, not a separate palette or a licence to hand-roll components.

Shared primitives:

- `MarketingSticker` for rotated, uppercase labels.
- `MarketingCard`, `MarketingFrame`, and `MarketingGrid` for surfaces and layout.
- `PageHero` for page intros.
- `SectionHeading` for section intros.
- `CtaBand` for closing calls to action.
- `buttonStyles()` for every CTA.
- `LegalDocumentHeader`, `LegalSection`, and `LegalDocumentFooter` for legal documents.

Typography and labels:

- Eyebrows and stickers are uppercase, extrabold, and widely tracked.
- Hero headlines may be large and tightly tracked, but use the type scale tokens rather than one-off font sizes where a token exists.
- Body copy uses the shared text tokens. Do not reintroduce legacy names such as `text-ink-soft` or `text-ink-muted`.

Surfaces and colour:

- Brand surfaces use `bg-mango`, `bg-pink`, and `bg-sun` with their matching `text-on-*` tokens.
- Do not place `text-ink` on a brand surface; `ink` flips with the theme and loses contrast.
- Neutrals use `cream`, `surface`, `surface-sunken`, `surface-tint`, and `peach`.
- Rotated stickers and offset shadow layers are allowed on marketing pages, but keep them decorative and out of the reading order.

Calls to action:

- On neutral surfaces, the primary CTA is the default mango `buttonStyles()`.
- On mango, pink, or sun surfaces, the primary CTA uses `buttonStyles({ variant: 'ink' })`.
- Secondary CTAs use `variant: 'outline'`; inline text actions use `variant: 'link'`.
- Do not rebuild button chrome with ad-hoc border, shadow, or height classes.

Borders and elevation:

- Use `border-brut` (2px) for the primary neo-brutalist outline and `border-brut-thin` (1.5px) for compact chips and dividers. Side variants such as `border-t-brut` and `border-b-brut` come from the same scale.
- Elevation uses `shadow-brut-sm`, `shadow-brut`, and `shadow-brut-lg` from the token set, not arbitrary shadow values.
- Cards, panels, and legal documents use `rounded-card`; rows and compact controls use `rounded-row`; inputs use `rounded-input`.

Layout:

- Marketing pages compose sections with `Container` and consistent vertical rhythm (`py-12` to `py-24` by breakpoint).
- Sub-navigation is a horizontally scrollable row of pill links with a minimum 44px touch target and a visible active state.
- Legal pages share one shell: an index card, a document column, and a shared next-document footer.

---

23. Frontend architecture and implementation conventions

23.1 Current technical baseline

The inspected frontend uses:

- Next.js 15.
- React 19.
- TypeScript.
- Tailwind CSS 3.
- "lucide-react".
- "@phosphor-icons/react" (existing dependency).
- "vaul".
- "clsx".
- "tailwind-merge".

Do not introduce a new UI framework without an explicit architecture decision.

23.2 Token ownership

The canonical design token values live in:

"apps/web/src/app/globals.css"

Tailwind maps those CSS variables in:

"apps/web/tailwind.config.ts"

The CSS variables are the source of truth for runtime theme values.

The current Tailwind names include:

Design role| Tailwind class
Brand mango| "bg-mango"
Brand pink| "bg-pink"
Brand sun| "bg-sun"
Brand leaf| "bg-leaf"
Danger| "bg-danger"
Ink| "text-ink"
Cream background| "bg-cream"
Surface| "bg-surface"
Sunken surface| "bg-surface-sunken"
Tinted surface| "bg-surface-tint"
Border| "border-line"
Subtle border| "border-line-subtle"
Main text| "text-text"
Secondary text| "text-text-soft"
Muted text| "text-text-muted"
Link| "text-link"

Do not use the old v0.2 names "canvas", "sunken", "tint", "ink-soft" or "ink-muted" unless those aliases are deliberately introduced.

23.3 Radius and shadow mapping

Use the actual configured Tailwind names:

- "rounded-btn"
- "rounded-card"
- "rounded-row"
- "rounded-input"
- "rounded-small"
- "rounded-sheet"
- "rounded-full"
- "shadow-brut-sm"
- "shadow-brut"
- "shadow-brut-lg"
- "shadow-sheet"

Do not assume old semantic names exist.

23.4 Component architecture

Use three layers.

Layer 1: Primitives

Generic reusable UI components:

- Button.
- Input.
- Select.
- Dialog.
- Sheet.
- Badge.
- Table.
- Card.
- Typography.

Primitives must not contain Bagg business rules.

Layer 2: Domain components

Reusable components that express Bagg concepts:

- MoneyAmount.
- InvoiceStatus.
- PaymentSummary.
- QuotePreview.
- MilestoneCard.
- ClientSelector.
- ReminderComposer.

Domain components may understand domain presentation semantics but must use authoritative domain data.

Layer 3: Page compositions

Route-specific composition of primitives and domain components.

Pages own orchestration, data loading and workflow composition—not duplicate styling or business rules.

23.5 API boundaries

- Use the established API client.
- Keep API requests out of generic UI primitives.
- Separate server data from local interaction state.
- Treat backend validation and permissions as authoritative.
- Handle loading, failure and stale data explicitly.
- Do not fabricate successful state transitions optimistically.
- Refresh or reconcile authoritative state after consequential mutations.

23.6 File and component conventions

- Prefer one clear responsibility per component.
- Use shared primitives before creating near-duplicate controls.
- Keep domain-specific compositions in domain-oriented locations.
- Avoid oversized page components that own unrelated workflows.
- Avoid prop interfaces that expose internal implementation details.
- Do not add global CSS for a one-off page treatment unless it is genuinely reusable.

---

24. Testing and acceptance criteria

A component or page is not complete because it looks correct in one screenshot.

24.1 Component acceptance

Every shared component must be checked for:

- Correct default appearance.
- All supported variants.
- Disabled state.
- Loading state, where applicable.
- Error state, where applicable.
- Keyboard interaction.
- Focus visibility.
- Screen-reader semantics.
- Responsive behaviour.
- Dark mode where supported.
- Reduced motion where relevant.

24.2 Page acceptance

Every new or materially changed page must be checked for:

1. Loading state.
2. Empty state.
3. Filtered-empty state, where applicable.
4. Error state.
5. Permission or unauthenticated state, where applicable.
6. Responsive layout.
7. Keyboard access.
8. Financial accuracy.
9. Correct domain status.
10. Unsaved-change behaviour, where applicable.
11. Dark mode.
12. Accessible contrast.

24.3 Financial acceptance

For any financial workflow, verify:

- Currency is explicit.
- Amount formatting is correct.
- Fees are disclosed before confirmation.
- Conversion is explicit.
- Payment claims are not presented as confirmed payments.
- Server-confirmed status is used.
- Retry behaviour cannot create misleading duplicate actions.
- Error messages explain recovery.

24.4 Visual regression

Visual tests should cover representative screens at:

- Phone width.
- Tablet width.
- Desktop width.

Include at least one light and one dark-mode screen in the regression suite.

24.5 Definition of done

A UI change is complete when:

- It follows this document.
- It uses shared tokens and components.
- It has all relevant states.
- It works at supported breakpoints.
- It passes accessibility checks.
- It uses correct backend state.
- It has appropriate automated tests.
- Any new design convention is documented.

---

25. Implementation roadmap

The design system should be implemented in the following order.

Phase 1 — Foundations

- Verify colour tokens and contrast.
- Verify font and currency glyph coverage.
- Standardise typography utilities.
- Confirm radius and shadow conventions.
- Standardise icon usage.
- Confirm light and dark theme behaviour.

Phase 2 — Application shell

- AppShell.
- HeaderBar.
- Sidebar.
- NavigationRail.
- BottomTabBar.
- PageHeader.
- Breadcrumbs.

Phase 3 — Core primitives

- Button.
- IconButton.
- Card.
- Badge.
- Input.
- Select.
- Checkbox.
- RadioGroup.
- Switch.
- TextArea.
- Dialog.
- Sheet.
- Popover.
- Toast.
- Banner.

Phase 4 — Data presentation

- DataTable.
- DataCard.
- DataList.
- StatCard.
- Timeline.
- Pagination.
- FilterBar.
- EmptyState.
- Skeleton.
- ErrorState.

Phase 5 — Financial and document components

- MoneyAmount.
- MoneyInput.
- CurrencySelect.
- PaymentSummary.
- StatusBadge.
- InvoiceCard.
- QuoteCard.
- ReceiptCard.
- DocumentPreview.
- PaymentClaimCard.
- ReminderComposer.

Phase 6 — Client and delivery components

- ClientCard.
- ProjectCard.
- MilestoneCard.
- ContractSummary.
- FileCard.
- DeliveryPreview.
- RevisionThread.
- ApprovalPanel.

Phase 7 — Page templates and migration

- Dashboard.
- Resource list.
- Resource detail.
- Create/edit workflow.
- Client-facing document.
- Client payment page.
- Project and delivery views.

Migrate existing screens incrementally. Avoid a broad redesign that changes unrelated business behaviour.

---

26. Open implementation items

The following items remain verification or implementation work. Their presence in this document does not imply they are already complete.

1. Verify currency glyphs in Bricolage Grotesque.
2. Run contrast checks on actual rendered component states.
3. Verify dark mode across representative application pages.
4. Confirm theme selection and persistence implementation.
5. Audit existing use of Phosphor icons and standardise new work on Lucide.
6. Audit old Tailwind classes and remove obsolete aliases when safe.
7. Verify responsive navigation against the actual route structure.
8. Define consistent styling for Dropbox, Box and OneDrive integrations.
9. Define WhatsApp message presentation and preview patterns.
10. Verify all client-facing payment and document states against backend domain behaviour.
11. Ensure existing pages migrate to the current token names and neo-brutalist foundation.

---

27. Repository implementation map

Concern| Location
Design system| "DESIGN.md"
CSS variables and global styles| "apps/web/src/app/globals.css"
Tailwind token mapping| "apps/web/tailwind.config.ts"
Font loading and root layout| "apps/web/src/app/layout.tsx"
Class merge helper| "apps/web/src/lib/cn.ts"
Brand components| "apps/web/src/components/brand/index.tsx"
Button component| "apps/web/src/components/ui/button.tsx"
Status pill| "apps/web/src/components/ui/status-pill.tsx"
Application shell| "apps/web/src/app/(app)/layout.tsx"
404 page| "apps/web/src/app/not-found.tsx"

This map should be updated whenever shared implementation locations change.

---

28. Changelog

0.3 — 11 November 2026

- Reconciled the design document with the current CSS and Tailwind implementation.
- Adopted the repository's neo-brutalist foundation as the implementation baseline.
- Corrected Tailwind token naming and radius/shadow references.
- Clarified the three experience contexts.
- Defined page, section, panel, card, widget, modal, drawer, sheet, popover, toast and banner terminology.
- Expanded the component catalogue.
- Added component contracts and state ownership rules.
- Formalised page, form, network, permission and interaction states.
- Clarified payment and financial state integrity.
- Added page templates, architecture conventions and acceptance criteria.
- Corrected the dark-mode description to reflect the current "data-theme="dark"" implementation.

0.2 — 22 October 2026

- Introduced Mango Sunrise palette and Bricolage Grotesque.
- Added financial formatting, document, payment and client-facing design guidance.
- Added responsive navigation and accessibility principles.
- Added initial implementation mapping.

0.1 — 22 October 2026

- Initial design system covering core billing, projects, contracts and delivery.

---

Final rule: Bagg should be recognisable at a glance, easy to operate on a phone, and trustworthy wherever money or client commitments are involved. Every component and page should reinforce those outcomes.