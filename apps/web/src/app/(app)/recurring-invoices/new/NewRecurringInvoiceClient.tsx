'use client';

/*
 * Phones get the mobile step flow (NewRecurringFlow). Tablet and desktop keep
 * the single-page form, with both views sharing useRecurringDraft so totals,
 * validation, and API payload are identical.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { LineItemsEditor } from '@/components/invoice';
import { NewRecurringFlow } from '@/components/mobile/NewRecurringFlow';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import { Money } from '@/components/money/Money';
import {
  Alert,
  BaggSelect,
  Button,
  DateField,
  FormGrid,
  FormPageLayout,
  FormSection,
  FormSubsection,
  NumberField,
  PageContainer,
  PageHeader,
  RadioGroup,
  SummaryRail,
  TextArea,
  TextField,
  buttonStyles,
} from '@/components/ui';
import {
  useRecurringDraft,
  FREQUENCY_OPTIONS,
  SUPPORTED_CURRENCIES,
} from '@/hooks/useRecurringDraft';
import { cleanAmount } from '@/lib/amount';

const CADENCE_UNIT: Record<string, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

function formatIsoDate(value: string) {
  if (!value) return 'Not set';

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NewRecurringInvoiceClient() {
  const router = useRouter();
  const draft = useRecurringDraft();
  const [showClientModal, setShowClientModal] = useState(false);

  const selectedClient = draft.clients.find(
    (client) => client.id === draft.selectedClientId,
  );

  const cadenceUnit = CADENCE_UNIT[draft.frequency] ?? 'month';
  const cadence =
    draft.interval === 1
      ? `every ${cadenceUnit}`
      : `every ${draft.interval} ${cadenceUnit}s`;

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
      <PageContainer width="form" className="hidden sm:block pb-24 sm:pb-16">
        <div className="space-y-4">
          <Link href="/recurring-invoices" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            All recurring
          </Link>
          <PageHeader
            title="New recurring schedule"
            description="Set up an automated schedule for repeat invoicing."
          />
        </div>

        {draft.errorMsg && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => draft.setErrorMsg(null)}
          >
            {draft.errorMsg}
          </Alert>
        )}

        <form onSubmit={handleDesktopSubmit}>
          <FormPageLayout
            aside={
              <SummaryRail
                title="Schedule summary"
                description="Totals are per generated invoice."
                actions={
                  <>
                    <Link
                      href="/recurring-invoices"
                      className={buttonStyles({
                        variant: 'outline',
                        zone: 'calm',
                        fullWidth: true,
                      })}
                    >
                      Cancel
                    </Link>
                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      fullWidth
                      loading={draft.saving}
                    >
                      Create recurring schedule
                    </Button>
                  </>
                }
              >
                <div className="space-y-1 border-b border-line-subtle pb-3">
                  <p className="text-body font-extrabold text-text">
                    {draft.name || 'Untitled schedule'}
                  </p>
                  <p className="text-caption text-text-muted">
                    {selectedClient?.name ?? 'No client selected'}
                  </p>
                  <p className="text-caption text-text-muted">
                    Invoices {cadence} · due {draft.dueDateOffsetDays} days after
                    issue
                  </p>
                  <p className="text-caption text-text-muted">
                    Starts {formatIsoDate(draft.startDate)}
                  </p>
                </div>

                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body text-text-soft">Subtotal</span>
                  <Money
                    amountMinor={draft.subtotalMinor}
                    currency={draft.currency}
                    hideCurrencyCode
                  />
                </div>

                <NumberField
                  label="VAT or tax"
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
                  label="Withholding tax"
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

                <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-3">
                  <span className="text-body-l font-extrabold text-text">
                    Total per cycle
                  </span>
                  <Money
                    amountMinor={draft.totalMinor}
                    currency={draft.currency}
                    className="text-amount-m"
                    hideCurrencyCode
                  />
                </div>
              </SummaryRail>
            }
          >
            <FormSection
              title="Schedule"
              description="Name the schedule and choose who it bills."
              action={
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowClientModal(true)}
                >
                  + Add new client
                </Button>
              }
            >
              <TextField
                label="Schedule name"
                required
                placeholder="e.g. Monthly Design Retainer"
                value={draft.name}
                onChange={(e) => draft.setName(e.target.value)}
              />

              {draft.clients.length > 0 ? (
                <BaggSelect
                  label="Client"
                  required
                  searchable={draft.clients.length > 8}
                  value={draft.selectedClientId}
                  onChange={draft.handleClientChange}
                  options={draft.clients.map((client) => ({
                    value: client.id,
                    label: `${client.name} (${client.preferred_currency})`,
                  }))}
                />
              ) : (
                <div className="border-brut-thin border-ink bg-surface-sunken p-4">
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

              <FormGrid>
                <BaggSelect
                  label="Currency"
                  value={draft.currency}
                  onChange={draft.setCurrency}
                  options={SUPPORTED_CURRENCIES.map((currency) => ({
                    value: currency.code,
                    label: currency.label,
                  }))}
                />

                <DateField
                  label="Start date"
                  required
                  value={draft.startDate}
                  onChange={(e) => draft.setStartDate(e.target.value)}
                />
              </FormGrid>
            </FormSection>

            <FormSection
              title="Cadence"
              description="How often invoices are generated and when they are due."
            >
              <FormGrid>
                <BaggSelect
                  label="Frequency"
                  value={draft.frequency}
                  onChange={(value) =>
                    draft.setFrequency(
                      value as typeof draft.frequency,
                    )
                  }
                  options={FREQUENCY_OPTIONS.map((frequency) => ({
                    value: frequency.value,
                    label: frequency.label,
                  }))}
                />

                <NumberField
                  label="Every"
                  suffix={cadenceUnit}
                  min={1}
                  max={12}
                  value={draft.interval}
                  onChange={(e) =>
                    draft.setIntervalVal(Number(e.target.value) || 1)
                  }
                />

                <NumberField
                  label="Payment due in"
                  suffix="days"
                  min={0}
                  max={365}
                  value={draft.dueDateOffsetDays}
                  onChange={(e) =>
                    draft.setDueDateOffsetDays(Number(e.target.value))
                  }
                />

                <NumberField
                  label="Draft lead time"
                  suffix="days"
                  min={0}
                  max={30}
                  hint="How early a draft is created for review."
                  value={draft.draftLeadDays}
                  onChange={(e) =>
                    draft.setDraftLeadDays(Number(e.target.value))
                  }
                />
              </FormGrid>

              <p className="border-brut-thin border-ink bg-surface-sunken p-3 text-body text-text-soft">
                Invoices {cadence}, due {draft.dueDateOffsetDays} days after
                issue
                {draft.issueMode === 'draft'
                  ? `, drafted ${draft.draftLeadDays} days early.`
                  : ', issued automatically.'}
              </p>
            </FormSection>

            <FormSection
              title="Issuance & end"
              description="Decide whether drafts need review and when the schedule stops."
            >
              <FormSubsection title="Issuance mode">
                <RadioGroup
                  label="How should invoices be issued?"
                  value={draft.issueMode}
                  onChange={(value) =>
                    draft.setIssueMode(value as typeof draft.issueMode)
                  }
                  variant="cards"
                  columns={2}
                  options={[
                    {
                      value: 'draft',
                      label: 'Draft review',
                      description: `Generate as a draft ${draft.draftLeadDays} days before the due date so you can review it.`,
                    },
                    {
                      value: 'auto_issue',
                      label: 'Automatic issuance',
                      description:
                        'Issue and email invoices automatically without waiting for approval.',
                    },
                  ]}
                />
              </FormSubsection>

              <FormSubsection title="End condition" divided>
                <RadioGroup
                  label="When should this schedule end?"
                  value={draft.endRule}
                  onChange={(value) =>
                    draft.setEndRule(value as typeof draft.endRule)
                  }
                  variant="cards"
                  columns={3}
                  options={[
                    {
                      value: 'never',
                      label: 'Never',
                      description: 'Runs until you cancel it.',
                    },
                    {
                      value: 'after_count',
                      label: 'After a count',
                      description: 'Stop after a fixed number of invoices.',
                    },
                    {
                      value: 'on_date',
                      label: 'On a date',
                      description: 'Stop on a specific date.',
                    },
                  ]}
                />

                {draft.endRule === 'after_count' && (
                  <div className="max-w-xs">
                    <NumberField
                      label="Total occurrences"
                      min={1}
                      required
                      value={draft.endAfterCount}
                      onChange={(e) =>
                        draft.setEndAfterCount(Number(e.target.value))
                      }
                    />
                  </div>
                )}

                {draft.endRule === 'on_date' && (
                  <div className="max-w-xs">
                    <DateField
                      label="End date"
                      required
                      value={draft.endDate}
                      onChange={(e) => draft.setEndDate(e.target.value)}
                    />
                  </div>
                )}
              </FormSubsection>
            </FormSection>

            <FormSection
              title="Items"
              description="What each generated invoice will bill for."
            >
              <LineItemsEditor
                bare
                items={draft.items}
                onChange={draft.setItems}
                currency={draft.currency}
              />
            </FormSection>

            <FormSection
              title="Notes"
              description="Shown on every generated invoice."
            >
              <TextArea
                label="Schedule notes"
                optional
                rows={4}
                placeholder="e.g. Invoiced per signed monthly retainer agreement"
                value={draft.notes}
                onChange={(e) => draft.setNotes(e.target.value)}
              />
            </FormSection>
          </FormPageLayout>
        </form>

        <InlineClientModal
          open={showClientModal}
          onClose={() => setShowClientModal(false)}
          onClientCreated={draft.addClient}
          defaultCurrency={draft.currency}
        />
      </PageContainer>
    </>
  );
}
