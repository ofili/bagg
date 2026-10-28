
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  ContactRound,
  Building2,
  Edit2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

type ClientType = 'PERSON' | 'BUSINESS';
type DirectoryTab = 'clients' | 'contacts';

interface Client {
  id: string;
  workspace_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  bagg_reference?: string | null;
  client_type: ClientType;
  contacts?: Contact[];
  preferred_currency: string;
  default_payment_terms_days: number;
  tax_id?: string | null;
  notes?: string | null;
  total_invoiced_minor: number;
  total_paid_minor: number;
  total_outstanding_minor: number;
  invoice_count: number;
  created_at: string;
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

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function responseError(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data &&
    typeof data.detail === 'string'
  ) {
    return data.detail;
  }

  return fallback;
}

function normalisePhone(phone?: string | null) {
  return phone ? phone.replace(/[^0-9+]/g, '') : '';
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DirectoryTab>('clients');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const url = `${API_BASE}/clients${
        params.toString() ? `?${params.toString()}` : ''
      }`;

      const res = await fetch(url, { credentials: 'include' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          responseError(data, 'We could not load your clients. Try again.'),
        );
      }

      const data: Client[] = await res.json();
      setClients(data);
    } catch (err) {
      setLoadError(
        errorText(err, 'We could not load your clients. Try again.'),
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);

    try {
      const params = new URLSearchParams();

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const url = `${API_BASE}/clients/contacts${
        params.toString() ? `?${params.toString()}` : ''
      }`;

      const res = await fetch(url, { credentials: 'include' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          responseError(data, 'We could not load your contacts. Try again.'),
        );
      }

      const data: Contact[] = await res.json();
      setContacts(data);
    } catch (err) {
      setLoadError(
        errorText(err, 'We could not load your contacts. Try again.'),
      );
    } finally {
      setContactsLoading(false);
    }
  }, [searchQuery]);

  const refreshDirectory = useCallback(async () => {
    await Promise.all([fetchClients(), fetchContacts()]);
  }, [fetchClients, fetchContacts]);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDeleteClient = async (client: Client) => {
    const confirmed = window.confirm(
      `Delete ${client.name}? Their invoices may remain in your workspace. This cannot be undone.`,
    );

    if (!confirmed) return;

    setLoadError(null);

    try {
      const res = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          responseError(data, 'We could not delete this client. Try again.'),
        );
      }

      showSuccess(`${client.name} deleted.`);
      await refreshDirectory();
    } catch (err) {
      setLoadError(
        errorText(err, 'We could not delete this client. Try again.'),
      );
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (
      !window.confirm(
        `Delete ${contact.name}? This removes the contact record.`,
      )
    ) {
      return;
    }

    setLoadError(null);

    try {
      const res = await fetch(
        `${API_BASE}/clients/contacts/${contact.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          responseError(data, 'We could not delete this contact.'),
        );
      }

      showSuccess('Contact deleted.');
      await refreshDirectory();
    } catch (err) {
      setLoadError(
        errorText(err, 'We could not delete this contact.'),
      );
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return (
      client.name.toLowerCase().includes(query) ||
      (client.email ?? '').toLowerCase().includes(query) ||
      (client.phone ?? '').toLowerCase().includes(query) ||
      (client.bagg_reference ?? '').toLowerCase().includes(query)
    );
  });

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    const clientName =
      contact.client_name ??
      clients.find((client) => client.id === contact.client_id)?.name ??
      '';

    return (
      contact.name.toLowerCase().includes(query) ||
      (contact.email ?? '').toLowerCase().includes(query) ||
      (contact.phone ?? '').toLowerCase().includes(query) ||
      (contact.job_title ?? '').toLowerCase().includes(query) ||
      clientName.toLowerCase().includes(query)
    );
  });

  const getContactClientName = (contact: Contact) =>
    contact.client_name ??
    clients.find((client) => client.id === contact.client_id)?.name ??
    'Client';

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-title-l text-ink">Clients &amp; contacts</h1>
          <p className="mt-1 text-body text-ink-soft">
            Keep client details and the people you work with in one place.
          </p>
        </div>

        {activeTab === 'clients' ? (
          <Button asChild className="w-fit">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add client
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-fit">
            <Link href="/clients/contacts/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add contact
            </Link>
          </Button>
        )}
      </header>

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-input bg-pill-paid/20 px-3 py-2 text-body text-paid-text"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text"
        >
          <span className="flex items-center gap-2">
            <AlertCircle
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {loadError}
          </span>

          <button
            type="button"
            onClick={() => void refreshDirectory()}
            className="shrink-0 font-bold hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Client directory"
          className="inline-flex w-fit rounded-input border border-line bg-tint p-1"
        >
          <button
            id="clients-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'clients'}
            aria-controls="clients-panel"
            onClick={() => setActiveTab('clients')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-input px-4 text-body font-bold transition-colors',
              activeTab === 'clients'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Clients
            <span className="rounded-full bg-tint px-2 py-0.5 text-caption">
              {clients.length}
            </span>
          </button>

          <button
            id="contacts-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'contacts'}
            aria-controls="contacts-panel"
            onClick={() => setActiveTab('contacts')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-input px-4 text-body font-bold transition-colors',
              activeTab === 'contacts'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            <ContactRound className="h-4 w-4" aria-hidden="true" />
            Contacts
            <span className="rounded-full bg-tint px-2 py-0.5 text-caption">
              {contacts.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label={`Search ${activeTab}`}
            placeholder={
              activeTab === 'clients'
                ? 'Search clients by name, email or phone'
                : 'Search contacts or client names'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(inputClass, 'pl-9')}
          />
        </div>
      </div>

      {activeTab === 'clients' ? (
        <section
          id="clients-panel"
          role="tabpanel"
          aria-labelledby="clients-tab"
          className="space-y-4"
        >
          {loading ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Loading clients"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-card bg-tint"
                />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-card border border-line-subtle bg-surface px-6 py-12 text-center">
              <BagCharacter size={80} className="mx-auto" />

              <h2 className="mt-4 text-heading text-ink">
                {searchQuery ? 'No clients match that search' : 'No clients yet'}
              </h2>

              <p className="mx-auto mt-1 max-w-sm text-body text-ink-soft">
                {searchQuery
                  ? 'Try a different name, email, phone number or reference.'
                  : 'Save a client once, then draft their next invoice in under a minute.'}
              </p>

              {!searchQuery && (
                <Button asChild className="mt-5">
                  <Link href="/clients/new">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add your first client
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((client) => {
                const cleanPhone = normalisePhone(client.phone);
                const clientContacts = contacts.filter(
                  (contact) => contact.client_id === client.id,
                );

                return (
                  <article
                    key={client.id}
                    className="flex flex-col rounded-card border border-line-subtle bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-body font-extrabold text-ink">
                          {client.client_type === 'BUSINESS' ? (
                            <Building2
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            client.name.trim().charAt(0).toUpperCase() || (
                              <UserRound
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )
                          )}
                        </span>

                        <div className="min-w-0">
                          <h2 className="truncate text-heading text-ink">
                            {client.name}
                          </h2>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                            <span className="rounded-full bg-tint px-2 py-0.5 font-extrabold text-ink-soft">
                              {client.client_type === 'BUSINESS'
                                ? 'Business'
                                : 'Individual'}
                            </span>

                            {client.bagg_reference && (
                              <span>{client.bagg_reference}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center">
                        <Link
                          href={`/clients/${client.id}`}
                          aria-label={`Edit ${client.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-tint hover:text-ink"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleDeleteClient(client)}
                          aria-label={`Delete ${client.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-pill-late/40 hover:text-late-text"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                      <span className="rounded-full bg-tint px-2 py-1 font-bold text-ink-soft">
                        {client.preferred_currency}
                      </span>

                      <span>Net {client.default_payment_terms_days} days</span>

                      {client.client_type === 'BUSINESS' && (
                        <span className="rounded-full bg-tint px-2 py-1">
                          {clientContacts.length}{' '}
                          {clientContacts.length === 1 ? 'contact' : 'contacts'}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 min-h-14 space-y-1.5 text-body text-ink-soft">
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="flex items-center gap-2 hover:text-ink"
                        >
                          <Mail
                            className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                            aria-hidden="true"
                          />
                          <span className="truncate">{client.email}</span>
                        </a>
                      ) : (
                        <p className="text-caption font-bold text-ink-muted">
                          No billing email
                        </p>
                      )}

                      {client.phone && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <Phone
                              className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                              aria-hidden="true"
                            />
                            <span className="truncate">{client.phone}</span>
                          </span>

                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone.replace(/\+/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 text-caption font-bold text-link hover:underline"
                            >
                              <MessageCircle
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}

                      {client.address && (
                        <p className="flex items-start gap-2 text-caption text-ink-muted">
                          <MapPin
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{client.address}</span>
                        </p>
                      )}
                    </div>

                    {client.client_type === 'BUSINESS' &&
                      clientContacts.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-input bg-tint p-3">
                          <p className="text-caption font-extrabold uppercase tracking-wide text-ink-muted">
                            {clientContacts.length === 1
                              ? 'Primary contact'
                              : 'Contacts'}
                          </p>

                          {clientContacts.slice(0, 2).map((contact) => (
                            <div key={contact.id} className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-body font-bold text-ink">
                                  {contact.name}
                                </span>

                                {contact.is_primary && (
                                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-caption text-ink-soft">
                                    Primary
                                  </span>
                                )}
                              </div>

                              {contact.job_title && (
                                <p className="text-caption text-ink-muted">
                                  {contact.job_title}
                                </p>
                              )}
                            </div>
                          ))}

                          {clientContacts.length > 2 && (
                            <p className="text-caption text-ink-muted">
                              +{clientContacts.length - 2} more
                            </p>
                          )}
                        </div>
                      )}

                    <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line-subtle pt-3">
                      <div>
                        <dt className="text-caption text-ink-muted">
                          Invoiced
                        </dt>
                        <dd className="mt-0.5 text-caption font-extrabold text-ink">
                          <Money
                            amountMinor={client.total_invoiced_minor}
                            currency={client.preferred_currency}
                            hideCurrencyCode
                          />
                        </dd>
                      </div>

                      <div>
                        <dt className="text-caption text-ink-muted">Paid</dt>
                        <dd className="mt-0.5 text-caption font-extrabold text-paid-text">
                          <Money
                            amountMinor={client.total_paid_minor}
                            currency={client.preferred_currency}
                            hideCurrencyCode
                          />
                        </dd>
                      </div>

                      <div className="text-right">
                        <dt className="text-caption text-ink-muted">
                          Outstanding
                        </dt>
                        <dd className="mt-0.5 text-caption font-extrabold text-ink">
                          <Money
                            amountMinor={client.total_outstanding_minor}
                            currency={client.preferred_currency}
                            hideCurrencyCode
                          />
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section
          id="contacts-panel"
          role="tabpanel"
          aria-labelledby="contacts-tab"
          className="space-y-4"
        >
          <div>
            <h2 className="text-heading text-ink">
              People and business contacts
            </h2>
            <p className="mt-1 text-body text-ink-soft">
              Contacts belong to a client. A business can have several contacts.
            </p>
          </div>

          {contactsLoading ? (
            <div className="space-y-3" aria-label="Loading contacts">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-card bg-tint"
                />
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-card border border-line-subtle bg-surface px-6 py-10 text-center">
              <ContactRound
                className="mx-auto h-10 w-10 text-ink-muted"
                aria-hidden="true"
              />

              <h3 className="mt-3 text-heading text-ink">
                {searchQuery
                  ? 'No contacts match that search'
                  : 'No contacts yet'}
              </h3>

              <p className="mt-1 text-body text-ink-soft">
                {searchQuery
                  ? 'Try searching by contact name, role, email or client.'
                  : 'Add a contact to an existing client using the Add contact action.'}
              </p>

              {!searchQuery && clients.length > 0 && (
                <Button asChild className="mt-4">
                  <Link href="/clients/contacts/new">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add your first contact
                  </Link>
                </Button>
              )}

              {!searchQuery && clients.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/clients/new">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create a client first
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => {
                const cleanPhone = normalisePhone(contact.phone);

                return (
                  <article
                    key={contact.id}
                    className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
                        <UserRound
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-heading text-ink">
                            {contact.name}
                          </h3>

                          {contact.is_primary && (
                            <span className="rounded-full bg-tint px-2 py-0.5 text-caption font-bold text-ink-soft">
                              Primary
                            </span>
                          )}
                        </div>

                        {contact.job_title && (
                          <p className="mt-0.5 text-body text-ink-soft">
                            {contact.job_title}
                          </p>
                        )}

                        <p className="mt-1 text-caption font-bold text-ink-muted">
                          Client: {getContactClientName(contact)}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-caption text-ink-soft">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="inline-flex items-center gap-1.5 hover:text-ink"
                            >
                              <Mail
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {contact.email}
                            </a>
                          )}

                          {contact.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {contact.phone}
                            </span>
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

                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                      <Link
                        href={`/clients/contacts/${contact.id}/edit`}
                        aria-label={`Edit ${contact.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-tint hover:text-ink"
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleDeleteContact(contact)}
                        aria-label={`Delete ${contact.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-pill-late/40 hover:text-late-text"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
