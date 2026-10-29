
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { BaggSelect } from '@/components/ui';
import { useCurrentBreadcrumb } from '@/components/navigation/BreadcrumbContext';
import { cn } from '@/lib/cn';

const API_BASE = (
  '/api'
).replace(/\/$/, '');

type ClientType = 'PERSON' | 'BUSINESS';

interface Client {
  id: string;
  workspace_id: string;
  name: string;
  client_type: ClientType;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  preferred_currency: string;
  default_payment_terms_days: number;
  tax_id?: string | null;
  notes?: string | null;
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

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass = 'mb-1 block text-label font-bold text-ink-soft';

function responseError(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data
  ) {
    const detail = data.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (
            typeof item === 'object' &&
            item !== null &&
            'msg' in item &&
            typeof item.msg === 'string'
          ) {
            return item.msg;
          }

          return '';
        })
        .filter(Boolean)
        .join(' ');
    }
  }

  return fallback;
}

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const { setCurrentLabel } = useCurrentBreadcrumb();

  useEffect(() => {
    if (client?.name) {
      setCurrentLabel(client.name);
    }
    return () => setCurrentLabel(null);
  }, [client?.name, setCurrentLabel]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('NG');
  const [preferredCurrency, setPreferredCurrency] = useState('NGN');
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setLoadError('A client ID is required.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(
        `${API_BASE}/clients/${encodeURIComponent(clientId)}`,
        { credentials: 'include' },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          responseError(
            data,
            'We could not load this client. Return to the directory and try again.',
          ),
        );
      }

      const data: Client = await response.json();

      setClient(data);
      setName(data.name ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setCountry(data.country ?? 'NG');
      setPreferredCurrency(data.preferred_currency || 'NGN');
      setPaymentTerms(data.default_payment_terms_days ?? 14);
      setTaxId(data.tax_id ?? '');
      setNotes(data.notes ?? '');
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'We could not load this client. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!client) {
      setErrorMessage('Load the client before saving changes.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Enter a client or company name.');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      country: country.trim() || 'NG',
      preferred_currency: preferredCurrency,
      default_payment_terms_days: Number(paymentTerms),
      tax_id: taxId.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const response = await fetch(
        `${API_BASE}/clients/${encodeURIComponent(client.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          responseError(
            data,
            'We could not save these changes. Check the details and try again.',
          ),
        );
      }

      router.push('/clients');
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not save this client. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/clients"
          className={buttonStyles({ variant: 'outline' })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to clients
        </Link>

        <div
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-line-subtle bg-surface"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-6 w-6 animate-spin text-ink-muted"
            aria-hidden="true"
          />
          <p className="text-body text-ink-soft">Loading client details…</p>
        </div>
      </main>
    );
  }

  if (loadError || !client) {
    return (
      <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/clients"
          className={buttonStyles({ variant: 'outline' })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to clients
        </Link>

        <section
          className="max-w-2xl rounded-card border border-line-subtle bg-surface p-6"
          aria-labelledby="client-load-error-title"
        >
          <h1
            id="client-load-error-title"
            className="text-title text-ink"
          >
            Client unavailable
          </h1>

          <p className="mt-2 text-body text-ink-soft">
            {loadError || 'We could not find this client.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void fetchClient()}>
              Try again
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/clients')}
            >
              Return to clients
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/clients"
            className={buttonStyles({ variant: 'outline' })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to clients
          </Link>

          <div>
            <h1 className="text-title-l text-ink">Edit client</h1>
            <p className="mt-1 text-body text-ink-soft">
              Update billing information and preferences for {client.name}.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <section className="space-y-5 rounded-card border border-line-subtle bg-surface p-4 sm:p-6">
          <div>
            <h2 className="text-heading text-ink">Client details</h2>
            <p className="mt-1 text-body text-ink-soft">
              Keep the client&apos;s contact and billing information current.
            </p>
          </div>

          <div>
            <label htmlFor="client-type" className={labelClass}>
              Client type
            </label>
            <input
              id="client-type"
              value={
                client.client_type === 'BUSINESS'
                  ? 'Business'
                  : 'Individual'
              }
              readOnly
              aria-describedby="client-type-help"
              className={cn(inputClass, 'cursor-not-allowed bg-tint')}
            />
            <p
              id="client-type-help"
              className="mt-1 text-caption text-ink-muted"
            >
              Client type cannot be changed after creation.
            </p>
          </div>

          <div>
            <label htmlFor="client-name" className={labelClass}>
              {client.client_type === 'BUSINESS'
                ? 'Company name'
                : 'Client name'}
            </label>
            <input
              id="client-name"
              type="text"
              required
              autoComplete="organization"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="client-email" className={labelClass}>
                Billing email{' '}
                <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="client-email"
                type="email"
                autoComplete="email"
                placeholder="billing@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="client-phone" className={labelClass}>
                Phone or WhatsApp
              </label>
              <input
                id="client-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+234 803 123 4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-address" className={labelClass}>
              Billing address{' '}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="client-address"
              type="text"
              autoComplete="street-address"
              placeholder="Street, city, state"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="client-country" className={labelClass}>
              Country
            </label>
            <input
              id="client-country"
              type="text"
              autoComplete="country"
              placeholder="e.g. NG"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={inputClass}
            />
          </div>
        </section>

        <section className="space-y-5 rounded-card border border-line-subtle bg-surface p-4 sm:p-6">
          <div>
            <h2 className="text-heading text-ink">Billing preferences</h2>
            <p className="mt-1 text-body text-ink-soft">
              Set the defaults to use when preparing invoices for this client.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BaggSelect
              label="Invoicing currency"
              className="w-full"
              value={preferredCurrency}
              onChange={setPreferredCurrency}
              options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
            />

            <BaggSelect
              label="Payment terms"
              className="w-full"
              value={String(paymentTerms)}
              onChange={(v) => setPaymentTerms(Number(v))}
              options={[
                { value: '0', label: 'Due on receipt' },
                { value: '7', label: 'Net 7 days' },
                { value: '14', label: 'Net 14 days' },
                { value: '30', label: 'Net 30 days' },
                { value: '60', label: 'Net 60 days' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="client-tax" className={labelClass}>
              Tax ID or TIN{' '}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="client-tax"
              type="text"
              placeholder="e.g. VAT-987654"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="client-notes" className={labelClass}>
              Private notes{' '}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <textarea
              id="client-notes"
              rows={4}
              placeholder="Anything you want to remember about this client"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={cn(inputClass, 'min-h-24 resize-y')}
            />
          </div>
        </section>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-input bg-pill-late/40 px-4 py-3 text-body text-late-text"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-line-subtle pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/clients')}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? 'Saving changes…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </main>
  );
}
