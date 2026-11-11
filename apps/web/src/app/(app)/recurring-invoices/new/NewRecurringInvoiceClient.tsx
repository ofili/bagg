'use client';

/*
 * Phones get the mobile step flow (NewRecurringFlow). Tablet and desktop keep
 * the single-page form, with both views sharing useRecurringDraft so totals,
 * validation, and API payload are identical.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash, X } from '@phosphor-icons/react';
import { LineItemsEditor } from '@/components/invoice';
import { NewRecurringFlow } from '@/components/mobile/NewRecurringFlow';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import { Money } from '@/components/money/Money';
import {
  BaggSelect,
  Button,
  Card,
  Field,
  Input,
  buttonStyles,
  inputStyles,
} from '@/components/ui';
import {
  useRecurringDraft,
  FREQUENCY_OPTIONS,
  SUPPORTED_CURRENCIES,
} from '@/hooks/useRecurringDraft';
import { cleanAmount } from '@/lib/amount';
import { cn } from '@/lib/cn';

export default function NewRecurringInvoiceClient() {
  const router = useRouter();
  const draft = useRecurringDraft();
  const [showClientModal, setShowClientModal] = useState(false);

  async function handleDesktopSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await draft.saveSchedule();
    if (result && result.id) {
      router.push(`/recurring-invoices/${result.id}`);
    }
  }

  return (
    <>
      {/* Mobile Screen: 4-Step Flow */}
      <div className="sm:hidden">
        <NewRecurringFlow draft={draft} />
      </div>

      {/* Tablet & Desktop: Single-page form */}
      <div className="hidden w-full max-w-4xl space-y-6 p-4 pb-24 sm:block sm:space-y-6 sm:p-6 sm:pb-16 lg:p-8">
        <div className="space-y-2">
          <Link href="/recurring-invoices" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            All recurring
          </Link>
          <h1 className="text-title-l sm:text-display">new recurring schedule</h1>
          <p className="text-body text-text-soft">Set up an automated schedule for repeat invoicing</p>
        </div>

        {draft.errorMsg && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
          >
            <span className="pt-2">{draft.errorMsg}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => draft.setErrorMsg(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
        )}

        <form onSubmit={handleDesktopSubmit} className="space-y-6">
          {/* General Details */}
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-heading font-black text-ink">General details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Schedule name">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="text"
                    required
                    placeholder="e.g. Monthly Design Retainer"
                    value={draft.name}
                    onChange={(e) => draft.setName(e.target.value)}
                  />
                )}
              </Field>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-body font-medium text-text">Client</label>
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="text-caption font-bold text-mango hover:underline"
                  >
                    + Add new client
                  </button>
                </div>
                {draft.clients.length > 0 ? (
                  <BaggSelect
                    label=""
                    className="w-full"
                    value={draft.selectedClientId}
                    onChange={draft.handleClientChange}
                    options={draft.clients.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.preferred_currency})`,
                    }))}
                  />
                ) : (
                  <div className="rounded-input border border-dashed border-line p-3">
                    <p className="text-body text-text-soft">
                      No clients yet.{' '}
                      <button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="font-extrabold text-link underline underline-offset-4"
                      >
                        Add a client
                      </button>
                    </p>
                  </div>
                )}
              </div>

              <BaggSelect
                label="Currency"
                className="w-full"
                value={draft.currency}
                onChange={draft.setCurrency}
                options={SUPPORTED_CURRENCIES.map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
              />

              <Field label="Start date">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="date"
                    required
                    value={draft.startDate}
                    onChange={(e) => draft.setStartDate(e.target.value)}
                  />
                )}
              </Field>
            </div>
          </Card>

          {/* Schedule Cadence */}
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-heading font-black text-ink">Frequency & Timing</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <BaggSelect
                label="Frequency"
                className="w-full"
                value={draft.frequency}
                onChange={(val) => draft.setFrequency(val as any)}
                options={FREQUENCY_OPTIONS.map((f) => ({
                  value: f.value,
                  label: f.label,
                }))}
              />

              <Field label="Every (interval count)">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="number"
                    min="1"
                    max="12"
                    value={draft.interval}
                    onChange={(e) => draft.setIntervalVal(Number(e.target.value) || 1)}
                  />
                )}
              </Field>

              <Field label="Draft lead time (days in advance)">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="number"
                    min="0"
                    max="30"
                    value={draft.draftLeadDays}
                    onChange={(e) => draft.setDraftLeadDays(Number(e.target.value))}
                  />
                )}
              </Field>

              <Field label="Payment due in (days)">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="number"
                    min="0"
                    max="365"
                    value={draft.dueDateOffsetDays}
                    onChange={(e) => draft.setDueDateOffsetDays(Number(e.target.value))}
                  />
                )}
              </Field>
            </div>

            <div className="pt-2">
              <p className="text-caption font-bold text-ink">Issuance mode</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-card border-brut p-3 transition-colors',
                    draft.issueMode === 'draft'
                      ? 'border-ink bg-sun/20 shadow-brut-sm'
                      : 'border-line bg-surface hover:bg-surface-tint',
                  )}
                >
                  <input
                    type="radio"
                    name="issue_mode_desktop"
                    checked={draft.issueMode === 'draft'}
                    onChange={() => draft.setIssueMode('draft')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold text-ink">Draft review (Recommended)</p>
                    <p className="text-caption text-text-soft">
                      Generate as draft {draft.draftLeadDays} days prior to allow manual review before sending.
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-card border-brut p-3 transition-colors',
                    draft.issueMode === 'auto_issue'
                      ? 'border-ink bg-sun/20 shadow-brut-sm'
                      : 'border-line bg-surface hover:bg-surface-tint',
                  )}
                >
                  <input
                    type="radio"
                    name="issue_mode_desktop"
                    checked={draft.issueMode === 'auto_issue'}
                    onChange={() => draft.setIssueMode('auto_issue')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold text-ink">Automatic issuance</p>
                    <p className="text-caption text-text-soft">
                      Automatically issues and emails invoices without waiting for approval.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* End condition */}
            <div className="pt-2">
              <p className="text-caption font-bold text-ink">When should this schedule end?</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-card border-brut p-3',
                    draft.endRule === 'never'
                      ? 'border-ink bg-sun/20 shadow-brut-sm'
                      : 'border-line bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="end_rule_desktop"
                    checked={draft.endRule === 'never'}
                    onChange={() => draft.setEndRule('never')}
                  />
                  <span className="font-bold text-ink">Never (until cancelled)</span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-card border-brut p-3',
                    draft.endRule === 'after_count'
                      ? 'border-ink bg-sun/20 shadow-brut-sm'
                      : 'border-line bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="end_rule_desktop"
                    checked={draft.endRule === 'after_count'}
                    onChange={() => draft.setEndRule('after_count')}
                  />
                  <span className="font-bold text-ink">After fixed count</span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-card border-brut p-3',
                    draft.endRule === 'on_date'
                      ? 'border-ink bg-sun/20 shadow-brut-sm'
                      : 'border-line bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="end_rule_desktop"
                    checked={draft.endRule === 'on_date'}
                    onChange={() => draft.setEndRule('on_date')}
                  />
                  <span className="font-bold text-ink">On a specific date</span>
                </label>
              </div>

              {draft.endRule === 'after_count' && (
                <div className="mt-3 max-w-xs">
                  <Field label="Total occurrences">
                    {({ id, ...a11y }) => (
                      <Input
                        id={id}
                        {...a11y}
                        type="number"
                        min="1"
                        required
                        value={draft.endAfterCount}
                        onChange={(e) => draft.setEndAfterCount(Number(e.target.value))}
                      />
                    )}
                  </Field>
                </div>
              )}

              {draft.endRule === 'on_date' && (
                <div className="mt-3 max-w-xs">
                  <Field label="End date">
                    {({ id, ...a11y }) => (
                      <Input
                        id={id}
                        {...a11y}
                        type="date"
                        required
                        value={draft.endDate}
                        onChange={(e) => draft.setEndDate(e.target.value)}
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
          </Card>

          {/* Line items editor (shared component) */}
          <LineItemsEditor
            items={draft.items}
            onChange={draft.setItems}
            currency={draft.currency}
          />

          {/* Taxes & Summary Card */}
          <section className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Schedule notes"
              hint="Shown on every generated invoice, for example contract or service references."
            >
              {({ id, ...a11y }) => (
                <textarea
                  id={id}
                  {...a11y}
                  rows={4}
                  placeholder="e.g. Invoiced per signed monthly retainer agreement"
                  value={draft.notes}
                  onChange={(e) => draft.setNotes(e.target.value)}
                  className={cn(inputStyles, 'min-h-32 py-2')}
                />
              )}
            </Field>

            <Card zone="calm" className="space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">Subtotal</span>
                <Money
                  amountMinor={draft.subtotalMinor}
                  currency={draft.currency}
                  hideCurrencyCode
                />
              </div>

              <Field label="VAT / Tax (%)">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.taxText}
                    onChange={(e) => draft.setTaxText(cleanAmount(e.target.value, draft.taxText))}
                  />
                )}
              </Field>

              <Field label="Withholding Tax (%)">
                {({ id, ...a11y }) => (
                  <Input
                    id={id}
                    {...a11y}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.whtText}
                    onChange={(e) => draft.setWhtText(cleanAmount(e.target.value, draft.whtText))}
                  />
                )}
              </Field>

              {draft.taxMinor > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body text-text-soft">Tax amount</span>
                  <Money
                    amountMinor={draft.taxMinor}
                    currency={draft.currency}
                    hideCurrencyCode
                  />
                </div>
              )}

              {draft.whtMinor > 0 && (
                <div className="flex items-baseline justify-between gap-3 text-danger">
                  <span className="text-body">WHT deduction</span>
                  <span>
                    -<Money
                      amountMinor={draft.whtMinor}
                      currency={draft.currency}
                      hideCurrencyCode
                    />
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span className="text-body-l font-extrabold">Total per cycle</span>
                <Money
                  amountMinor={draft.totalMinor}
                  currency={draft.currency}
                  className="text-amount-m"
                  hideCurrencyCode
                />
              </div>
            </Card>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/recurring-invoices"
              className={buttonStyles({ variant: 'outline' })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={draft.saving}
            >
              Create recurring schedule
            </Button>
          </div>
        </form>
        <InlineClientModal
          open={showClientModal}
          onClose={() => setShowClientModal(false)}
          onClientCreated={draft.addClient}
          defaultCurrency={draft.currency}
        />
      </div>
    </>
  );
}
