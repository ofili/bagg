'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Buildings,
  ChatCircle,
  Envelope,
  Phone,
  Plus,
  User,
  Users,
} from '@phosphor-icons/react';
import { ContactRow } from '@/components/mobile/ContactRow';
import {
  Alert,
  buttonStyles,
  DataTable,
  type ColumnDef,
  PageContainer,
  PageHeader,
  SearchInput,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = (
  '/api'
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

function normalisePhone(phone?: string | null) {
  return phone ? phone.replace(/[^0-9+]/g, '') : '';
}

export default function ContactsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState<'name' | 'client_name'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const clientById = useMemo(() => {
    const map = new Map<string, Client>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  const fetchDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [clientsRes, contactsRes] = await Promise.all([
        fetch(`${API_BASE}/clients`, { credentials: 'include' }),
        fetch(`${API_BASE}/clients/contacts`, { credentials: 'include' }),
      ]);

      if (!clientsRes.ok || !contactsRes.ok) {
        throw new Error('Could not load contacts directory.');
      }

      const [clientsData, contactsData] = (await Promise.all([
        clientsRes.json(),
        contactsRes.json(),
      ])) as [Client[], Contact[]];

      setClients(clientsData);
      setContacts(contactsData);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Could not load contacts directory.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (!query) return true;

      const client = clientById.get(contact.client_id);
      const clientName = contact.client_name ?? client?.name ?? '';

      return (
        contact.name.toLowerCase().includes(query) ||
        (contact.email ?? '').toLowerCase().includes(query) ||
        (contact.phone ?? '').toLowerCase().includes(query) ||
        (contact.job_title ?? '').toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query)
      );
    });
  }, [contacts, clientById, searchQuery]);

  const toggleSort = (key: string) => {
    if (key !== 'name' && key !== 'client_name') return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder('asc');
    } else {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortBy === 'client_name') {
        const aClient = a.client_name ?? clientById.get(a.client_id)?.name ?? '';
        const bClient = b.client_name ?? clientById.get(b.client_id)?.name ?? '';
        aVal = aClient.toLowerCase();
        bVal = bClient.toLowerCase();
      } else {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      }
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredContacts, clientById, sortBy, sortOrder]);

  const columns: ColumnDef<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      align: 'left',
      sortable: true,
      render: (contact) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ink">{contact.name}</span>
              {contact.is_primary && (
                <span className="rounded-full bg-surface-tint px-2 py-0.5 text-caption font-bold text-text-soft">
                  Primary
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'client_name',
      header: 'Client',
      align: 'left',
      sortable: true,
      render: (contact) => {
        const client = clientById.get(contact.client_id);
        const clientName = contact.client_name ?? client?.name ?? 'Client';
        return (
          <Link
            href={`/clients/${encodeURIComponent(contact.client_id)}`}
            className="inline-flex items-center gap-1.5 font-semibold text-link underline-offset-4 hover:underline"
          >
            {client?.client_type === 'BUSINESS' ? (
              <Buildings className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            ) : (
              <Users className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            )}
            {clientName}
          </Link>
        );
      },
    },
    {
      key: 'job_title',
      header: 'Role',
      align: 'left',
      render: (contact) => (
        <span className="text-body text-text-soft">
          {contact.job_title || '—'}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      align: 'left',
      render: (contact) =>
        contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 text-body text-text-soft hover:text-ink hover:underline"
          >
            <Envelope className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="truncate">{contact.email}</span>
          </a>
        ) : (
          <span className="text-caption text-text-muted">—</span>
        ),
    },
    {
      key: 'phone',
      header: 'Phone / WhatsApp',
      align: 'left',
      render: (contact) => {
        const cleanPhone = normalisePhone(contact.phone);
        if (!contact.phone) return <span className="text-caption text-text-muted">—</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-body text-text-soft">
              <Phone className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              {contact.phone}
            </span>
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-caption font-bold text-link hover:underline"
              >
                <ChatCircle className="h-3.5 w-3.5" aria-hidden="true" />
                WhatsApp
              </a>
            )}
          </div>
        );
      },
    },
  ];

  const renderMobileCard = (contact: Contact) => (
      <ContactRow
          contact={contact}
          clientName={contact.client_name ?? clientById.get(contact.client_id)?.name ?? 'Client'}
      />
  );

  const emptyState = (
    <div className="border-brut border-ink bg-surface px-6 py-12 text-center">
      <User
        className="mx-auto h-10 w-10 text-text-muted"
        aria-hidden="true"
      />

      <h2 className="mt-4 text-heading text-ink">
        {searchQuery ? 'No contacts match that search' : 'No contacts yet'}
      </h2>

      <p className="mx-auto mt-1 max-w-md text-body text-text-soft">
        {searchQuery
          ? 'Try searching for a different contact name, role, email address or client.'
          : 'Add contacts to keep track of the people you communicate with at each client business.'}
      </p>

      {!searchQuery && (
        <button
          type="button"
          onClick={() => router.push('/clients/contacts/new')}
          className={cn(buttonStyles({ variant: 'primary' }), 'mt-5 inline-flex')}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add your first contact
        </button>
      )}
    </div>
  );

  return (
    <PageContainer width="list">
      <div className="space-y-4">
        <Link
          href="/clients"
          className={buttonStyles({ variant: 'outline' })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to clients
        </Link>

        <PageHeader
          eyebrow="Directory"
          title="Contacts"
          description="Manage the people you work with across your clients and businesses."
          actions={
            <Link
              href="/clients/contacts/new"
              className={cn(buttonStyles({ variant: 'accent' }), 'hidden sm:inline-flex')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add contact
            </Link>
          }
        />
      </div>

      {loadError && (
        <Alert
          variant="error"
          action={(
            <button
              type="button"
              onClick={() => void fetchDirectory()}
              className="font-bold underline underline-offset-2"
            >
              Try again
            </button>
          )}
        >
          {loadError}
        </Alert>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/clients"
              className="inline-flex min-h-10 items-center gap-2 rounded-btn border-brut-thin border-ink bg-surface px-4 text-body font-bold text-text-soft transition-colors hover:bg-surface-tint hover:text-ink"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Clients
            </Link>

            <span
              aria-current="page"
              className="inline-flex min-h-10 items-center gap-2 rounded-btn border-brut-thin border-ink bg-peach-chip px-4 text-body font-bold text-ink"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Contacts
              <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-bold">
                {contacts.length}
              </span>
            </span>
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, role, email or client"
            className="w-full sm:max-w-md"
          />
        </div>

        <DataTable
          columns={columns}
          rows={sortedContacts}
          getRowKey={(contact) => contact.id}
          loading={loading}
          emptyState={emptyState}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={toggleSort}
          renderMobileCard={renderMobileCard}
          tableClassName="min-w-[800px]"
          caption="Contacts table"
          getRowHref={(contact) => `/clients/contacts/${encodeURIComponent(contact.id)}/edit`}
        />
      </section>
    </PageContainer>
  );
}
