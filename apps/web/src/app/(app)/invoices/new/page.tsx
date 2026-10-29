'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, X } from 'lucide-react';
import { InvoiceDocument, LineItemsEditor, lineTotalMinor, newLineItem, type LineItem } from '@/components/invoice';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import { BaggSelect, Button, Card, Dialog, Field, Input, buttonStyles, inputStyles } from '@/components/ui';
import { cleanAmount, toMinor } from '@/lib/amount';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  preferred_currency: string;
  default_payment_terms_days: number;
}

interface ValidationState {
  has_profile: boolean;
  message: string;
}

const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: 'NGN · Nigerian naira' },
  { code: 'USD', label: 'USD · US dollar' },
  { code: 'GBP', label: 'GBP · British pound' },
  { code: 'EUR', label: 'EUR · Euro' },
  { code: 'GHS', label: 'GHS · Ghanaian cedi' },
  { code: 'KES', label: 'KES · Kenyan shilling' },
  { code: 'ZAR', label: 'ZAR · South African rand' },
];

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Adds days in local time, so the date never shifts by a day across time zones. */
function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}

export default function NewInvoicePage() {
  const router = useRouter();
  const today = toIsoDate(new Date());

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [profileValidation, setProfileValidation] = useState<ValidationState | null>(null);

  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(() => addDays(today, 14));

  const [items, setItems] = useState<LineItem[]>(() => [newLineItem()]);

  const [discountText, setDiscountText] = useState('');
  const [taxText, setTaxText] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/clients`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: Client[]) => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
          setCurrency(data[0].preferred_currency || 'NGN');
          setDueDate(addDays(today, data[0].default_payment_terms_days || 14));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A payment profile for the chosen currency must exist before the invoice can be sent
  useEffect(() => {
    if (!currency) return;
    fetch(`${API_BASE}/payments/profiles/validate/${currency}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setProfileValidation({ has_profile: data.has_profile, message: data.message }))
      .catch(() => setProfileValidation({ has_profile: true, message: 'Validated' }));
  }, [currency]);

  const termsFor = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.default_payment_terms_days || 14;

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      if (client.preferred_currency) setCurrency(client.preferred_currency);
      setDueDate(addDays(issueDate, termsFor(clientId)));
    }
  };

  // Everything is calculated in minor units
  const subtotalMinor = items.reduce((acc, it) => acc + lineTotalMinor(it), 0);
  const discountMinor = toMinor(discountText);
  const discountedSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxPercent = parseFloat(taxText) || 0;
  const taxMinor = Math.round(discountedSubtotalMinor * (taxPercent / 100));
  const totalMinor = discountedSubtotalMinor + taxMinor;

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      setErrorMsg('Pick a client first, or add one under Clients.');
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      setErrorMsg('Give every line item a description.');
      return;
    }
    if (totalMinor <= 0) {
      setErrorMsg('The total is zero. Add a price to at least one line item.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      client_id: selectedClientId,
      currency,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unit_price_minor: toMinor(it.unit_price),
      })),
      discount_minor: discountMinor,
      tax_rate_percent: taxPercent,
      notes,
    };

    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save draft invoice');
      }
      router.push('/invoices');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = {
    id: 'preview',
    invoice_number: 'to be assigned',
    client_name: clients.find((c) => c.id === selectedClientId)?.name ?? null,
    currency,
    status: 'draft',
    issue_date: issueDate,
    due_date: dueDate || null,
    items: items.map((it) => ({
      id: it.id,
      description: it.description || 'Line item',
      quantity: it.quantity || 1,
      unit_price_minor: toMinor(it.unit_price),
      total_minor: lineTotalMinor(it),
    })),
    subtotal_minor: subtotalMinor,
    discount_minor: discountMinor,
    tax_rate_percent: taxPercent,
    tax_minor: taxMinor,
    total_minor: totalMinor,
    notes: notes || null,
  };

  return (
    <div className="w-full max-w-3xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-16 lg:p-8">
      <div className="space-y-2">
        <Link href="/invoices" className={buttonStyles({ variant: 'outline' })}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to invoices
        </Link>
        <h1 className="text-title-l sm:text-display">new invoice</h1>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
        >
          <span className="pt-2">{errorMsg}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setErrorMsg(null)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
      )}

      {profileValidation && !profileValidation.has_profile && (
        <Card zone="calm" tone="sun" className="space-y-2">
          <h2 className="text-heading">no {currency} payment details yet</h2>
          <p className="text-body">
            Add your bank or payment details for {currency} before you send this invoice, so your client knows where to
            pay.
          </p>
          <Link href="/settings" className={buttonStyles({ variant: 'link' })}>
            <CreditCard aria-hidden className="h-4 w-4" /> Add {currency} details in settings
          </Link>
        </Card>
      )}

      {/* Client, currency, dates */}
      <Card zone="calm" className="grid gap-4 p-5 sm:grid-cols-2">
        {clients.length > 0 ? (
          <BaggSelect
            label="Client"
            className="w-full"
            value={selectedClientId}
            onChange={handleClientChange}
            options={clients.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.preferred_currency})`,
            }))}
          />
        ) : (
          <div className="space-y-1.5">
            <p className="text-body font-medium">Client</p>
            <p className="text-body text-text-soft">
              No clients yet.{' '}
              <Link href="/clients" className="font-extrabold text-link underline underline-offset-4">
                Add a client
              </Link>
            </p>
          </div>
        )}

        <BaggSelect
          label="Currency"
          className="w-full"
          value={currency}
          onChange={setCurrency}
          options={SUPPORTED_CURRENCIES.map((c) => ({
            value: c.code,
            label: c.label,
          }))}
        />

        <Field label="Issue date">
          {(a) => (
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => {
                setIssueDate(e.target.value);
                if (e.target.value) setDueDate(addDays(e.target.value, termsFor(selectedClientId)));
              }}
              {...a}
            />
          )}
        </Field>

        <Field label="Due date">
          {(a) => <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} {...a} />}
        </Field>
      </Card>

      <LineItemsEditor items={items} onChange={setItems} currency={currency} />

      {/* Notes and totals */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Field label="Note for your client" hint="Shown on the invoice, for example how to reference your payment.">
          {(a) => (
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(inputStyles, 'min-h-32 py-2')}
              {...a}
            />
          )}
        </Field>

        <Card zone="calm" className="space-y-3 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body text-text-soft">Subtotal</span>
            <Money amountMinor={subtotalMinor} currency={currency} hideCurrencyCode />
          </div>
          <MoneyInput
            label="Discount"
            currency={currency}
            value={discountText}
            onChange={(v) => setDiscountText(cleanAmount(v, discountText))}
          />
          <Field label="VAT or tax (%)">
            {(a) => (
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={taxText}
                onChange={(e) => setTaxText(cleanAmount(e.target.value, taxText))}
                {...a}
              />
            )}
          </Field>
          {taxMinor > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text-soft">Tax amount</span>
              <Money amountMinor={taxMinor} currency={currency} hideCurrencyCode />
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-body-l font-extrabold">Total due</span>
            <Money amountMinor={totalMinor} currency={currency} className="text-amount-m" hideCurrencyCode />
          </div>
        </Card>
      </section>

      {/* One main action */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" zone="calm" size="lg" onClick={() => setPreviewOpen(true)}>
          Preview
        </Button>
        <Button size="lg" loading={saving} onClick={handleSaveDraft}>
          Save draft
        </Button>
      </div>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="what your client will see"
        className="max-h-[90dvh] max-w-lg overflow-y-auto"
      >
        <InvoiceDocument variant="issuer" invoice={previewInvoice} />
        <Button variant="outline" zone="calm" fullWidth onClick={() => setPreviewOpen(false)}>
          Close preview
        </Button>
      </Dialog>
    </div>
  );
}
