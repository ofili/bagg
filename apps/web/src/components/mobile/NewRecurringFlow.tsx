'use client';

/*
 * Phone-only step flow for creating a recurring invoice schedule (4 steps):
 *   1 client   2 items   3 schedule   4 review
 *
 * Built to match NewInvoiceFlow and NewQuoteFlow mobile step UX,
 * using shared useRecurringDraft state so phone and desktop views stay in sync.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check, UserPlus, X } from '@phosphor-icons/react';
import { BagCharacter } from '@/components/brand';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import { LineItemsEditor } from '@/components/invoice';
import { Money } from '@/components/money/Money';
import {
  Alert,
  BaggSelect,
  Button,
  Card,
  DateField,
  FormGrid,
  NumberField,
  RadioGroup,
  SearchInput,
  TextField,
} from '@/components/ui';
import {
  type RecurringDraft,
  type RecurringClient,
  FREQUENCY_OPTIONS,
  SUPPORTED_CURRENCIES,
} from '@/hooks/useRecurringDraft';
import { cleanAmount } from '@/lib/amount';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';

const STEPS = ['client', 'items', 'schedule', 'review'] as const;
const TITLES = [
  'Who is it for?',
  'What are you scheduling?',
  'How often should it repeat?',
  'Looks good?',
];

const initials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export function NewRecurringFlow({ draft }: { draft: RecurringDraft }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus step heading on step change
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const client = draft.clients.find((c: RecurringClient) => c.id === draft.selectedClientId);
  const filteredClients = draft.clients.filter((c: RecurringClient) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function next() {
    draft.setErrorMsg(null);
    if (step === 0) {
      if (!draft.selectedClientId) {
        draft.setErrorMsg('Pick a client first, or add one.');
        return;
      }
      if (!draft.name.trim()) {
        draft.setErrorMsg('Give this recurring schedule a name.');
        return;
      }
    }
    if (step === 1) {
      if (draft.items.length === 0) {
        draft.setErrorMsg('Add at least one line item.');
        return;
      }
      for (const item of draft.items) {
        if (!item.description.trim()) {
          draft.setErrorMsg('All line items must have a description.');
          return;
        }
      }
    }
    if (step === 2) {
      if (draft.endRule === 'after_count' && (!draft.endAfterCount || draft.endAfterCount < 1)) {
        draft.setErrorMsg('Please specify number of occurrences.');
        return;
      }
      if (draft.endRule === 'on_date' && !draft.endDate) {
        draft.setErrorMsg('Please choose an end date.');
        return;
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    draft.setErrorMsg(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleCreate() {
    const res = await draft.saveSchedule();
    if (res && res.id) {
      router.push(`/recurring-invoices/${res.id}`);
    }
  }

  return (
    <div className="space-y-5 p-4 pb-44">
      {/* Step Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/recurring-invoices"
            aria-label="Close and return to recurring invoices"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-surface"
          >
            <X aria-hidden className="h-5 w-5" />
          </Link>
          <p className="flex-1 text-body-l font-extrabold">New recurring</p>
          <p className="text-caption text-text-soft">
            {step + 1} of {STEPS.length}
          </p>
        </div>

        <div
          role="progressbar"
          aria-label="Recurring schedule creation progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="flex gap-1.5"
        >
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full border-brut-thin border-ink',
                i <= step ? 'bg-mango' : 'bg-surface-tint',
              )}
            />
          ))}
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-title-l outline-none">
        {TITLES[step]}
      </h1>

      {/* Error Message */}
      {draft.errorMsg && (
        <Alert
          variant="error"
          dismissible
          onDismiss={() => draft.setErrorMsg(null)}
        >
          {draft.errorMsg}
        </Alert>
      )}

      {/* STEP 0: CLIENT & BASIC DETAILS */}
      {step === 0 && (
        <div className="space-y-4">
          <TextField
            label="Schedule name"
            required
            hint="For example: Monthly Retainer, Website Support"
            placeholder="e.g. Monthly Design Retainer"
            value={draft.name}
            onChange={(e) => draft.setName(e.target.value)}
          />

          <BaggSelect
            label="Currency"
            value={draft.currency}
            onChange={draft.setCurrency}
            options={SUPPORTED_CURRENCIES.map((c) => ({
              value: c.code,
              label: c.label,
            }))}
          />

          <div className="pt-2">
            <p className="text-body font-medium text-text mb-2">Select client</p>
            {draft.clientsLoaded && draft.clients.length === 0 ? (
              <Card tone="peach" className="space-y-3 p-6 text-center">
                <BagCharacter size={72} mood="happy" className="mx-auto" decorative />
                <h2 className="text-title">Add your first client</h2>
                <p className="text-body text-text-soft">
                  You need a client before you can set up a recurring schedule.
                </p>
                <Button size="lg" onClick={() => setShowClientModal(true)}>
                  <UserPlus aria-hidden className="h-4 w-4" /> Add a client
                </Button>
              </Card>
            ) : (
              <>
                {draft.clients.length > 5 && (
                  <div className="mb-3">
                    <SearchInput
                      value={query}
                      onChange={setQuery}
                      placeholder="Search clients"
                    />
                  </div>
                )}

                <div
                  role="radiogroup"
                  aria-label="Client"
                  className="overflow-hidden border-brut border-ink bg-surface"
                >
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="flex min-h-16 w-full items-center gap-3 px-3 font-extrabold hover:bg-surface-tint text-left"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink">
                      <UserPlus aria-hidden className="h-5 w-5" />
                    </span>
                    Add new client
                  </button>

                  {filteredClients.map((c: RecurringClient) => {
                    const on = c.id === draft.selectedClientId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => draft.handleClientChange(c.id)}
                        className={cn(
                          'flex min-h-16 w-full items-center gap-3 border-t border-line-subtle px-3 text-left transition-colors',
                          on ? 'bg-sun/20 font-extrabold' : 'hover:bg-surface-tint',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink text-body font-bold',
                            on ? 'bg-mango text-on-mango' : 'bg-surface-tint text-text',
                          )}
                        >
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body text-ink">{c.name}</p>
                          {c.email && (
                            <p className="truncate text-caption text-text-muted">{c.email}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink',
                            on ? 'bg-sun text-on-sun' : 'bg-surface',
                          )}
                        >
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: LINE ITEMS */}
      {step === 1 && (
        <div className="space-y-4">
          <LineItemsEditor
            items={draft.items}
            onChange={draft.setItems}
            currency={draft.currency}
          />
        </div>
      )}

      {/* STEP 2: CADENCE & TIMING */}
      {step === 2 && (
        <div className="space-y-4">
          <Card zone="calm" className="space-y-4 p-4">
            <RadioGroup
              label="Frequency"
              value={draft.frequency}
              onChange={(value) =>
                draft.setFrequency(value as RecurringDraft['frequency'])
              }
              variant="cards"
              columns={2}
              options={FREQUENCY_OPTIONS.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
            />

            <FormGrid>
              <NumberField
                label="Repeat every"
                required
                min={1}
                max={12}
                step={1}
                value={draft.interval}
                onChange={(e) =>
                  draft.setIntervalVal(Number(e.target.value) || 1)
                }
              />

              <DateField
                label="Start date"
                required
                value={draft.startDate}
                onChange={(e) => draft.setStartDate(e.target.value)}
              />
            </FormGrid>
          </Card>

          <Card zone="calm" className="space-y-4 p-4">
            <RadioGroup
              label="Issuance"
              value={draft.issueMode}
              onChange={(value) =>
                draft.setIssueMode(value as 'draft' | 'auto_issue')
              }
              variant="cards"
              columns={1}
              options={[
                {
                  value: 'draft',
                  label: 'Draft review',
                  description: `Generate as draft ${draft.draftLeadDays} days in advance for manual review.`,
                },
                {
                  value: 'auto_issue',
                  label: 'Automatic issuance',
                  description:
                    'Automatically issues and emails invoices without waiting for approval.',
                },
              ]}
            />

            <FormGrid>
              <NumberField
                label="Draft lead (days)"
                min={0}
                max={30}
                step={1}
                value={draft.draftLeadDays}
                onChange={(e) =>
                  draft.setDraftLeadDays(Number(e.target.value))
                }
              />

              <NumberField
                label="Payment due (days)"
                min={0}
                max={365}
                step={1}
                value={draft.dueDateOffsetDays}
                onChange={(e) =>
                  draft.setDueDateOffsetDays(Number(e.target.value))
                }
              />
            </FormGrid>
          </Card>

          <Card zone="calm" className="space-y-4 p-4">
            <RadioGroup
              label="End condition"
              value={draft.endRule}
              onChange={(value) =>
                draft.setEndRule(
                  value as 'never' | 'after_count' | 'on_date',
                )
              }
              direction="horizontal"
              options={[
                { value: 'never', label: 'Never end' },
                { value: 'after_count', label: 'Fixed count' },
                { value: 'on_date', label: 'On a date' },
              ]}
            />

            {draft.endRule === 'after_count' && (
              <NumberField
                label="Total number of invoices"
                required
                min={1}
                step={1}
                value={draft.endAfterCount}
                onChange={(e) => draft.setEndAfterCount(Number(e.target.value))}
              />
            )}

            {draft.endRule === 'on_date' && (
              <DateField
                label="End date"
                required
                value={draft.endDate}
                onChange={(e) => draft.setEndDate(e.target.value)}
              />
            )}
          </Card>

          <Card zone="calm" className="space-y-3 p-4">
            <h3 className="text-body font-bold text-text">Tax and deductions</h3>

            <FormGrid>
              <NumberField
                label="VAT"
                suffix="%"
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={draft.taxText}
                onChange={(e) =>
                  draft.setTaxText(cleanAmount(e.target.value, draft.taxText))
                }
              />

              <NumberField
                label="WHT"
                suffix="%"
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={draft.whtText}
                onChange={(e) =>
                  draft.setWhtText(cleanAmount(e.target.value, draft.whtText))
                }
              />
            </FormGrid>
          </Card>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-brut-thin border-ink bg-mango font-black text-on-mango">
                  {client ? initials(client.name) : '?'}
                </span>
                <div>
                  <p className="font-black text-ink">{draft.name}</p>
                  <p className="text-caption text-text-soft">{client?.name}</p>
                </div>
              </div>
              <span className="rounded-full bg-sun px-2.5 py-0.5 text-caption font-black text-on-sun capitalize">
                {draft.frequency}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-caption text-text-soft">
              <div>
                <p className="font-bold text-ink">First run</p>
                <p>{formatDate(draft.startDate)}</p>
              </div>
              <div>
                <p className="font-bold text-ink">Mode</p>
                <p>{draft.issueMode === 'auto_issue' ? 'Auto issue' : 'Draft review'}</p>
              </div>
            </div>

            {/* Line items summary */}
            <div className="border-t border-line-subtle pt-3">
              <p className="text-caption font-bold text-ink mb-2">Line items</p>
              <div className="space-y-2">
                {draft.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-caption">
                    <span className="text-text-soft">
                      {it.quantity} × {it.description || 'Item'}
                    </span>
                    <Money
                      amountMinor={(it.quantity || 1) * Math.round((parseFloat(it.unit_price) || 0) * 100)}
                      currency={draft.currency}
                      className="font-bold text-ink"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 border-t border-line-subtle pt-3 text-caption text-text-soft">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <Money amountMinor={draft.subtotalMinor} currency={draft.currency} />
              </div>
              {draft.taxMinor > 0 && (
                <div className="flex justify-between">
                  <span>VAT ({draft.taxRate}%)</span>
                  <Money amountMinor={draft.taxMinor} currency={draft.currency} />
                </div>
              )}
              {draft.whtMinor > 0 && (
                <div className="flex justify-between text-danger">
                  <span>WHT deduction ({draft.whtRate}%)</span>
                  <span>-<Money amountMinor={draft.whtMinor} currency={draft.currency} /></span>
                </div>
              )}
              <div className="flex justify-between border-t border-line-subtle pt-2 text-title font-black text-ink">
                <span>Cycle total</span>
                <Money amountMinor={draft.totalMinor} currency={draft.currency} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Persistent Bottom Actions */}
      <footer className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-brut border-ink bg-surface px-4 pt-3 pb-4">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {step > 0 && draft.totalMinor > 0 && (
            <div className="flex items-baseline justify-between text-caption">
              <span className="font-bold text-text-soft">Total per cycle</span>
              <Money
                amountMinor={draft.totalMinor}
                currency={draft.currency}
                className="text-title font-black text-ink"
              />
            </div>
          )}

          {step < 3 ? (
            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" zone="calm" size="lg" onClick={back}>
                  Back
                </Button>
              )}
              <Button size="lg" fullWidth onClick={next}>
                {step === 2 ? 'Review' : 'Next'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="lg"
                variant="accent"
                fullWidth
                loading={draft.saving}
                onClick={handleCreate}
              >
                Activate schedule
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  zone="calm"
                  fullWidth
                  disabled={draft.saving}
                  onClick={back}
                >
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>
      <InlineClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onClientCreated={draft.addClient}
        defaultCurrency={draft.currency}
      />
    </div>
  );
}
