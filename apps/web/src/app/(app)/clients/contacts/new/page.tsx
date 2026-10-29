
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Check,
  LoaderCircle,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';

import { Button, buttonStyles } from '@/components/ui/button';
import { BaggSelect } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = (
  '/api'
).replace(/\/$/, '');

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass = 'mb-1.5 block text-label font-bold text-ink-soft';

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
    <div className="w-full max-w-3xl space-y-6 px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <Link
        href="/clients/contacts"
        className={buttonStyles({ variant: 'outline' })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to contacts
      </Link>

      <header>
        <h1 className="text-title-l text-ink">Add contact</h1>
        <p className="mt-1 text-body text-ink-soft">
          Save a person’s details and associate them with a client.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-card border border-line-subtle bg-surface p-5"
        >
          <p className="text-body text-late-text">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      )}

      {!clientsLoading && !loadError && clients.length === 0 && (
        <section className="rounded-card border border-line-subtle bg-surface p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-tint text-ink-soft">
            <Building2 className="size-5" aria-hidden="true" />
          </span>

          <h2 className="mt-4 text-heading text-ink">
            Create a client first
          </h2>
          <p className="mt-1 max-w-lg text-body text-ink-soft">
            A contact must belong to a client. Create the client first, then
            return here to add the person.
          </p>

          <Link href="/clients/new" className={cn(buttonStyles(), "mt-5")}>Create client</Link>
        </section>
      )}

      {(clientsLoading || clients.length > 0) && !loadError && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="overflow-hidden rounded-card border border-line-subtle bg-surface">
            <div className="border-b border-line-subtle px-5 py-4 sm:px-6">
              <h2 className="text-heading text-ink">Contact details</h2>
              <p className="mt-1 text-body text-ink-soft">
                Enter the person’s name and contact information.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <BaggSelect
                  label="Associated client *"
                  className="w-full"
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
                  <p className="mt-2 text-caption text-ink-muted">
                    This contact will be linked to {selectedClient.name}.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="contact-name" className={labelClass}>
                  Full name <span className="text-late-text">*</span>
                </label>

                <div className="relative">
                  <UserRound
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={saving}
                    placeholder="e.g. Ada Okafor"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-title" className={labelClass}>
                  Job title <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="contact-title"
                  name="job_title"
                  type="text"
                  maxLength={255}
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  disabled={saving}
                  placeholder="e.g. Finance Manager"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-email" className={labelClass}>
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={320}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={saving}
                      placeholder="ada@company.com"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-phone" className={labelClass}>
                    Phone or WhatsApp
                  </label>

                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={50}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={saving}
                      placeholder="+234 803 123 4567"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
                disabled={saving}
                className="mt-1 size-4 rounded border-line accent-cocoa"
              />
              <span>
                <span className="block text-body font-bold text-ink">
                  Primary contact
                </span>
                <span className="mt-1 block text-caption text-ink-soft">
                  Mark this person as the main contact for the selected client.
                </span>
              </span>
            </label>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/clients/contacts"
              className={buttonStyles({ variant: "outline", zone: "calm" })}
            >
              Cancel
            </Link>

            <Button
              type="submit"
              disabled={saving || clientsLoading || clients.length === 0}
            >
              {saving ? (
                <>
                  <LoaderCircle
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
          </div>
        </form>
      )}
    </div>
  );
}
