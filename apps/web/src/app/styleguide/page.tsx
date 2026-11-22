'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Building2, Save, User } from 'lucide-react';

import {
  Alert,
  BaggSelect,
  Button,
  Card,
  Checkbox,
  Chip,
  ColorField,
  DataTable,
  DateField,
  DateRangeField,
  Dialog,
  EmailField,
  EmptyState,
  emptyStates,
  ErrorState,
  FormActions,
  FormGrid,
  FormPageLayout,
  FormSection,
  FormSubsection,
  MoneyField,
  NumberField,
  OtpField,
  PhoneField,
  RadioGroup,
  StaticField,
  StepIndicator,
  StickyFormActions,
  SummaryRail,
  TextArea,
  TextField,
  Toggle,
  ValidationSummary,
  type ColumnDef,
} from '@/components/ui';
import { StatusPill } from '@/components/status';
import { Money } from '@/components/money/Money';
import { BagCharacter, BAG_MOODS, type BagMood } from '@/components/brand';

const MOOD_MOMENTS: Record<BagMood, { moment: string; note?: string }> = {
  happy: { moment: 'Payment confirmed, empty lists, normal states' },
  sleepy: { moment: 'Waiting on client approval or feedback, offline' },
  excited: { moment: 'Welcome, first client added' },
  superExcited: { moment: 'Milestones (10th invoice, files released)' },
  sad: { moment: 'Payment failed, retry button (provider only)' },
  confused: { moment: '404 page, dead or expired links, no search matches' },
  worried: { moment: 'Invoice overdue, server error 500 (provider only)' },
  thinking: { moment: 'Payment pending verification, loading/generating PDF' },
  locked: { moment: 'Protected files locked until conditions are met' },
  celebrating: { moment: 'Big milestones (first payment received)' },
  skeptical: { moment: 'Overdue invoices, payment claim that does not match' },
};

type DemoInvoice = {
  id: string;
  number: string;
  client: string;
  total: number;
  status: string;
};

const DEMO_ROWS: DemoInvoice[] = [
  { id: '1', number: 'INV-0042', client: 'Tolu Studio', total: 45000000, status: 'sent' },
  { id: '2', number: 'INV-0041', client: 'Acme Limited', total: 12850000, status: 'paid' },
  { id: '3', number: 'INV-0040', client: 'Ada Okafor', total: 3200000, status: 'overdue' },
];

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
];

