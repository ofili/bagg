'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { LineItemsEditor, lineTotalMinor, newLineItem, type LineItem } from '@/components/invoice';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import { Button, Card, Chip, Field, Input, buttonStyles, inputStyles } from '@/components/ui';
import { cleanAmount, toMinor } from '@/lib/amount';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ClientItem {
  id: string;
  name: string;
  preferred_currency: string;
}

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
const VALIDITY_OPTIONS = [7, 14, 30];

export default function NewQuotePage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [validityDays, setValidityDays] = useState(14);

  const [items, setItems] = useState<LineItem[]>(() => [newLineItem()]);
  const [discountText, setDiscountText] = useState('');
  const [taxText, setTaxText] = useState('');
  const [whtText, setWhtText] = useState('');
  const [depositText, setDepositText] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/clients`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ClientItem[]) => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
          setCurrency(data[0].preferred_currency || 'NGN');
        }
      })
      .catch(() => {});
  }, []);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.preferred_currency) setCurrency(client.preferred_currency);
  };

  // Everything is calculated in minor units
  const subtotalMinor = items.reduce((acc, it) => acc + lineTotalMinor(it), 0);
  const discountMinor = toMinor(discountText);
  const discountedMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxPercent = parseFloat(taxText) || 0;
  const whtPercent = parseFloat(whtText) || 0;
  const taxMinor = Math.round(discountedMinor * (taxPercent / 100));
  const totalMinor = discountedMinor + taxMinor;
  const whtMinor = Math.round(discountedMinor * (whtPercent / 100));
  const netMinor = Math.max(0, totalMinor - whtMinor);
  const depositPercent = depositText === '' ? null : parseFloat(depositText) || 0;
  const depositMinor = depositPercent ? Math.round(netMinor * (depositPercent / 100)) : 0;

  const handleCreate = async () => {
    if (!selectedClientId) {
      setErrorMsg('Pick a client first, or add one under Clients.');
      return;
    }
    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setErrorMsg('Add at least one line item with a description.');
      return;
    }
    if (validItems.length !== items.length) {
      setErrorMsg('Give every line item a description, or remove the empty ones.');
      return;
    }
    if (totalMinor <= 0) {
      setErrorMsg('The total is zero. Add a price to at least one line item.');
      return;
    }
    if (depositPercent !== null && (depositPercent < 0 || depositPercent > 100)) {
      setErrorMsg('The deposit must be between 0 and 100 percent.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          client_id: selectedClientId,
          currency,
          validity_days: validityDays,
          items: validItems.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity) || 1,
            unit_price_minor: toMinor(it.unit_price),
          })),
          discount_minor: discountMinor,
          tax_rate_percent: taxPercent,
          wht_rate_percent: whtPercent,
          deposit_percentage: depositPercent,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'Failed to create the quote.');
        return;
      }
      router.push('/quotes');
    } catch {
      setErrorMsg('Network error while creating the quote.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-16 lg:p-8">
      <div className="space-y-2">
        <Link href="/quotes" className={buttonStyles({ variant: 'link' })}>
          <ArrowLeft aria-hidden className="h-4 w-4" /> Back to quotes
        </Link>
        <h1 className="text-title-l sm:text-display">new quote</h1>
        <p className="text-body text-text-soft">An estimate with an expiry date. Convert it to an invoice once it is accepted.</p>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
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

      <Card zone="calm" className="grid gap-4 p-5 sm:grid-cols-2">
        {clients.length > 0 ? (
          <Field label="Client">
            {(a) => (
              <select className={inputStyles} value={selectedClientId} onChange={(e) => handleClientChange(e.target.value)} {...a}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.preferred_currency})
                  </option>
                ))}
              </select>
            )}
          </Field>
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

        <Field label="Currency">
          {(a) => (
            <select className={inputStyles} value={currency} onChange={(e) => setCurrency(e.target.value)} {...a}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="space-y-1.5 sm:col-span-2">
          <p id="validity-label" className="text-body font-medium">
            Offer is valid for
          </p>
          <div role="group" aria-labelledby="validity-label" className="flex flex-wrap gap-3">
            {VALIDITY_OPTIONS.map((days) => (
              <Chip key={days} selected={validityDays === days} onClick={() => setValidityDays(days)}>
                {days} days
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <LineItemsEditor items={items} onChange={setItems} currency={currency} />

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <Field label="Deposit (%)" hint="Optional. The client sees the amount due upfront when they accept.">
            {(a) => (
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={depositText}
                onChange={(e) => setDepositText(cleanAmount(e.target.value, depositText))}
                {...a}
              />
            )}
          </Field>
          <Field label="Note for your client" hint="Scope, timelines or terms.">
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
        </div>

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
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Withholding (%)">
              {(a) => (
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={whtText}
                  onChange={(e) => setWhtText(cleanAmount(e.target.value, whtText))}
                  {...a}
                />
              )}
            </Field>
          </div>
          {taxMinor > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text-soft">Tax</span>
              <Money amountMinor={taxMinor} currency={currency} hideCurrencyCode />
            </div>
          )}
          {whtMinor > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text-soft">Less withholding tax</span>
              <span>
                −<Money amountMinor={whtMinor} currency={currency} hideCurrencyCode />
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-body-l font-extrabold">Net payable</span>
            <Money amountMinor={netMinor} currency={currency} className="text-amount-m" hideCurrencyCode />
          </div>
          {depositMinor > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text-soft">Deposit on acceptance</span>
              <Money amountMinor={depositMinor} currency={currency} hideCurrencyCode />
            </div>
          )}
        </Card>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/quotes" className={buttonStyles({ variant: 'outline', zone: 'calm', size: 'lg' })}>
          Cancel
        </Link>
        <Button size="lg" loading={saving} onClick={handleCreate}>
          Create quote
        </Button>
      </div>
    </div>
  );
}
