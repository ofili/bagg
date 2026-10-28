
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

type ClientType = 'PERSON' | 'BUSINESS';

const SUPPORTED_CURRENCIES = [
  'NGN',
  'USD',
  'GBP',
  'EUR',
  'GHS',
  'KES',
  'ZAR',
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

export default function NewClientPage() {
  const router = useRouter();

  const [clientType, setClientType] = useState<ClientType>('PERSON');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('NG');
  const [preferredCurrency, setPreferredCurrency] = useState('NGN');
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactTitle, setPrimaryContactTitle] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Enter a client or company name.');
      return;
    }

    if (clientType === 'BUSINESS' && !primaryContactName.trim()) {
      setErrorMessage('Add a primary contact for this business.');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      client_type: clientType,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      country: country.trim() || 'NG',
      preferred_currency: preferredCurrency,
      default_payment_terms_days: Number(paymentTerms),
      tax_id: taxId.trim() || null,
      notes: notes.trim() || null,
      ...(clientType === 'BUSINESS'
        ? {
            contacts: [
              {
                name: primaryContactName.trim(),
                job_title: primaryContactTitle.trim() || null,
                email: primaryContactEmail.trim() || null,
                phone: primaryContactPhone.trim() || null,
                is_primary: true,
              },
            ],
          }
        : {}),
    };

    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          responseError(
            data,
            'We could not create this client. Check the details and try again.',
          ),
        );
      }

      router.push('/clients');
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not create this client. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 text-body font-bold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to clients
          </Link>

          <div>
            <h1 className="text-title-l text-ink">Add client</h1>
            <p className="mt-1 text-body text-ink-soft">
              Save client details once to reuse them on future invoices.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <section className="space-y-5 rounded-card border border-line-subtle bg-surface p-4 sm:p-6">
          <div>
            <h2 className="text-heading text-ink">Client details</h2>
            <p className="mt-1 text-body text-ink-soft">
              Choose the client type and enter their billing information.
            </p>
          </div>

          <div>
            <label htmlFor="client-type" className={labelClass}>
              Client type
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setClientType('PERSON')}
                aria-pressed={clientType === 'PERSON'}
                className={cn(
                  'flex min-h-20 items-center gap-3 rounded-card border p-4 text-left transition-colors',
                  clientType === 'PERSON'
                    ? 'border-cocoa bg-peach-chip'
                    : 'border-line bg-surface hover:bg-tint',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <UserRound className="h-5 w-5 text-ink" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-body font-extrabold text-ink">
                    Individual
                  </span>
                  <span className="mt-0.5 block text-caption text-ink-soft">
                    A person you invoice
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setClientType('BUSINESS')}
                aria-pressed={clientType === 'BUSINESS'}
                className={cn(
                  'flex min-h-20 items-center gap-3 rounded-card border p-4 text-left transition-colors',
                  clientType === 'BUSINESS'
                    ? 'border-cocoa bg-peach-chip'
                    : 'border-line bg-surface hover:bg-tint',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <Building2 className="h-5 w-5 text-ink" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-body font-extrabold text-ink">
                    Business
                  </span>
                  <span className="mt-0.5 block text-caption text-ink-soft">
                    A company or organisation
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="client-name" className={labelClass}>
              {clientType === 'BUSINESS' ? 'Company name' : 'Client name'}
            </label>
            <input
              id="client-name"
              type="text"
              required
              autoFocus
              autoComplete="organization"
              placeholder={
                clientType === 'BUSINESS'
                  ? 'e.g. Acme Limited'
                  : 'e.g. Kofi Mensah'
              }
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

          <p className="text-caption text-ink-muted">
            Leave the billing email blank if the client does not use email.
          </p>

          {clientType === 'BUSINESS' && (
            <section className="space-y-4 rounded-card border border-line-subtle bg-tint p-4 sm:p-5">
              <div>
                <h3 className="text-heading text-ink">Primary contact</h3>
                <p className="mt-1 text-body text-ink-soft">
                  Every new business client must have at least one named contact.
                </p>
              </div>

              <div>
                <label htmlFor="primary-contact-name" className={labelClass}>
                  Contact name
                </label>
                <input
                  id="primary-contact-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Ada Okafor"
                  value={primaryContactName}
                  onChange={(event) => setPrimaryContactName(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="primary-contact-title" className={labelClass}>
                  Role or job title
                </label>
                <input
                  id="primary-contact-title"
                  type="text"
                  placeholder="e.g. Finance Manager"
                  value={primaryContactTitle}
                  onChange={(event) => setPrimaryContactTitle(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="primary-contact-email" className={labelClass}>
                    Contact email
                  </label>
                  <input
                    id="primary-contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="ada@company.com"
                    value={primaryContactEmail}
                    onChange={(event) => setPrimaryContactEmail(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="primary-contact-phone" className={labelClass}>
                    Contact phone
                  </label>
                  <input
                    id="primary-contact-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+234 803 123 4567"
                    value={primaryContactPhone}
                    onChange={(event) => setPrimaryContactPhone(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>
          )}
        </section>

        <section className="space-y-5 rounded-card border border-line-subtle bg-surface p-4 sm:p-6">
          <div>
            <h2 className="text-heading text-ink">Billing preferences</h2>
            <p className="mt-1 text-body text-ink-soft">
              These defaults will be used when preparing invoices for this client.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="client-currency" className={labelClass}>
                Invoicing currency
              </label>
              <select
                id="client-currency"
                value={preferredCurrency}
                onChange={(event) => setPreferredCurrency(event.target.value)}
                className={inputClass}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="client-terms" className={labelClass}>
                Payment terms
              </label>
              <select
                id="client-terms"
                value={paymentTerms}
                onChange={(event) => setPaymentTerms(Number(event.target.value))}
                className={inputClass}
              >
                <option value={0}>Due on receipt</option>
                <option value={7}>Net 7 days</option>
                <option value={14}>Net 14 days</option>
                <option value={30}>Net 30 days</option>
                <option value={60}>Net 60 days</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? 'Creating client…' : 'Create client'}
          </Button>
        </div>
      </form>
    </main>
  );
}
