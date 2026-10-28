
'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
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

import { Button } from '@/components/ui/button';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass = 'mb-1.5 block text-label font-bold text-ink-soft';

interface Client {
  id: string;
  name: string;
  client_type: 'PERSON' | 'BUSINESS';
}

interface Contact {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default function EditContactPage({ params }: PageProps) {
  const { contactId } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadContact() {
      setLoading(true);
      setLoadError('');

      try {
        const [contactsResponse, clientsResponse] = await Promise.all([
          fetch(`${API_BASE}/clients/contacts`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE}/clients`, {
            credentials: 'include',
          }),
        ]);

        if (!contactsResponse.ok) {
          throw new Error('Unable to load contacts. Please try again.');
        }

        if (!clientsResponse.ok) {
          throw new Error('Unable to load client information. Please try again.');
        }

        const contacts: Contact[] = await contactsResponse.json();
        const clients: Client[] = await clientsResponse.json();

        if (!active) return;

        const found = contacts.find((item) => item.id === contactId);

        if (!found) {
          setLoadError('This contact could not be found.');
          return;
        }

        setContact(found);
        setClientName(
          clients.find((client) => client.id === found.client_id)?.name ??
            'Unknown client',
        );

        setName(found.name ?? '');
        setJobTitle(found.job_title ?? '');
        setEmail(found.email ?? '');
        setPhone(found.phone ?? '');
        setNotes(found.notes ?? '');
        setIsPrimary(Boolean(found.is_primary));
      } catch (err) {
        if (!active) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load this contact. Please try again.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadContact();

    return () => {
      active = false;
    };
  }, [contactId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Enter the contact’s name.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/clients/contacts/${contactId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            job_title: jobTitle.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
            is_primary: isPrimary,
          }),
        },
      );

      if (!response.ok) {
        let message = 'Unable to save changes. Please try again.';

        try {
          const data = await response.json();

          if (typeof data.detail === 'string') {
            message = data.detail;
          } else if (Array.isArray(data.detail)) {
            message = data.detail
              .map((item: { msg?: string }) => item.msg)
              .filter(Boolean)
              .join(' ');
          }
        } catch {
          // Keep the fallback error message.
        }

        throw new Error(message);
      }

      router.push('/clients/contacts');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save changes. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/clients/contacts"
          aria-label="Back to contacts"
          className="flex size-10 shrink-0 items-center justify-center rounded-input border border-line bg-surface text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div>
          <p className="text-sm text-ink-muted">
            <Link href="/clients" className="hover:text-ink">
              Clients
            </Link>
            <span className="mx-2">/</span>
            <Link href="/clients/contacts" className="hover:text-ink">
              Contacts
            </Link>
            <span className="mx-2">/</span>
            Edit
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Edit contact
          </h1>

          <p className="mt-1 text-sm text-ink-muted">
            Update this person’s contact details.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center rounded-card border border-line bg-surface">
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <LoaderCircle className="size-5 animate-spin" />
            Loading contact…
          </div>
        </div>
      ) : loadError ? (
        <section
          role="alert"
          className="rounded-card border border-line bg-surface p-6"
        >
          <h2 className="font-bold text-ink">Unable to open contact</h2>
          <p className="mt-2 text-sm text-ink-muted">{loadError}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/clients/contacts">Back to contacts</Link>
            </Button>

            <Button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        </section>
      ) : contact ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <h2 className="font-bold text-ink">Contact information</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Keep this person’s information accurate and up to date.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label className={labelClass}>Associated client</label>

                <div className="flex min-h-12 items-center gap-3 rounded-input border border-line bg-surface-muted px-3">
                  <Building2 className="size-4 shrink-0 text-ink-muted" />
                  <span className="text-sm font-medium text-ink">
                    {clientName}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-muted">
                  The associated client cannot be changed from this form.
                </p>
              </div>

              <div>
                <label htmlFor="name" className={labelClass}>
                  Full name <span className="text-red-600">*</span>
                </label>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={saving}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="jobTitle" className={labelClass}>
                  Job title{' '}
                  <span className="font-normal text-ink-muted">
                    (optional)
                  </span>
                </label>

                <input
                  id="jobTitle"
                  name="job_title"
                  type="text"
                  maxLength={255}
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  disabled={saving}
                  placeholder="e.g. Finance Director"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={320}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={saving}
                      placeholder="name@company.com"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone number
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={50}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={saving}
                      placeholder="+234 800 000 0000"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className={labelClass}>
                  Notes{' '}
                  <span className="font-normal text-ink-muted">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  maxLength={5000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={saving}
                  placeholder="Add useful context about this contact…"
                  className={`${inputClass} min-h-28 resize-y`}
                />
              </div>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
                disabled={saving}
                className="mt-1 size-4 rounded border-line accent-cocoa"
              />

              <span>
                <span className="block text-sm font-bold text-ink">
                  Primary contact
                </span>
                <span className="mt-1 block text-sm leading-5 text-ink-muted">
                  Mark this person as the main contact for this client.
                </span>
              </span>
            </label>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={saving} asChild>
              <Link href="/clients/contacts">Cancel</Link>
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Saving changes…
                </>
              ) : (
                <>
                  <Check className="mr-2 size-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
