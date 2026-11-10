'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Edit2,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Repeat,
  Save,
  UserRound,
  Users,
} from 'lucide-react';

import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import {
  BaggSelect,
  Button,
  Card,
  Field,
  Input,
  buttonStyles,
} from '@/components/ui';
import { useCurrentBreadcrumb } from '@/components/navigation/BreadcrumbContext';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

type ClientType = 'PERSON' | 'BUSINESS';
type ClientTab = 'overview' | 'statement' | 'invoices' | 'quotes' | 'recurring' | 'contacts' | 'edit';

interface ClientRecurringSchedule {
  id: string;
  name: string;
  currency: string;
  frequency: string;
  interval: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  next_run_date: string;
  items: { quantity: number; unit_price_minor: number; description: string }[];
}

interface Contact {
  id: string;
  name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
}

interface Client {
  id: string;
  workspace_id: string;
  name: string;
  client_type: ClientType;
  bagg_reference?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  preferred_currency: string;
  default_payment_terms_days: number;
  tax_id?: string | null;
  notes?: string | null;
  total_invoiced_minor?: number;
  total_paid_minor?: number;
  total_outstanding_minor?: number;
  invoice_count?: number;
  contacts?: Contact[];
  created_at?: string;
}

interface StatementEntry {
  date: string;
  type: string;
  reference_number: string;
  description: string;
  debit_minor: number;
  credit_minor: number;
  running_balance_minor: number;
}

interface ClientStatement {
  client_id: string;
  client_name: string;
  currency: string;
  business_name: string;
  generated_at: string;
  date_from?: string | null;
  date_to?: string | null;
  opening_balance_minor: number;
  total_invoiced_minor: number;
  total_paid_minor: number;
  closing_balance_minor: number;
  entries: StatementEntry[];
}

interface ClientInvoice {
  id: string;
  invoice_number: string;
  currency: string;
  status: string;
  total_minor: number;
  amount_paid_minor: number;
  issue_date: string;
  due_date: string;
}

interface ClientQuote {
  id: string;
  quote_number: string;
  currency: string;
  status: string;
  total_minor: number;
  issue_date: string;
  expires_at: string;
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

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ClientTab>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit form state
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('NG');
  const [preferredCurrency, setPreferredCurrency] = useState('NGN');
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  // Tab sub-resources state
  const [statement, setStatement] = useState<ClientStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');

  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [quotes, setQuotes] = useState<ClientQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<ClientRecurringSchedule[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const { setCurrentLabel } = useCurrentBreadcrumb();

  useEffect(() => {
    if (client?.name) {
      setCurrentLabel(client.name);
    }
    return () => setCurrentLabel(null);
  }, [client?.name, setCurrentLabel]);

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientId)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Could not load client details.');
      const data: Client = await res.json();
      setClient(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setCountry(data.country || 'NG');
      setPreferredCurrency(data.preferred_currency || 'NGN');
      setPaymentTerms(data.default_payment_terms_days ?? 14);
      setTaxId(data.tax_id || '');
      setNotes(data.notes || '');
      if (data.contacts) setContacts(data.contacts);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Could not load client details.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchStatement = useCallback(async () => {
    if (!clientId) return;
    try {
      setStatementLoading(true);
      let qs = '';
      const parts: string[] = [];
      if (statementDateFrom) parts.push(`date_from=${encodeURIComponent(statementDateFrom)}`);
      if (statementDateTo) parts.push(`date_to=${encodeURIComponent(statementDateTo)}`);
      if (parts.length > 0) qs = `?${parts.join('&')}`;

      const res = await fetch(`${API_BASE}/receipts/statement/${encodeURIComponent(clientId)}${qs}`, {
        credentials: 'include',
      });
      if (res.ok) {
        setStatement(await res.json());
      }
    } catch {
      // Soft fail
    } finally {
      setStatementLoading(false);
    }
  }, [clientId, statementDateFrom, statementDateTo]);

  const fetchInvoices = useCallback(async () => {
    if (!clientId) return;
    try {
      setInvoicesLoading(true);
      const res = await fetch(`${API_BASE}/invoices?client_id=${encodeURIComponent(clientId)}&per_page=50`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.items || (Array.isArray(data) ? data : []));
      }
    } catch {
      // Soft fail
    } finally {
      setInvoicesLoading(false);
    }
  }, [clientId]);

