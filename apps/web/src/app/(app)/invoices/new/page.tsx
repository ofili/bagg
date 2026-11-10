'use client';

/*
 * Phones get the step flow. Tablet and desktop keep the single-page form,
 * unchanged apart from reading its state from useInvoiceDraft.
 * Both views share the same hook, so they can never disagree on totals.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, X } from '@phosphor-icons/react';
import { InvoiceDocument, LineItemsEditor } from '@/components/invoice';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { NewInvoiceFlow } from '@/components/mobile/NewInvoiceFlow';
import { Money } from '@/components/money/Money';
import { BaggSelect, Button, Card, Dialog, Field, Input, buttonStyles, inputStyles } from '@/components/ui';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import { SUPPORTED_CURRENCIES, useInvoiceDraft } from '@/hooks/useInvoiceDraft';
import { cleanAmount } from '@/lib/amount';
import { cn } from '@/lib/cn';

export default function NewInvoicePage() {
  const router = useRouter();
  const draft = useInvoiceDraft();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  const handleSaveDraft = async () => {
    const id = await draft.saveDraft();
    if (id !== null) router.push('/invoices');
  };

  return (
      <>
        <div className="sm:hidden">
          <NewInvoiceFlow draft={draft} />
        </div>

        <div className="hidden w-full max-w-3xl space-y-6 p-4 pb-24 sm:block sm:space-y-6 sm:p-6 sm:pb-16 lg:p-8">
          <div className="space-y-2">
            <Link href="/invoices" className={buttonStyles({ variant: 'outline' })}>
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Back to invoices
            </Link>
            <h1 className="text-title-l sm:text-display">new invoice</h1>
          </div>

          {draft.errorMsg && (
              <div
                  role="alert"
                  className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
              >
                <span className="pt-2">{draft.errorMsg}</span>
                <button
                    type="button"
                    aria-label="Dismiss message"
                    onClick={() => draft.setErrorMsg(null)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
                >
                  <X aria-hidden className="h-5 w-5" />
                </button>
              </div>
          )}

          {draft.profileValidation && !draft.profileValidation.has_profile && (
              <Card zone="calm" tone="sun" className="space-y-2">
                <h2 className="text-heading">no {draft.currency} payment details yet</h2>
                <p className="text-body">
                  Add your bank or payment details for {draft.currency} before you send this invoice, so your client knows
                  where to pay.
                </p>
                <Link href="/settings" className={buttonStyles({ variant: 'link' })}>
                  <CreditCard aria-hidden className="h-4 w-4" /> Add {draft.currency} details in settings
                </Link>
              </Card>
          )}

          {/* Client, currency, dates */}
          <Card zone="calm" className="grid gap-4 p-5 sm:grid-cols-2">
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
                options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
            />

            <Field label="Issue date">
              {(a) => (
                  <Input
                      type="date"
                      value={draft.issueDate}
                      onChange={(e) => draft.handleIssueDateChange(e.target.value)}
                      {...a}
                  />
              )}
            </Field>

            <Field label="Due date">
              {(a) => <Input type="date" value={draft.dueDate} onChange={(e) => draft.setDueDate(e.target.value)} {...a} />}
            </Field>
          </Card>

          <LineItemsEditor items={draft.items} onChange={draft.setItems} currency={draft.currency} />

          {/* Notes and totals */}
          <section className="grid gap-6 sm:grid-cols-2">
            <Field label="Note for your client" hint="Shown on the invoice, for example how to reference your payment.">
              {(a) => (
                  <textarea
                      rows={5}
                      value={draft.notes}
                      onChange={(e) => draft.setNotes(e.target.value)}
                      className={cn(inputStyles, 'min-h-32 py-2')}
                      {...a}
                  />
              )}
            </Field>

            <Card zone="calm" className="space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">Subtotal</span>
                <Money amountMinor={draft.subtotalMinor} currency={draft.currency} hideCurrencyCode />
              </div>
              <MoneyInput
                  label="Discount"
                  currency={draft.currency}
                  value={draft.discountText}
                  onChange={(v) => draft.setDiscountText(cleanAmount(v, draft.discountText))}
              />
              <Field label="VAT or tax (%)">
                {(a) => (
                    <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={draft.taxText}
                        onChange={(e) => draft.setTaxText(cleanAmount(e.target.value, draft.taxText))}
                        {...a}
                    />
                )}
              </Field>
              {draft.taxMinor > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body text-text-soft">Tax amount</span>
                    <Money amountMinor={draft.taxMinor} currency={draft.currency} hideCurrencyCode />
                  </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span className="text-body-l font-extrabold">Total due</span>
                <Money amountMinor={draft.totalMinor} currency={draft.currency} className="text-amount-m" hideCurrencyCode />
              </div>
            </Card>
          </section>

          {/* One main action */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" zone="calm" size="lg" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <Button size="lg" loading={draft.saving} onClick={handleSaveDraft}>
              Save draft
            </Button>
          </div>

          <Dialog
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
              title="what your client will see"
              className="max-h-[90dvh] max-w-lg overflow-y-auto"
          >
            <InvoiceDocument variant="issuer" invoice={draft.previewInvoice} />
            <Button variant="outline" zone="calm" fullWidth onClick={() => setPreviewOpen(false)}>
              Close preview
            </Button>
          </Dialog>
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
