'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Search,
  MessageCircle,
  Trash2,
  Edit2,
  X,
  Loader2,
  Check,
  Building,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatMoney } from '@/lib/money';

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

const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: '🇳🇬 NGN (Nigerian Naira)' },
  { code: 'USD', label: '🇺🇸 USD (US Dollar)' },
  { code: 'GBP', label: '🇬🇧 GBP (British Pound)' },
  { code: 'EUR', label: '🇪🇺 EUR (Euro)' },
  { code: 'GHS', label: '🇬🇭 GHS (Ghanaian Cedi)' },
  { code: 'KES', label: '🇰🇪 KES (Kenyan Shilling)' },
  { code: 'ZAR', label: '🇿🇦 ZAR (South African Rand)' },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
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
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (currencyFilter) params.append('currency', currencyFilter);

      const url = `${API_BASE}/clients${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchQuery, currencyFilter]);

  const openCreateModal = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCountry('NG');
    setPreferredCurrency('NGN');
    setPaymentTerms(14);
    setTaxId('');
    setNotes('');
    setErrorMessage(null);
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setCountry(client.country || 'NG');
    setPreferredCurrency(client.preferred_currency || 'NGN');
    setPaymentTerms(client.default_payment_terms_days || 14);
    setTaxId(client.tax_id || '');
    setNotes(client.notes || '');
    setErrorMessage(null);
    setShowModal(true);
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
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save client');
      }

      setShowModal(false);
      setSuccessMessage(
        editingClient
          ? `Client "${name}" updated successfully`
          : `Client "${name}" created successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchClients();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving client');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setSuccessMessage(`Client "${client.name}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchClients();
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || 'Could not delete client');
      }
    } catch {
      setErrorMessage('Could not delete client');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clients</h1>
          <p className="text-sm text-neutral-500">
            Client directory, preferred invoicing currencies, and default terms (US-CLI-01, US-CLI-02).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by client name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-sm bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Currencies</option>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="py-12 flex justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
          <Users className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-semibold text-neutral-800 text-base">No clients found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Save client details with their preferred currency and payment terms so invoices can be drafted in under 60 seconds.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Client
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {clients.map((client) => {
            const cleanPhone = client.phone ? client.phone.replace(/[^0-9+]/g, '') : null;
            return (
              <div
                key={client.id}
                className="p-5 bg-white rounded-xl border shadow-sm space-y-4 hover:border-neutral-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">{client.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 rounded text-neutral-700">
                        {client.preferred_currency}
                      </span>
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Net-{client.default_payment_terms_days} days
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(client)}
                      title="Edit client"
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client)}
                      title="Delete client"
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-neutral-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600">
                  {client.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{client.email}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 font-medium">
                      📱 Phone-only / WhatsApp client (no email)
                    </div>
                  )}

                  {client.phone && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{client.phone}</span>
                      </div>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  {client.address && (
                    <div className="text-[11px] text-neutral-500">
                      📍 {client.address}
                    </div>
                  )}
                </div>

                {/* Lifetime Metrics Summary (US-CLI-02) */}
                <div className="pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Invoiced</span>
                    <span className="font-semibold text-neutral-800">
                      {formatMoney(client.total_invoiced_minor, client.preferred_currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Paid</span>
                    <span className="font-semibold text-emerald-700">
                      {formatMoney(client.total_paid_minor, client.preferred_currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Outstanding</span>
                    <span className="font-bold text-neutral-900">
                      {formatMoney(client.total_outstanding_minor, client.preferred_currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal (US-CLI-01) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-neutral-900">
                {editingClient ? 'Edit Client Record' : 'Add New Client'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Global Inc. or Kofi Mensah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="billing@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Leave blank for WhatsApp-only</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+234 803 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Invoicing Currency *
                  </label>
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-neutral-800"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Default Payment Terms (Days)
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-neutral-800"
                  >
                    <option value={0}>Due on Receipt</option>
                    <option value={7}>Net 7 days</option>
                    <option value={14}>Net 14 days (Default)</option>
                    <option value={30}>Net 30 days</option>
                    <option value={60}>Net 60 days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Tax ID / TIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VAT-987654"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NG, US, GH, KE"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Billing Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State/Province"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Private Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes about this client..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs text-neutral-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
