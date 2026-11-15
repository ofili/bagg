'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Buildings,
  CircleNotch,
  FloppyDisk,
  User,
} from '@phosphor-icons/react';
import {
  Alert,
  Button,
  BaggSelect,
  EmailField,
  FormActions,
  FormGrid,
  FormSection,
  PageHeader,
  PhoneField,
  TextArea,
  TextField,
  buttonStyles,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = (
  '/api'
).replace(/\/$/, '');

type ClientType = 'PERSON' | 'BUSINESS';

const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: 'NGN · Nigerian naira' },
  { code: 'USD', label: 'USD · US dollar' },
  { code: 'GBP', label: 'GBP · British pound' },
  { code: 'EUR', label: 'EUR · Euro' },
  { code: 'GHS', label: 'GHS · Ghanaian cedi' },
  { code: 'KES', label: 'KES · Kenyan shilling' },
  { code: 'ZAR', label: 'ZAR · South African rand' },
];

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
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Add client"
        description="Save client details once to reuse them on future invoices."
        actions={
          <Link
            href="/clients"
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back to clients
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Client details"
          description="Choose the client type and enter their billing information."
        >
          <div>
            <span className="mb-1.5 block text-label font-medium text-text">
              Client type
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setClientType('PERSON')}
                aria-pressed={clientType === 'PERSON'}
                className={cn(
                  'flex min-h-20 items-center gap-3 border-brut-thin p-4 text-left transition-colors',
                  clientType === 'PERSON'
                    ? 'border-ink bg-peach-chip'
                    : 'border-ink bg-surface hover:bg-surface-tint',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <User className="h-5 w-5 text-text" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-body font-extrabold text-text">
                    Individual
                  </span>
                  <span className="mt-0.5 block text-caption text-text-soft">
                    A person you invoice
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setClientType('BUSINESS')}
                aria-pressed={clientType === 'BUSINESS'}
                className={cn(
                  'flex min-h-20 items-center gap-3 border-brut-thin p-4 text-left transition-colors',
                  clientType === 'BUSINESS'
                    ? 'border-ink bg-peach-chip'
                    : 'border-ink bg-surface hover:bg-surface-tint',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <Buildings className="h-5 w-5 text-text" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-body font-extrabold text-text">
                    Business
                  </span>
                  <span className="mt-0.5 block text-caption text-text-soft">
                    A company or organisation
                  </span>
                </span>
              </button>
            </div>
          </div>

          <TextField
            label={clientType === 'BUSINESS' ? 'Company name' : 'Client name'}
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
          />

          <FormGrid>
            <EmailField
              label="Billing email"
              optional
              placeholder="billing@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <PhoneField
              label="Phone or WhatsApp"
              optional
              placeholder="+234 803 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </FormGrid>

          <p className="text-caption text-text-muted">
            Leave the billing email blank if the client does not use email.
          </p>

          {clientType === 'BUSINESS' && (
            <section className="space-y-4 border-brut-thin border-ink bg-surface-sunken p-4 sm:p-5">
              <div>
                <h3 className="text-heading font-extrabold text-text">
                  Primary contact
                </h3>
                <p className="mt-1 text-body text-text-soft">
                  Every new business client must have at least one named contact.
                </p>
              </div>

              <TextField
                label="Contact name"
                required
                autoComplete="name"
                placeholder="e.g. Ada Okafor"
                value={primaryContactName}
                onChange={(event) =>
                  setPrimaryContactName(event.target.value)
                }
              />

              <TextField
                label="Role or job title"
                optional
                placeholder="e.g. Finance Manager"
                value={primaryContactTitle}
                onChange={(event) =>
                  setPrimaryContactTitle(event.target.value)
                }
              />

              <FormGrid>
                <EmailField
                  label="Contact email"
                  optional
                  placeholder="ada@company.com"
                  value={primaryContactEmail}
                  onChange={(event) =>
                    setPrimaryContactEmail(event.target.value)
                  }
                />

                <PhoneField
                  label="Contact phone"
                  optional
                  placeholder="+234 803 123 4567"
                  value={primaryContactPhone}
                  onChange={(event) =>
                    setPrimaryContactPhone(event.target.value)
                  }
                />
              </FormGrid>
            </section>
          )}
        </FormSection>

        <FormSection
          title="Billing preferences"
          description="These defaults will be used when preparing invoices for this client."
        >
          <FormGrid>
            <BaggSelect
              label="Invoicing currency"
              value={preferredCurrency}
              onChange={setPreferredCurrency}
              options={SUPPORTED_CURRENCIES.map((c) => ({
                value: c.code,
                label: c.label,
              }))}
            />

            <BaggSelect
              label="Payment terms"
              value={String(paymentTerms)}
              onChange={(value) => setPaymentTerms(Number(value))}
              options={[
                { value: '0', label: 'Due on receipt' },
                { value: '7', label: 'Net 7 days' },
                { value: '14', label: 'Net 14 days' },
                { value: '30', label: 'Net 30 days' },
                { value: '60', label: 'Net 60 days' },
              ]}
            />
          </FormGrid>

          <FormGrid>
            <TextField
              label="Tax ID or TIN"
              optional
              placeholder="e.g. VAT-987654"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
            />

            <TextField
              label="Country"
              autoComplete="country"
              placeholder="e.g. NG"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />
          </FormGrid>

          <TextField
            label="Billing address"
            optional
            autoComplete="street-address"
            placeholder="Street, city, state"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />

          <TextArea
            label="Private notes"
            optional
            rows={4}
            placeholder="Anything you want to remember about this client"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormSection>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <FormActions>
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
              <CircleNotch className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FloppyDisk className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? 'Creating client…' : 'Create client'}
          </Button>
        </FormActions>
      </form>
    </main>
  );
}
