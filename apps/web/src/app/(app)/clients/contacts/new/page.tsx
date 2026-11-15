'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CircleNotch } from '@phosphor-icons/react';

import {
  Alert,
  BaggSelect,
  Button,
  Card,
  Checkbox,
  EmailField,
  EmptyState,
  FormActions,
  FormGrid,
  FormSection,
  PageHeader,
  PhoneField,
  TextField,
  buttonStyles,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface Client {
  id: string;
  name: string;
  client_type: 'PERSON' | 'BUSINESS';
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === 'object' &&
    'detail' in data
  ) {
    const detail = (data as { detail?: unknown }).detail;

    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (
            item &&
            typeof item === 'object' &&
            'msg' in item &&
            typeof item.msg === 'string'
          ) {
            return item.msg;
          }

          return null;
        })
        .filter(Boolean);

      if (messages.length > 0) return messages.join(' ');
    }
  }

  return fallback;
}

export default function NewContactPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      setClientsLoading(true);
      setLoadError('');

      try {
        const response = await fetch(`${API_BASE}/clients`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            getErrorMessage(data, 'Unable to load clients. Please try again.'),
          );
        }

        const data: Client[] = await response.json();

        if (!active) return;

        setClients(data);

        if (data.length === 1) {
          setClientId(data[0].id);
        }
      } catch (err) {
        if (!active) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load clients. Please try again.',
        );
      } finally {
        if (active) setClientsLoading(false);
      }
    }

    void loadClients();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!clientId) {
      setError('Select a client for this contact.');
      return;
    }

    if (!name.trim()) {
      setError('Enter the contact’s name.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/clients/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          name: name.trim(),
          job_title: jobTitle.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          is_primary: isPrimary,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          getErrorMessage(data, 'Unable to create contact. Please try again.'),
        );
      }

      router.push('/clients/contacts');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create contact. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/clients/contacts"
        className={cn(buttonStyles({ variant: 'outline', zone: 'calm' }), 'w-fit')}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to contacts
      </Link>

      <PageHeader
        title="Add contact"
        description="Save a person’s details and associate them with a client."
      />

      {loadError && (
        <Alert
          variant="error"
          title="Could not load clients"
          action={
            <Button
              type="button"
              variant="outline"
              zone="calm"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {!clientsLoading && !loadError && clients.length === 0 && (
        <Card zone="calm">
          <EmptyState
            mood="confused"
            title="Create a client first"
            body="A contact must belong to a client. Create the client first, then return here to add the person."
            action={{ label: 'Create client', href: '/clients/new' }}
          />
        </Card>
      )}

      {(clientsLoading || clients.length > 0) && !loadError && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection
            title="Contact details"
            description="Enter the person’s name and contact information."
          >
            <div>
              <BaggSelect
                label="Associated client"
                required
                value={clientId}
                onChange={setClientId}
                disabled={clientsLoading || clients.length === 0 || saving}
                placeholder={clientsLoading ? 'Loading clients…' : 'Choose a client'}
                options={clients.map((client) => ({
                  value: client.id,
                  label: `${client.name} · ${client.client_type === 'BUSINESS' ? 'Business' : 'Individual'}`,
                }))}
              />

              {selectedClient && (
                <p className="mt-2 text-caption text-text-muted">
                  This contact will be linked to {selectedClient.name}.
                </p>
              )}
            </div>

            <TextField
              label="Full name"
              name="name"
              required
              autoComplete="name"
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              placeholder="e.g. Ada Okafor"
            />

            <TextField
              label="Job title"
              name="job_title"
              optional
              maxLength={255}
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              disabled={saving}
              placeholder="e.g. Finance Manager"
            />

            <FormGrid>
              <EmailField
                label="Email address"
                name="email"
                optional
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
                placeholder="ada@company.com"
              />

              <PhoneField
                label="Phone or WhatsApp"
                name="phone"
                optional
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={saving}
                placeholder="+234 803 123 4567"
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Contact preferences"
            description="Set how this person appears on the client record."
          >
            <Checkbox
              label="Primary contact"
              hint="Mark this person as the main contact for the selected client."
              checked={isPrimary}
              onChange={setIsPrimary}
              disabled={saving}
            />
          </FormSection>

          {error && <Alert variant="error">{error}</Alert>}

          <FormActions divider={false}>
            <Link
              href="/clients/contacts"
              className={buttonStyles({ variant: 'outline', zone: 'calm' })}
            >
              Cancel
            </Link>

            <Button
              type="submit"
              disabled={saving || clientsLoading || clients.length === 0}
            >
              {saving ? (
                <>
                  <CircleNotch
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving contact…
                </>
              ) : (
                <>
                  <Check className="mr-2 size-4" aria-hidden="true" />
                  Create contact
                </>
              )}
            </Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}
