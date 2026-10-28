'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { Button, buttonStyles } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Client {
  id: string;
  workspace_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
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

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass = 'mb-1 block text-label font-bold text-ink-soft';

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showSheet, setShowSheet] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('NG');
  const [preferredCurrency, setPreferredCurrency] = useState('NGN');
  const [paymentTerms, setPaymentTerms] = useState(14);
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const url = `${API_BASE}/clients${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('we could not load your clients. Try again.');
      setClients(await res.json());
    } catch (err) {
      setLoadError(errorText(err, 'we could not load your clients. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchQuery]);

  const openSheet = (client: Client | null = null) => {
    setEditingClient(client);
    setName(client?.name ?? '');
    setEmail(client?.email ?? '');
    setPhone(client?.phone ?? '');
    setAddress(client?.address ?? '');
    setCountry(client?.country ?? 'NG');
    setPreferredCurrency(client?.preferred_currency ?? 'NGN');
    setPaymentTerms(client?.default_payment_terms_days ?? 14);
    setTaxId(client?.tax_id ?? '');
    setNotes(client?.notes ?? '');
    setErrorMessage(null);
    setShowSheet(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const payload = {
      name: name.trim(),
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      address: address.trim() ? address.trim() : null,
      country: country.trim() ? country.trim() : 'NG',
      preferred_currency: preferredCurrency,
      default_payment_terms_days: Number(paymentTerms),
      tax_id: taxId.trim() ? taxId.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      const url = editingClient
        ? `${API_BASE}/clients/${editingClient.id}`
        : `${API_BASE}/clients`;
      const method = editingClient ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'we could not save this client. Check the details and try again.');
      }

      setShowSheet(false);
      setSuccessMessage(
        editingClient ? `${name.trim()} updated.` : `${name.trim()} added to your clients.`,
      );
      window.setTimeout(() => setSuccessMessage(null), 3500);
      await fetchClients();
    } catch (err) {
      setErrorMessage(errorText(err, 'we could not save this client. Check the details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    const confirmed = window.confirm(
      `delete ${client.name}? Their invoices stay in your workspace. This cannot be undone.`,
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
        throw new Error(data.detail || 'we could not delete this client. try again.');
      }

      setSuccessMessage(`${client.name} deleted.`);
      window.setTimeout(() => setSuccessMessage(null), 3500);
      await fetchClients();
    } catch (err) {
      setLoadError(errorText(err, 'we could not delete this client. try again.'));
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      client.name.toLowerCase().includes(query) ||
      (client.email ?? '').toLowerCase().includes(query) ||
      (client.phone ?? '').includes(query)
    );
  });

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-title-l text-ink">clients</h1>
          <p className="mt-1 text-body text-ink-soft">the people you invoice, in one place.</p>
        </div>
        <Button onClick={() => openSheet()} className="w-fit">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add client
        </Button>
      </div>

      {successMessage && (
        <div role="status" className="flex items-center gap-2 rounded-input bg-pill-paid/20 px-3 py-2 text-body text-paid-text">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {loadError}
          </span>
          <button type="button" onClick={fetchClients} className="font-bold hover:underline">
            Try again
          </button>
        </div>
      )}

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search clients"
          placeholder="Name, email or phone"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(inputClass, 'pl-9')}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading clients">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-card bg-tint" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-card border border-line-subtle bg-surface px-6 py-12 text-center">
          <BagCharacter size={80} className="mx-auto" />
          <h2 className="mt-4 text-heading text-ink">
            {searchQuery ? 'no clients match that search' : 'no clients yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-body text-ink-soft">
            {searchQuery
              ? 'Try a name, email or phone number.'
              : 'Save a client once, then draft their next invoice in under a minute.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => openSheet()} className="mt-5">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add your first client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => {
            const cleanPhone = client.phone ? client.phone.replace(/[^0-9+]/g, '') : null;
            return (
              <article
                key={client.id}
                className="flex flex-col rounded-card border border-line-subtle bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-body font-extrabold text-ink">
                      {client.name.trim().charAt(0).toUpperCase() || <Users className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-heading text-ink">{client.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                        <span className="rounded-full bg-tint px-2 py-0.5 font-extrabold text-ink-soft">
                          {client.preferred_currency}
                        </span>
                        <span>net {client.default_payment_terms_days} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => openSheet(client)}
                      aria-label={`Edit ${client.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-tint hover:text-ink"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(client)}
                      aria-label={`Delete ${client.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-pill-late/40 hover:text-late-text"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 min-h-14 space-y-1.5 text-body text-ink-soft">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-ink">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="truncate">{client.email}</span>
                    </a>
                  ) : (
                    <p className="text-caption font-bold text-ink-muted">WhatsApp only</p>
                  )}
                  {client.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span className="truncate">{client.phone}</span>
                      </span>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-caption font-bold text-link hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {client.address && (
                    <p className="flex items-start gap-2 text-caption text-ink-muted">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{client.address}</span>
                    </p>
                  )}
                </div>

                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line-subtle pt-3">
                  <div>
                    <dt className="text-caption text-ink-muted">invoiced</dt>
                    <dd className="mt-0.5 text-caption font-extrabold text-ink">
                      <Money
                        amountMinor={client.total_invoiced_minor}
                        currency={client.preferred_currency}
                        context="list"
                        hideCurrencyCode
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-ink-muted">paid</dt>
                    <dd className="mt-0.5 text-caption font-extrabold text-paid-text">
                      <Money
                        amountMinor={client.total_paid_minor}
                        currency={client.preferred_currency}
                        context="list"
                        hideCurrencyCode
                      />
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-caption text-ink-muted">outstanding</dt>
                    <dd className="mt-0.5 text-caption font-extrabold text-ink">
                      <Money
                        amountMinor={client.total_outstanding_minor}
                        currency={client.preferred_currency}
                        context="list"
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

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="max-h-[92dvh] overflow-y-auto rounded-t-sheet border border-line-subtle bg-surface p-5 pb-0 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:rounded-sheet">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-title text-ink">{editingClient ? 'edit client' : 'new client'}</h2>
              <p className="mt-1 text-body text-ink-soft">
                These details fill the next invoice, so you type them once.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSheet(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-tint hover:text-ink"
              aria-label="Close"
            >
              <span aria-hidden="true" className="text-title leading-none">
                ×
              </span>
            </button>
          </div>

          <form onSubmit={handleSaveClient} className="space-y-4">
            <div>
              <label htmlFor="client-name" className={labelClass}>
                client or company name
              </label>
              <input
                id="client-name"
                type="text"
                required
                placeholder="e.g. Kofi Mensah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="client-email" className={labelClass}>
                  email <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="client-email"
                  type="email"
                  autoComplete="email"
                  placeholder="billing@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-phone" className={labelClass}>
                  phone or WhatsApp
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+234 803 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-caption text-ink-muted">
              Leave email blank if this client only uses WhatsApp.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="client-currency" className={labelClass}>
                  invoicing currency
                </label>
                <select
                  id="client-currency"
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
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
                  payment terms
                </label>
                <select
                  id="client-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(Number(e.target.value))}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="client-tax" className={labelClass}>
                  tax ID or TIN <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="client-tax"
                  type="text"
                  placeholder="e.g. VAT-987654"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="client-country" className={labelClass}>
                  country
                </label>
                <input
                  id="client-country"
                  type="text"
                  autoComplete="country"
                  placeholder="e.g. NG"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="client-address" className={labelClass}>
                billing address <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="client-address"
                type="text"
                autoComplete="street-address"
                placeholder="Street, city, state"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="client-notes" className={labelClass}>
                private notes <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="client-notes"
                rows={3}
                placeholder="Anything you want to remember about this client"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(inputClass, 'min-h-20 resize-y')}
              />
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
                {errorMessage}
              </div>
            )}

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setShowSheet(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editingClient ? 'Save changes' : 'Create client'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
