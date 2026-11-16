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
  FormSubsection,
  PageContainer,
  PageHeader,
  PhoneField,
  RadioGroup,
  StickyFormActions,
  TextArea,
  TextField,
  buttonStyles,
} from '@/components/ui';

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
    <PageContainer width="form">
      <PageHeader
        title="Add client"
        description="Save client details once to reuse them on future invoices."
        actions={
          <Link
            href="/clients"
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to clients
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection
          title="Client type"
          description="Choose how you invoice this client. This changes the fields below."
        >
          <RadioGroup
            label="Type"
            value={clientType}
            onChange={(value) => setClientType(value as ClientType)}
            variant="cards"
            columns={2}
            options={[
              {
                value: 'PERSON',
                label: 'Individual',
                description: 'A person you invoice.',
                icon: <User className="h-5 w-5" aria-hidden="true" />,
              },
              {
                value: 'BUSINESS',
                label: 'Business',
                description: 'A company or organisation.',
                icon: <Buildings className="h-5 w-5" aria-hidden="true" />,
              },
            ]}
          />
        </FormSection>

        <FormSection
          title="Client details"
          description="The name and contact details used on invoices."
        >
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
            <FormSubsection
              divided
              title="Primary contact"
              description="Every new business client must have at least one named contact."
            >
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
            </FormSubsection>
          )}
        </FormSection>

        <FormSection
          title="Billing defaults"
          description="These defaults are used when preparing invoices for this client."
        >
          <FormSubsection title="Commercial terms">
            <FormGrid>
              <BaggSelect
                label="Invoicing currency"
                value={preferredCurrency}
                onChange={setPreferredCurrency}
                options={SUPPORTED_CURRENCIES.map((currency) => ({
                  value: currency.code,
                  label: currency.label,
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
          </FormSubsection>

          <FormSubsection divided title="Tax and location">
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
          </FormSubsection>
        </FormSection>

        <FormSection
          title="Private notes"
          description="Only you can see this. It is never shown to the client."
        >
          <TextArea
            label="Notes"
            optional
            rows={4}
            placeholder="Anything you want to remember about this client"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormSection>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <StickyFormActions>
          <FormActions divider={false}>
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
        </StickyFormActions>
      </form>
    </PageContainer>
  );
}
