
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ContactRound,
  Edit2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

type ClientType = 'PERSON' | 'BUSINESS';

interface Client {
  id: string;
  name: string;
  client_type: ClientType;
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
  client_name?: string | null;
}

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

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

function normalisePhone(phone?: string | null) {
  return phone ? phone.replace(/[^0-9+]/g, '') : '';
}

export default function ContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  );

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

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
        const data = await contactsResponse.json().catch(() => ({}));

        throw new Error(
          responseError(data, 'We could not load your contacts. Try again.'),
        );
      }

      if (!clientsResponse.ok) {
        const data = await clientsResponse.json().catch(() => ({}));

        throw new Error(
          responseError(data, 'We could not load your clients. Try again.'),
        );
      }

      const [contactsData, clientsData] = await Promise.all([
        contactsResponse.json() as Promise<Contact[]>,
        clientsResponse.json() as Promise<Client[]>,
      ]);

      setContacts(contactsData);
      setClients(clientsData);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'We could not load your contacts. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return contacts;

    return contacts.filter((contact) => {
      const clientName =
        contact.client_name ??
        clientById.get(contact.client_id)?.name ??
        '';

      return (
        contact.name.toLowerCase().includes(query) ||
        (contact.email ?? '').toLowerCase().includes(query) ||
        (contact.phone ?? '').toLowerCase().includes(query) ||
        (contact.job_title ?? '').toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query)
      );
    });
  }, [contacts, searchQuery, clientById]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDeleteContact = async (contact: Contact) => {
    const confirmed = window.confirm(
      `Delete ${contact.name}? This removes the contact record. A business must retain at least one contact.`,
    );

    if (!confirmed) return;

    setDeletingContactId(contact.id);
    setLoadError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `${API_BASE}/clients/contacts/${encodeURIComponent(contact.id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          responseError(data, 'We could not delete this contact. Try again.'),
        );
      }

      setContacts((current) =>
        current.filter((item) => item.id !== contact.id),
      );

      showSuccess(`${contact.name} deleted.`);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'We could not delete this contact. Please try again.',
      );
    } finally {
      setDeletingContactId(null);
    }
  };

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 text-body font-bold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to clients
          </Link>

          <div>
            <h1 className="text-title-l text-ink">Contacts</h1>
            <p className="mt-1 text-body text-ink-soft">
              Manage the people you work with across your clients and businesses.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => router.push('/clients/contacts/new')}
          className="w-fit"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add contact
        </Button>
      </header>

      {successMessage && (
        <div
          role="status"
          className="rounded-input bg-pill-paid/20 px-3 py-2 text-body text-paid-text"
        >
          {successMessage}
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-input bg-pill-late/40 px-3 py-3 text-body text-late-text sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {loadError}
          </span>

          <button
            type="button"
            onClick={() => void fetchDirectory()}
            className="shrink-0 self-start font-bold hover:underline sm:self-center"
          >
            Try again
          </button>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/clients"
              className="inline-flex min-h-10 items-center gap-2 rounded-input border border-line bg-surface px-3 text-body font-bold text-ink-soft transition-colors hover:bg-tint hover:text-ink"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Clients
            </Link>

            <span
              aria-current="page"
              className="inline-flex min-h-10 items-center gap-2 rounded-input border border-cocoa bg-peach-chip px-3 text-body font-bold text-ink"
            >
              <ContactRound className="h-4 w-4" aria-hidden="true" />
              Contacts
              <span className="rounded-full bg-surface px-2 py-0.5 text-caption">
                {contacts.length}
              </span>
            </span>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search contacts"
              placeholder="Search by name, role, email or client"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>

        {loading ? (
          <div
            className="space-y-3"
            aria-label="Loading contacts"
            role="status"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-card bg-tint"
              />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="rounded-card border border-line-subtle bg-surface px-6 py-12 text-center">
            <ContactRound
              className="mx-auto h-10 w-10 text-ink-muted"
              aria-hidden="true"
            />

            <h2 className="mt-4 text-heading text-ink">
              {searchQuery ? 'No contacts match that search' : 'No contacts yet'}
            </h2>

            <p className="mx-auto mt-1 max-w-md text-body text-ink-soft">
              {searchQuery
                ? 'Try searching for a different contact name, role, email address or client.'
                : 'Add contacts to keep track of the people you communicate with at each client business.'}
            </p>

            {!searchQuery && (
              <Button
                type="button"
                onClick={() => router.push('/clients/contacts/new')}
                className="mt-5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first contact
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => {
              const client = clientById.get(contact.client_id);
              const clientName =
                contact.client_name ?? client?.name ?? 'Client';
              const cleanPhone = normalisePhone(contact.phone);

              return (
                <article
                  key={contact.id}
                  className="flex flex-col gap-4 rounded-card border border-line-subtle bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-heading text-ink">
                          {contact.name}
                        </h2>

                        {contact.is_primary && (
                          <span className="rounded-full bg-tint px-2 py-0.5 text-caption font-bold text-ink-soft">
                            Primary contact
                          </span>
                        )}
                      </div>

                      {contact.job_title && (
                        <p className="mt-0.5 text-body text-ink-soft">
                          {contact.job_title}
                        </p>
                      )}

                      <Link
                        href="/clients"
                        className="mt-1 inline-flex items-center gap-1.5 text-caption font-bold text-ink-muted transition-colors hover:text-ink"
                      >
                        {client?.client_type === 'BUSINESS' ? (
                          <Building2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Users
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {clientName}
                      </Link>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-caption text-ink-soft">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
                          >
                            <Mail
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            <span className="break-all">{contact.email}</span>
                          </a>
                        )}

                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
                          >
                            <Phone
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {contact.phone}
                          </a>
                        )}

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.replace(/\+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-link hover:underline"
                          >
                            <MessageCircle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-1 self-end sm:self-start">
                    <Link
                      href={`/clients/contacts/${encodeURIComponent(contact.id)}/edit`}
                      aria-label={`Edit ${contact.name}`}
                      title="Edit contact"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-tint hover:text-ink"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => void handleDeleteContact(contact)}
                      disabled={deletingContactId === contact.id}
                      aria-label={`Delete ${contact.name}`}
                      title="Delete contact"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-pill-late/40 hover:text-late-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingContactId === contact.id ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