  const fetchQuotes = useCallback(async () => {
    if (!clientId) return;
    try {
      setQuotesLoading(true);
      const res = await fetch(`${API_BASE}/quotes?client_id=${encodeURIComponent(clientId)}&per_page=50`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.items || (Array.isArray(data) ? data : []));
      }
    } catch {
      // Soft fail
    } finally {
      setQuotesLoading(false);
    }
  }, [clientId]);

  const fetchRecurringSchedules = useCallback(async () => {
    if (!clientId) return;
    try {
      setRecurringLoading(true);
      const res = await fetch(`${API_BASE}/recurring-invoices?client_id=${encodeURIComponent(clientId)}&limit=50`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRecurringSchedules(Array.isArray(data) ? data : data.items || []);
      }
    } catch {
      // Soft fail
    } finally {
      setRecurringLoading(false);
    }
  }, [clientId]);

  const fetchContacts = useCallback(async () => {
    if (!clientId) return;
    try {
      setContactsLoading(true);
      const res = await fetch(`${API_BASE}/clients/contacts?client_id=${encodeURIComponent(clientId)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : data.items || []);
      }
    } catch {
      // Soft fail
    } finally {
      setContactsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    if (activeTab === 'statement') void fetchStatement();
    if (activeTab === 'invoices') void fetchInvoices();
    if (activeTab === 'quotes') void fetchQuotes();
    if (activeTab === 'contacts') void fetchContacts();
  }, [activeTab, fetchStatement, fetchInvoices, fetchQuotes, fetchContacts]);

  const handleUpdateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!client || saving) return;
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await fetch(`${API_BASE}/clients/${encodeURIComponent(client.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          country: country.trim() || 'NG',
          preferred_currency: preferredCurrency,
          default_payment_terms_days: Number(paymentTerms),
          tax_id: taxId.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Could not update client.');
      }
      setSuccessMessage('Client updated successfully.');
      await fetchClient();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not update client.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex min-h-[50vh] items-center justify-center text-text-muted">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
        <span className="sr-only">Loading client...</span>
      </div>
    );
  }

  if (loadError || !client) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card zone="calm" className="mx-auto max-w-lg space-y-3 p-8 text-center">
          <AlertCircle aria-hidden className="mx-auto h-9 w-9 text-danger" />
          <h1 className="text-title">Client not found</h1>
          <p role="alert" className="text-body text-text-soft">{loadError || 'This client could not be loaded.'}</p>
          <Link href="/clients" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" /> Back to clients
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 sm:p-6 sm:pb-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/clients" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" /> All clients
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title-l sm:text-display">{client.name}</h1>
            <span className="rounded-full bg-peach-chip px-3 py-1 text-caption font-extrabold text-ink-soft">
              {client.client_type === 'BUSINESS' ? (
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</span>
              ) : (
                <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Person</span>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-body text-text-soft">
            {client.email && (
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-text-muted" /> {client.email}</span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-text-muted" /> {client.phone}</span>
            )}
            {client.address && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-text-muted" /> {client.address}</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/invoices/new?client_id=${client.id}`}
            className={buttonStyles({ zone: 'calm' })}
          >
            <Plus aria-hidden className="h-4 w-4" /> New invoice
          </Link>
          <Link
            href={`/quotes/new?client_id=${client.id}`}
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            <Plus aria-hidden className="h-4 w-4" /> New quote
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card border-brut border-ink bg-surface p-4">
          <p className="text-caption font-bold text-text-muted">Total Invoiced</p>
          <Money amountMinor={client.total_invoiced_minor || 0} currency={client.preferred_currency} className="mt-1 text-amount-m" />
        </div>
        <div className="rounded-card border-brut border-ink bg-surface p-4">
          <p className="text-caption font-bold text-text-muted">Total Paid</p>
          <Money amountMinor={client.total_paid_minor || 0} currency={client.preferred_currency} variant="paid" className="mt-1 text-amount-m" />
        </div>
        <div className="rounded-card border-brut border-ink bg-surface p-4">
          <p className="text-caption font-bold text-text-muted">Outstanding</p>
          <Money amountMinor={client.total_outstanding_minor || 0} currency={client.preferred_currency} variant="total" className="mt-1 text-amount-m" />
        </div>
        <div className="rounded-card border-brut border-ink bg-surface p-4">
          <p className="text-caption font-bold text-text-muted">Invoices</p>
          <p className="mt-1 text-amount-m font-extrabold">{client.invoice_count || 0}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {(
          [
            ['overview', 'Overview'],
            ['statement', 'Statement of Account'],
            ['invoices', 'Invoices'],
            ['quotes', 'Quotes'],
            ['contacts', 'Contacts'],
            ['edit', 'Edit Details'],
          ] as const
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={cn(
              'min-h-11 whitespace-nowrap px-4 text-body font-bold transition-colors',
              activeTab === tabKey
                ? 'border-b-2 border-cocoa text-ink'
                : 'text-text-muted hover:text-ink'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card zone="calm" className="space-y-4">
            <h2 className="text-heading">Client profile</h2>
            <dl className="grid gap-4 sm:grid-cols-2 text-body">
              <div>
                <dt className="text-caption text-text-muted">Preferred currency</dt>
                <dd className="font-bold">{client.preferred_currency}</dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">Payment terms</dt>
                <dd className="font-bold">{client.default_payment_terms_days} days</dd>
              </div>
              {client.tax_id && (
                <div>
                  <dt className="text-caption text-text-muted">Tax ID / TIN</dt>
                  <dd className="font-bold">{client.tax_id}</dd>
                </div>
              )}
              {client.bagg_reference && (
                <div>
                  <dt className="text-caption text-text-muted">Bagg Reference</dt>
                  <dd className="font-mono font-bold">{client.bagg_reference}</dd>
                </div>
              )}
              {client.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-caption text-text-muted">Notes</dt>
                  <dd className="whitespace-pre-line text-text-soft">{client.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      )}

      {/* TAB 2: STATEMENT OF ACCOUNT */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-heading">Statement of Account</h2>
              <p className="text-body text-text-soft">Consolidated transaction ledger for this client.</p>
            </div>
            <Button variant="outline" zone="calm" onClick={() => window.print()}>
              <Printer aria-hidden className="h-4 w-4" /> Print statement
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="stmt-from" className="text-caption font-bold text-text-muted">From:</label>
              <input
                id="stmt-from"
                type="date"
                value={statementDateFrom}
                onChange={(e) => setStatementDateFrom(e.target.value)}
                className="rounded-input border border-line bg-surface px-3 py-1.5 text-body"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="stmt-to" className="text-caption font-bold text-text-muted">To:</label>
              <input
                id="stmt-to"
                type="date"
                value={statementDateTo}
                onChange={(e) => setStatementDateTo(e.target.value)}
                className="rounded-input border border-line bg-surface px-3 py-1.5 text-body"
              />
            </div>
          </div>

          {statementLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !statement || statement.entries.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center">
              <BagCharacter size={64} className="mx-auto" decorative />
              <p className="mt-3 font-bold">No transactions found</p>
              <p className="text-body text-text-soft">There are no invoices or payment receipts for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card border-brut border-ink bg-surface shadow-brut-sm">
              <table className="w-full text-left text-body">
                <thead className="border-b border-ink bg-tint text-caption font-extrabold uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {statement.entries.map((entry, index) => (
                    <tr key={index} className="hover:bg-surface-tint">
                      <td className="p-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="p-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-caption font-bold uppercase',
                          entry.type === 'invoice' ? 'bg-mango/20 text-ink' : 'bg-pill-paid/30 text-paid-text'
                        )}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{entry.reference_number}</td>
                      <td className="p-3 max-w-xs truncate">{entry.description}</td>
                      <td className="p-3 text-right">
                        {entry.debit_minor > 0 && <Money amountMinor={entry.debit_minor} currency={statement.currency} />}
                      </td>
                      <td className="p-3 text-right">
                        {entry.credit_minor > 0 && <Money amountMinor={entry.credit_minor} currency={statement.currency} variant="paid" />}
                      </td>
                      <td className="p-3 text-right font-bold">
                        <Money amountMinor={entry.running_balance_minor} currency={statement.currency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-ink bg-tint font-bold">
                  <tr>
                    <td colSpan={4} className="p-3">Totals</td>
                    <td className="p-3 text-right"><Money amountMinor={statement.total_invoiced_minor} currency={statement.currency} /></td>
                    <td className="p-3 text-right"><Money amountMinor={statement.total_paid_minor} currency={statement.currency} variant="paid" /></td>
                    <td className="p-3 text-right text-heading"><Money amountMinor={statement.closing_balance_minor} currency={statement.currency} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">Invoices</h2>
            <Link href={`/invoices/new?client_id=${client.id}`} className={buttonStyles({ zone: 'calm' })}>
              <Plus className="h-4 w-4" /> New invoice
            </Link>
          </div>
          {invoicesLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 font-bold">No invoices for this client</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink hover:bg-surface-tint"
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-ink">{inv.invoice_number}</p>
                    <p className="text-caption text-text-soft">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money amountMinor={inv.total_minor} currency={inv.currency} className="text-amount-s font-bold" />
                    <StatusPill status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUOTES */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">Quotes</h2>
            <Link href={`/quotes/new?client_id=${client.id}`} className={buttonStyles({ zone: 'calm' })}>
              <Plus className="h-4 w-4" /> New quote
            </Link>
          </div>
          {quotesLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center">
              <FileCheck className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 font-bold">No quotes for this client</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="flex items-center justify-between rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink hover:bg-surface-tint"
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-ink">{q.quote_number}</p>
                    <p className="text-caption text-text-soft">Expires {formatDate(q.expires_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money amountMinor={q.total_minor} currency={q.currency} className="text-amount-s font-bold" />
                    <StatusPill status={q.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4.5: RECURRING SCHEDULES */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">Recurring schedules</h2>
            <Link href={`/recurring-invoices/new?client_id=${client.id}`} className={buttonStyles({ zone: 'calm' })}>
              <Plus className="h-4 w-4" /> New schedule
            </Link>
          </div>
          {recurringLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recurringSchedules.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center">
              <Repeat className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 font-bold">No recurring schedules for this client</p>
              <p className="mt-1 text-caption text-text-soft">Set up automated billing on a repeat cadence.</p>
              <div className="mt-4">
                <Link href={`/recurring-invoices/new?client_id=${client.id}`} className={buttonStyles({ variant: 'accent' })}>
                  <Plus className="h-4 w-4" /> Create schedule
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recurringSchedules.map((sched) => {
                const cycleAmount = sched.items.reduce(
                  (sum, it) => sum + (it.quantity || 1) * (it.unit_price_minor || 0),
                  0,
                );
                return (
                  <Link
                    key={sched.id}
                    href={`/recurring-invoices/${sched.id}`}
                    className="flex items-center justify-between rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink hover:bg-surface-tint"
                  >
                    <div className="space-y-1">
                      <p className="font-extrabold text-ink">{sched.name}</p>
                      <p className="text-caption text-text-soft">
                        <span className="capitalize">{sched.frequency}</span> • Next run {formatDate(sched.next_run_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Money amountMinor={cycleAmount} currency={sched.currency} className="text-amount-s font-bold" />
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-caption font-extrabold capitalize border',
                          sched.status === 'active'
                            ? 'bg-leaf text-[#052E1B] border-ink'
                            : sched.status === 'paused'
                            ? 'bg-sun text-[#4A3200] border-ink'
                            : 'bg-surface-tint text-text-soft border-line',
                        )}
                      >
                        {sched.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">Contacts</h2>
            <Link href={`/clients/contacts/new?client_id=${client.id}`} className={buttonStyles({ zone: 'calm' })}>
              <Plus className="h-4 w-4" /> Add contact
            </Link>
          </div>
          {contactsLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 font-bold">No contacts registered for this client</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-card border border-line bg-surface p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-ink">{contact.name}</p>
                      {contact.is_primary && (
                        <span className="rounded-full bg-peach-chip px-2 py-0.5 text-caption font-bold">Primary</span>
                      )}
                    </div>
                    {contact.job_title && <p className="text-caption text-text-soft">{contact.job_title}</p>}
                    <div className="flex gap-4 text-caption text-text-muted">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>
                  <Link
                    href={`/clients/contacts/${contact.id}/edit`}
                    className={buttonStyles({ variant: 'outline' })}
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: EDIT DETAILS */}
      {activeTab === 'edit' && (
        <form onSubmit={handleUpdateClient} className="space-y-6">
          {successMessage && (
            <div role="status" className="flex items-center gap-2 rounded-row bg-pill-paid/20 p-3 text-body text-paid-text font-bold">
              <Check className="h-4 w-4" /> {successMessage}
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="flex items-center gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010] font-bold">
              <AlertCircle className="h-4 w-4" /> {errorMessage}
            </div>
          )}

          <Card zone="calm" className="space-y-4">
            <h2 className="text-heading">Edit Client Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="client-name" className={labelClass}>Client or company name</label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-email" className={labelClass}>Billing email</label>
                <input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-phone" className={labelClass}>Phone</label>
                <input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-tax" className={labelClass}>Tax ID or TIN</label>
                <input
                  id="client-tax"
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-currency" className={labelClass}>Preferred currency</label>
                <select
                  id="client-currency"
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
                  className={inputClass}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="client-terms" className={labelClass}>Payment terms (days)</label>
                <input
                  id="client-terms"
                  type="number"
                  min={0}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="client-address" className={labelClass}>Billing address</label>
                <input
                  id="client-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="client-notes" className={labelClass}>Notes</label>
                <textarea
                  id="client-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" zone="calm" loading={saving}>
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
