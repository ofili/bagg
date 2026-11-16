'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import {
  LineItemsEditor,
  lineTotalMinor,
  newLineItem,
  type LineItem,
} from '@/components/invoice';
import { MoneyField } from '@/components/ui/MoneyField';
import { Money } from '@/components/money/Money';
import {
  Alert,
  BaggSelect,
  Button,
  FormPageLayout,
  FormSection,
  NumberField,
  PageContainer,
  PageHeader,
  RadioGroup,
  SummaryRail,
  TextArea,
  buttonStyles,
} from '@/components/ui';
import { InlineClientModal, type InlineCreatedClient } from '@/components/clients/InlineClientModal';
import { cleanAmount, toMinor } from '@/lib/amount';

const API_BASE = '/api';

interface ClientItem {
  id: string;
  name: string;
  preferred_currency: string;
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
const VALIDITY_OPTIONS = [7, 14, 30];

export function NewQuoteDesktop() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [showClientModal, setShowClientModal] = useState(false);
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

  const handleClientCreated = (newClient: InlineCreatedClient) => {
    setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
    setSelectedClientId(newClient.id);
    if (newClient.preferred_currency) setCurrency(newClient.preferred_currency);
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
        setErrorMsg(err.detail || 'Failed to create the quotes.');
        return;
      }
      const newQuote = await res.json();
      router.push(`/quotes/${newQuote.id}`);
    } catch {
      setErrorMsg('Network error while creating the quotes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer width="form" className="pb-24 sm:pb-16">
      <div className="space-y-4">
        <Link href="/quotes" className={buttonStyles({ variant: 'outline' })}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to quotes
        </Link>
        <PageHeader
          title="New quote"
          description="An estimate with an expiry date. Convert it to an invoice once it is accepted."
        />
      </div>

      {errorMsg && (
        <Alert variant="error" dismissible onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <FormPageLayout
        aside={
          <SummaryRail
            title="Summary"
            description="Totals update as you edit."
            actions={
              <>
                <Link
                  href="/quotes"
                  className={buttonStyles({
                    variant: 'outline',
                    zone: 'calm',
                    size: 'lg',
                    fullWidth: true,
                  })}
                >
                  Cancel
                </Link>
                <Button
                  size="lg"
                  fullWidth
                  loading={saving}
                  onClick={handleCreate}
                >
                  Create quote
                </Button>
              </>
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text-soft">Subtotal</span>
              <Money
                amountMinor={subtotalMinor}
                currency={currency}
                hideCurrencyCode
              />
            </div>

            <MoneyField
              label="Discount"
              currency={currency}
              value={discountText}
              onChange={(v) => setDiscountText(cleanAmount(v, discountText))}
            />

            <NumberField
              label="VAT or tax"
              suffix="%"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={taxText}
              onChange={(e) => setTaxText(cleanAmount(e.target.value, taxText))}
            />

            <NumberField
              label="Withholding"
              suffix="%"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={whtText}
              onChange={(e) => setWhtText(cleanAmount(e.target.value, whtText))}
            />

            {taxMinor > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">Tax</span>
                <Money
                  amountMinor={taxMinor}
                  currency={currency}
                  hideCurrencyCode
                />
              </div>
            )}

            {whtMinor > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">
                  Less withholding tax
                </span>
                <span>
                  −
                  <Money
                    amountMinor={whtMinor}
                    currency={currency}
                    hideCurrencyCode
                  />
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-3">
              <span className="text-body-l font-extrabold text-text">
                Net payable
              </span>
              <Money
                amountMinor={netMinor}
                currency={currency}
                className="text-amount-m"
                hideCurrencyCode
              />
            </div>

            {depositMinor > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body text-text-soft">
                  Deposit on acceptance
                </span>
                <Money
                  amountMinor={depositMinor}
                  currency={currency}
                  hideCurrencyCode
                />
              </div>
            )}
          </SummaryRail>
        }
      >
        <FormSection
          title="Client and offer"
          description="Who this quote is for and how long the offer stands."
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
          {clients.length > 0 ? (
            <BaggSelect
              label="Client"
              required
              searchable={clients.length > 8}
              value={selectedClientId}
              onChange={handleClientChange}
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.preferred_currency})`,
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
            value={currency}
            onChange={setCurrency}
            options={SUPPORTED_CURRENCIES.map((c) => ({
              value: c.code,
              label: c.label,
            }))}
          />

          <RadioGroup
            label="Offer is valid for"
            value={String(validityDays)}
            onChange={(value) => setValidityDays(Number(value))}
            direction="horizontal"
            options={VALIDITY_OPTIONS.map((days) => ({
              value: String(days),
              label: `${days} days`,
            }))}
          />
        </FormSection>

        <FormSection
          title="Items"
          description="What you're quoting for. Add one row per service or product."
        >
          <LineItemsEditor
            bare
            items={items}
            onChange={setItems}
            currency={currency}
          />
        </FormSection>

        <FormSection
          title="Terms"
          description="Optional payment terms and context shown to your client."
        >
          <NumberField
            label="Deposit"
            suffix="%"
            optional
            min={0}
            max={100}
            step="0.01"
            placeholder="0"
            hint="The client sees the amount due upfront when they accept."
            value={depositText}
            onChange={(e) =>
              setDepositText(cleanAmount(e.target.value, depositText))
            }
          />

          <TextArea
            label="Note for your client"
            optional
            rows={5}
            hint="Scope, timelines or terms."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormSection>
      </FormPageLayout>

      <InlineClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onClientCreated={handleClientCreated}
        defaultCurrency={currency}
      />
    </PageContainer>
  );
}