// Dev-only review page for the neo-brutalist primitives. Hidden in production.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [activeMood, setActiveMood] = useState<BagMood>('happy');
  const [compactEmpty, setCompactEmpty] = useState(false);

  // Field demos
  const [name, setName] = useState('Tolu Studio');
  const [email, setEmail] = useState('billing@tolustudio.com');
  const [phone, setPhone] = useState('+234 803 123 4567');
  const [dueDate, setDueDate] = useState('2026-12-01');
  const [rangeStart, setRangeStart] = useState('2026-11-01');
  const [rangeEnd, setRangeEnd] = useState('2026-11-30');
  const [amount, setAmount] = useState('450000');
  const [discount, setDiscount] = useState('0.00');
  const [otp, setOtp] = useState('');
  const [accent, setAccent] = useState('#FF7A1A');
  const [notes, setNotes] = useState('');
  const [country, setCountry] = useState('NG');
  const [searchCountry, setSearchCountry] = useState('NG');
  const [terms, setTerms] = useState(true);
  const [plan, setPlan] = useState('monthly');
  const [clientType, setClientType] = useState('individual');

  // Table demo
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const columns: ColumnDef<DemoInvoice>[] = [
    {
      key: 'number',
      header: 'Invoice',
      sortable: true,
      render: (row) => <span className="font-extrabold text-text">{row.number}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      render: (row) => <span className="text-text-soft">{row.client}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <Money amountMinor={row.total} currency="NGN" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
  ];

  const renderMobileCard = (row: DemoInvoice) => (
    <div className="border-brut-thin border-ink bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-extrabold text-text">{row.number}</span>
        <StatusPill status={row.status} />
      </div>
      <p className="text-caption text-text-soft">{row.client}</p>
      <Money amountMinor={row.total} currency="NGN" className="mt-1 block" />
    </div>
  );

  return (
    <main className="mx-auto max-w-4xl space-y-12 p-6 safe-bottom">
      <header className="flex items-center justify-between border-b border-line-subtle pb-5">
        <div>
          <h1 className="text-display text-text">styleguide</h1>
          <p className="mt-1 text-body text-text-soft">
            Neo-brutalist tokens, controls, tables and character moods.
          </p>
        </div>
        <Toggle
          label="Dark mode"
          checked={dark}
          onChange={(v) => {
            setDark(v);
            document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light');
          }}
        />
      </header>

      {/* Bag Character Moods */}
      <section className="space-y-4">
        <div>
          <h2 className="text-title text-text">bag character moods</h2>
          <p className="text-caption text-text-muted">
            10 product moods. Keep it calm and joyful. Never show sad or worried in client-facing views.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {BAG_MOODS.map((mood) => {
            const info = MOOD_MOMENTS[mood];
            return (
              <div
                key={mood}
                className="flex flex-col items-center justify-between border-brut border-ink bg-surface p-4 text-center"
              >
                <div className="flex h-24 items-center justify-center">
                  <BagCharacter mood={mood} size={72} />
                </div>
                <div className="mt-2 w-full border-t border-line-subtle pt-2">
                  <p className="font-extrabold text-text">{mood}</p>
                  <p className="mt-1 text-caption leading-tight text-text-muted">{info.moment}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EmptyState Component */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title text-text">empty state component</h2>
            <p className="text-caption text-text-muted">
              Reusable empty states with preset messaging, link/button actions, and compact mode.
            </p>
          </div>
          <Toggle
            label="Compact mode"
            checked={compactEmpty}
            onChange={setCompactEmpty}
          />
        </div>

        <div className="border-brut border-ink bg-surface p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line-subtle pb-4">
            <span className="text-caption font-extrabold text-text">Presets:</span>
            {(['invoicesFirst', 'quotesFirst', 'clientsFirst', 'noMatches', 'allPaid', 'nothingToDo', 'filesLocked', 'firstPayment'] as const).map((key) => (
              <Chip
                key={key}
                selected={activeMood === emptyStates[key].mood}
                onClick={() => setActiveMood(emptyStates[key].mood)}
              >
                {key}
              </Chip>
            ))}
          </div>

          <div className="border-brut-thin border-ink bg-surface-sunken">
            <EmptyState
              mood={activeMood}
              title={`Demo: ${activeMood} empty state`}
              body={MOOD_MOMENTS[activeMood].moment}
              action={{ label: 'Primary action', href: '#' }}
              compact={compactEmpty}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-brut border-ink bg-surface p-4">
            <span className="text-caption font-bold text-text-muted">emptyStates.invoicesFirst</span>
            <EmptyState {...emptyStates.invoicesFirst} compact />
          </div>
          <div className="border-brut border-ink bg-surface p-4">
            <span className="text-caption font-bold text-text-muted">emptyStates.noMatches</span>
            <EmptyState {...emptyStates.noMatches} action={{ label: 'Clear filters', onClick: () => {} }} compact />
          </div>
          <div className="border-brut border-ink bg-surface p-4">
            <span className="text-caption font-bold text-text-muted">emptyStates.filesLocked</span>
            <EmptyState {...emptyStates.filesLocked} compact />
          </div>
          <div className="border-brut border-ink bg-surface p-4">
            <span className="text-caption font-bold text-text-muted">emptyStates.allPaid</span>
            <EmptyState {...emptyStates.allPaid} compact />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title text-text">buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Send invoice</Button>
          <Button variant="accent">New invoice</Button>
          <Button variant="ink">Pay now</Button>
          <Button variant="outline">Save draft</Button>
          <Button variant="danger">Void invoice</Button>
          <Button variant="link">Send a nudge</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Pay ₦450,000.00</Button>
        </div>
        <p className="text-caption text-text-muted">
          Calm zone (client pages and forms): same button, no shadow.
        </p>
        <Button zone="calm" size="lg" fullWidth>Pay $850.00</Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-title text-text">cards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card tone="mango">
            <p className="text-caption">Earned this month</p>
            <p className="text-amount-xl">₦1,240,000</p>
          </Card>
          <Card>
            <p className="text-caption text-text-muted">Waiting on clients</p>
            <p className="text-amount-l">$850.00</p>
          </Card>
          <Card zone="calm" className="sm:col-span-2">
            <p className="text-body text-text">
              Calm card: 2px ink outline, no shadow. Use it for client pages, tables and
              anywhere money is the focus.
            </p>
          </Card>
        </div>
      </section>

      {/* Form sections, grids and actions */}
      <section className="space-y-4">
        <div>
          <h2 className="text-title text-text">form sections</h2>
          <p className="text-caption text-text-muted">
            One bounded surface per topic. Square panel, ink outline, header rule and
            optional icon or action.
          </p>
        </div>

        <FormSection
          title="Business profile"
          description="This is the name and address your clients see on invoices."
          icon={<Building2 className="h-4 w-4" />}
          action={
            <Button zone="calm" variant="outline">
              <Save aria-hidden className="h-4 w-4" />
              Save profile
            </Button>
          }
        >
          <FormGrid>
            <TextField
              label="Business name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <EmailField
              label="Billing email"
              optional
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormGrid>

          <FormGrid columns={3}>
            <PhoneField
              label="Phone"
              optional
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <DateField
              label="Next due date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <MoneyField
              label="Opening balance"
              currency="NGN"
              value={amount}
              onChange={setAmount}
            />
          </FormGrid>

          <FormActions>
            <Button variant="outline" zone="calm">Cancel</Button>
            <Button zone="calm">Save changes</Button>
          </FormActions>
        </FormSection>
      </section>

      {/* Form archetypes */}
      <section className="space-y-4">
        <div>
          <h2 className="text-title text-text">form archetypes</h2>
          <p className="text-caption text-text-muted">
            Record forms stack FormSections. Document builders pair a form column
            with a sticky SummaryRail. Long forms keep their primary action
            reachable with StickyFormActions.
          </p>
        </div>

        <FormSection
          title="Record form"
          description="Group related fields into FormSubsections and show read-only relationships with StaticField."
        >
          <FormSubsection
            title="Identity"
            description="The name and contact details used on documents."
          >
            <FormGrid>
              <TextField
                label="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <StaticField
                label="Client type"
                value="Business"
                hint="Client type cannot be changed after creation."
              />
            </FormGrid>
          </FormSubsection>

          <FormSubsection divided title="Preferences">
            <Checkbox
              label="Send automatic reminders"
              hint="Stops as soon as the invoice is paid."
              checked={terms}
              onChange={setTerms}
            />
          </FormSubsection>

          <div className="max-h-56 overflow-y-auto border-brut-thin border-ink bg-surface-sunken">
            <div className="h-32 p-4 text-caption text-text-muted">
              Scroll this panel to see the sticky action bar.
            </div>

            <StickyFormActions tone="panel">
              <FormActions divider={false}>
                <Button zone="calm">Save changes</Button>
              </FormActions>
            </StickyFormActions>
          </div>
        </FormSection>

        <FormSection
          title="Step indicator"
          description="Use for multi-step auth and onboarding flows."
        >
          <StepIndicator
            steps={[
              { id: 'business', label: 'Business details' },
              { id: 'plan', label: 'Choose a plan' },
            ]}
            current="plan"
            label="Setup progress"
          />
        </FormSection>

        <FormPageLayout
          aside={
            <SummaryRail
              title="Summary"
              description="Totals update as you edit."
              actions={
                <>
                  <Button variant="outline" zone="calm" fullWidth>
                    Preview
                  </Button>
                  <Button zone="calm" fullWidth>
                    Save draft
                  </Button>
                </>
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">Subtotal</span>
                <Money
                  amountMinor={45000000}
                  currency="NGN"
                  hideCurrencyCode
                />
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-3">
                <span className="text-body-l font-extrabold text-text">
                  Total due
                </span>
                <Money
                  amountMinor={45000000}
                  currency="NGN"
                  className="text-amount-m"
                  hideCurrencyCode
                />
              </div>
            </SummaryRail>
          }
        >
          <FormSection
            title="Client"
            description="Who this document is for."
          >
            <TextField
              label="Client name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormSection>

          <FormSection
            title="Invoice details"
            description="When the invoice is issued and when payment is due."
          >
            <FormGrid>
              <DateField
                label="Issue date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              <DateField
                label="Due date"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
              />
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </section>

      {/* Fields */}
      <section className="space-y-5">
        <div>
          <h2 className="text-title text-text">fields</h2>
          <p className="text-caption text-text-muted">
            Every control shares the same 1.5px ink outline, 8px radius, 44px minimum
            height and focus ring.
          </p>
        </div>

        <FormSection title="Text inputs" description="Labels, hints, optional and error states.">
          <FormGrid>
            <TextField
              label="Client name"
              placeholder="Tolu Studio"
              hint="Shown on the invoice."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <EmailField
              label="Billing email"
              optional
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PhoneField
              label="Phone or WhatsApp"
              optional
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <TextField
              label="Tax ID"
              defaultValue="abc"
              error="Enter a valid tax ID, like VAT-987654."
            />
          </FormGrid>

          <TextArea
            label="Private notes"
            optional
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything you want to remember about this client."
          />
        </FormSection>

        <FormSection title="Dates and numbers" description="Native date pickers, ranges, numbers and money.">
          <FormGrid>
            <DateField
              label="Issue date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <NumberField
              label="Payment terms"
              suffix="days"
              min={0}
              defaultValue={14}
            />
          </FormGrid>

          <DateRangeField
            label="Statement period"
            startValue={rangeStart}
            endValue={rangeEnd}
            onStartChange={setRangeStart}
            onEndChange={setRangeEnd}
            hint="Used for account statements."
          />

          <FormGrid>
            <MoneyField
              label="Amount"
              currency="NGN"
              value={amount}
              onChange={setAmount}
              hint="Type the amount in naira."
            />
            <MoneyField
              label="Discount"
              currency="USD"
              currencySymbol="$"
              value={discount}
              onChange={setDiscount}
              optional
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Selection controls" description="Selects, checkboxes and radios.">
          <FormGrid>
            <BaggSelect
              label="Country"
              value={country}
              onChange={setCountry}
              options={COUNTRY_OPTIONS}
            />
            <BaggSelect
              label="Searchable country"
              value={searchCountry}
              onChange={setSearchCountry}
              options={COUNTRY_OPTIONS}
              searchable
              hint="Use searchable when there are more than about 8 options."
            />
          </FormGrid>

          <Checkbox
            label="Send automatic reminders"
            hint="Stops as soon as the invoice is paid."
            checked={terms}
            onChange={setTerms}
          />

          <RadioGroup
            label="Billing cadence"
            value={plan}
            onChange={setPlan}
            direction="horizontal"
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />

          <RadioGroup
            label="Client type"
            value={clientType}
            onChange={setClientType}
            variant="cards"
            columns={2}
            options={[
              {
                value: 'individual',
                label: 'Individual',
                description: 'A person you invoice.',
                icon: <User className="h-5 w-5" aria-hidden="true" />,
              },
              {
                value: 'business',
                label: 'Business',
                description: 'A company or organisation.',
                icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
              },
            ]}
          />
        </FormSection>

        <FormSection title="Verification and colour" description="One-time codes and brand accents.">
          <FormGrid>
            <OtpField
              label="Verification code"
              value={otp}
              onChange={setOtp}
              hint="Paste or use your device autofill."
            />
            <ColorField
              label="Document accent"
              value={accent}
              onChange={setAccent}
              hint="Used on public quote and receipt pages."
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Validation summary" description="Shown at the top of a form when several fields need attention.">
          <ValidationSummary
            errors={[
              { message: 'Enter the business name you want on your documents.', field: 'Business name' },
              { message: 'Enter a valid billing email.', field: 'Billing email' },
              { message: 'The due date cannot be in the past.', field: 'Next due date' },
            ]}
          />

          <Alert variant="info" title="Tip">
            Move focus to the first invalid field when the summary appears.
          </Alert>
        </FormSection>
      </section>

      {/* DataTable states */}
      <section className="space-y-4">
        <div>
          <h2 className="text-title text-text">data table</h2>
          <p className="text-caption text-text-muted">
            Square shell, 2px ink outline, brutal header rule, divided rows and a mobile
            card fallback.
          </p>
        </div>

        <DataTable
          columns={columns}
          rows={DEMO_ROWS}
          getRowKey={(row) => row.id}
          caption="Invoices"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key) => {
            if (key === sortBy) {
              setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
            } else {
              setSortBy(key);
              setSortOrder('asc');
            }
          }}
          onRowClick={() => {}}
          renderMobileCard={renderMobileCard}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-heading text-text">Loading</h3>
            <DataTable
              columns={columns}
              rows={[]}
              getRowKey={(row) => row.id}
              loading
              renderMobileCard={renderMobileCard}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-heading text-text">Empty</h3>
            <DataTable
              columns={columns}
              rows={[]}
              getRowKey={(row) => row.id}
              emptyState={<EmptyState {...emptyStates.invoicesFirst} compact />}
              renderMobileCard={renderMobileCard}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <h3 className="text-heading text-text">Error</h3>
            <DataTable
              columns={columns}
              rows={[]}
              getRowKey={(row) => row.id}
              errorState={
                <ErrorState
                  compact
                  title="Could not load invoices"
                  description="Check your connection and try again. Nothing was changed."
                  retryLabel="Try again"
                  onRetry={() => {}}
                />
              }
              renderMobileCard={renderMobileCard}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title text-text">loading skeletons</h2>
        <div className="space-y-3 border-brut border-ink bg-surface p-4">
          <div className="h-6 w-40 animate-pulse bg-surface-tint motion-reduce:animate-none" />
          <div className="h-20 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title text-text">status and money</h2>
        <div className="flex flex-wrap gap-2">
          {['draft', 'sent', 'payment_claimed', 'partially_paid', 'paid', 'overdue', 'cancelled'].map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="space-y-1">
          <Money amountMinor={45000000} currency="NGN" className="text-amount-l" hideCurrencyCode />
          <br />
          <Money amountMinor={85000} currency="USD" variant="paid" className="text-amount-m" hideCurrencyCode />
          <br />
          <Money amountMinor={32000} currency="GBP" variant="muted" className="text-amount-s" hideCurrencyCode />
          <br />
          <Money amountMinor={21000} currency="EUR" className="text-amount-s" hideCurrencyCode />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title text-text">dialog</h2>
        <Button variant="outline" onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="void invoice 0041?">
          <p className="text-body text-text-soft">
            Tolu Studio won&rsquo;t be able to pay it. This can&rsquo;t be undone.
          </p>
          <div className="flex justify-between gap-3">
            <Button variant="outline" zone="calm" onClick={() => setOpen(false)}>Keep it</Button>
            <Button variant="danger" zone="calm" onClick={() => setOpen(false)}>Void invoice</Button>
          </div>
        </Dialog>
      </section>
    </main>
  );
}
