'use client';

/*
 * Phones get the step flow. Tablet and desktop keep the single-page form,
 * unchanged apart from reading its state from useInvoiceDraft.
 * Both views share the same hook, so they can never disagree on totals.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { InvoiceDocument, LineItemsEditor } from '@/components/invoice';
import { MoneyField } from '@/components/ui/MoneyField';
import { NewInvoiceFlow } from '@/components/mobile/NewInvoiceFlow';
import { Money } from '@/components/money/Money';
import {
  Alert,
  BaggSelect,
  Button,
  DateField,
  Dialog,
  FormGrid,
  FormPageLayout,
  FormSection,
  NumberField,
  PageContainer,
  PageHeader,
  SummaryRail,
  TextArea,
  buttonStyles,
} from '@/components/ui';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import { PaymentSetupPrompt } from '@/components/payments/PaymentSetupPrompt';
import { SUPPORTED_CURRENCIES, useInvoiceDraft } from '@/hooks/useInvoiceDraft';
import { cleanAmount } from '@/lib/amount';

export default function NewInvoicePage() {
  const router = useRouter();
  const draft = useInvoiceDraft();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  const selectedClient = draft.clients.find(
    (client) => client.id === draft.selectedClientId,
  );

  const handleSaveDraft = async () => {
    const id = await draft.saveDraft();
    if (id !== null) router.push('/invoices');
  };

  return (
    <>
      <div className="sm:hidden">
        <NewInvoiceFlow draft={draft} />
      </div>

      <PageContainer width="form" className="hidden sm:block pb-24 sm:pb-16">
        <div className="space-y-4">
          <Link href="/invoices" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeftIcon aria-hidden className="h-4 w-4" />
            Back to invoices
          </Link>
          <PageHeader
            title="New invoice"
            description="Create and send an invoice to your client."
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

        <FormPageLayout
          aside={
            <>
              <PaymentSetupPrompt
                currency={draft.currency}
                validation={draft.profileValidation}
                onRetry={() => void draft.refreshProfileValidation()}
              />

              <SummaryRail
                title="Summary"
                description="Totals update as you edit."
                actions={
                  <>
                    <Button
                      variant="outline"
                      zone="calm"
                      size="lg"
                      fullWidth
                      onClick={() => setPreviewOpen(true)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="lg"
                      fullWidth
                      loading={draft.saving}
                      onClick={handleSaveDraft}
                    >
                      Save draft
                    </Button>
                  </>
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body text-text-soft">Subtotal</span>
                  <Money
                    amountMinor={draft.subtotalMinor}
                    currency={draft.currency}
                    hideCurrencyCode
                  />
                </div>

                <MoneyField
                  label="Discount"
                  currency={draft.currency}
                  value={draft.discountText}
                  onChange={(v) =>
                    draft.setDiscountText(cleanAmount(v, draft.discountText))
                  }
                />

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

                <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-3">
                  <span className="text-body-l font-extrabold text-text">
                    Total due
                  </span>
                  <Money
                    amountMinor={draft.totalMinor}
                    currency={draft.currency}
                    className="text-amount-m"
                    hideCurrencyCode
                  />
                </div>
              </SummaryRail>
            </>
          }
        >
          <FormSection
            title="Bill to"
            description="Choose the client and the currency for this invoice."
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

            <BaggSelect
              label="Currency"
              value={draft.currency}
              onChange={draft.setCurrency}
              options={SUPPORTED_CURRENCIES.map((currency) => ({
                value: currency.code,
                label: currency.label,
              }))}
            />

            {selectedClient && (
              <div className="border-brut-thin border-ink bg-surface-sunken p-3">
                <p className="text-body font-extrabold text-text">
                  {selectedClient.name}
                </p>
                <p className="mt-0.5 text-caption text-text-muted">
                  {selectedClient.email ?? 'No billing email'} ·{' '}
                  {selectedClient.preferred_currency} ·{' '}
                  {selectedClient.default_payment_terms_days} day terms
                </p>
              </div>
            )}
          </FormSection>

          <FormSection
            title="Invoice details"
            description="When the invoice is issued and when payment is due."
          >
            <FormGrid>
              <DateField
                label="Issue date"
                required
                value={draft.issueDate}
                onChange={(e) => draft.handleIssueDateChange(e.target.value)}
              />

              <DateField
                label="Due date"
                required
                value={draft.dueDate}
                onChange={(e) => draft.setDueDate(e.target.value)}
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Items"
            description="What you're billing for. Add one row per service or product."
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
            description="Optional context shown to your client on the invoice."
          >
            <TextArea
              label="Note for your client"
              optional
              rows={5}
              placeholder="e.g. Include the invoice number in your transfer reference."
              value={draft.notes}
              onChange={(e) => draft.setNotes(e.target.value)}
            />
          </FormSection>
        </FormPageLayout>

        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title="what your client will see"
          className="max-h-[90dvh] max-w-lg overflow-y-auto"
        >
          <InvoiceDocument variant="issuer" invoice={draft.previewInvoice} />
          <Button
            variant="outline"
            zone="calm"
            fullWidth
            onClick={() => setPreviewOpen(false)}
          >
            Close preview
          </Button>
        </Dialog>

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
