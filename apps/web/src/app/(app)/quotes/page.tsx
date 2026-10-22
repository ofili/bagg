'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import { StatusPill } from '@/components/status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import {
  Plus,
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  FileCheck,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Trash2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ClientItem {
  id: string;
  name: string;
  preferred_currency: string;
}

interface QuoteLineItem {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

interface Quote {
  id: string;
  quote_number: string;
  sequence_number: number;
  client_id: string;
  client_name?: string | null;
  currency: string;
  status: string;
  effective_status?: string | null;
  is_expired: boolean;
  issue_date: string;
  expires_at: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  wht_minor: number;
  net_payable_minor: number;
  deposit_percentage?: number | null;
  deposit_amount_minor?: number | null;
  notes?: string | null;
  share_token?: string | null;
  share_url?: string | null;
  whatsapp_share_url?: string | null;
  accepted_by_name?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  created_at: string;
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [validityDays, setValidityDays] = useState(14);
  const [discountMajor, setDiscountMajor] = useState(0);
  const [taxPercent, setTaxPercent] = useState(7.5);
  const [whtPercent, setWhtPercent] = useState(0);
  const [depositPercent, setDepositPercent] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPriceMajor: number }>>([
    { description: '', quantity: 1, unitPriceMajor: 0 },
  ]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/quotes${q}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        if (data.length > 0 && !selectedClientId) {
          setSelectedClientId(data[0].id);
          setCurrency(data[0].preferred_currency || 'NGN');
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchClients();
  }, [statusFilter]);

  const handleCopy = (id: string, shareToken: string) => {
    const url = `${window.location.origin}/q/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSend = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/quotes/${id}/send`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        fetchQuotes();
      }
    } catch {
      // Fallback
    }
  };

  const handleConvert = async (quote: Quote) => {
    try {
      setConvertingId(quote.id);
      setConvertError(null);
      setConvertSuccess(null);
      const res = await fetch(`${API_BASE}/quotes/${quote.id}/convert`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setConvertError(err.detail || 'Failed to convert quote to invoice.');
        return;
      }
      const inv = await res.json();
      setConvertSuccess(`Successfully converted quote ${quote.quote_number} to invoice ${inv.invoice_number}!`);
      fetchQuotes();
      setTimeout(() => {
        router.push('/invoices');
      }, 1500);
    } catch {
      setConvertError('Network error while converting quote.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPriceMajor: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setCreateError('Please select a client.');
      return;
    }
    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setCreateError('Please add at least one line item with a description.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const payload = {
        client_id: selectedClientId,
        currency,
        validity_days: validityDays,
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: it.quantity,
          unit_price_minor: Math.round(it.unitPriceMajor * 100),
        })),
        discount_minor: Math.round(discountMajor * 100),
        tax_rate_percent: taxPercent,
        wht_rate_percent: whtPercent,
        deposit_percentage: depositPercent !== '' ? Number(depositPercent) : null,
        notes: notes.trim() || null,
      };

      const res = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.detail || 'Failed to create quote.');
        return;
      }

      setShowCreateModal(false);
      setItems([{ description: '', quantity: 1, unitPriceMajor: 0 }]);
      setDiscountMajor(0);
      setNotes('');
      fetchQuotes();
    } catch {
      setCreateError('Network error while creating quote.');
    } finally {
      setCreating(false);
    }
  };

  const modalSubtotalMajor = items.reduce((acc, it) => acc + (it.quantity || 1) * (it.unitPriceMajor || 0), 0);
  const modalDiscountedMajor = Math.max(0, modalSubtotalMajor - discountMajor);
  const modalTaxMajor = modalDiscountedMajor * (taxPercent / 100);
  const modalTotalMajor = modalDiscountedMajor + modalTaxMajor;
  const modalWhtMajor = modalDiscountedMajor * (whtPercent / 100);
  const modalNetMajor = Math.max(0, modalTotalMajor - modalWhtMajor);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Quotes & Estimates</h1>
          <p className="text-sm text-neutral-500">
            Pitch projects with clear expiration dates and convert accepted estimates into invoices with 1 click.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Create Quote
        </button>
      </div>

      {convertSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{convertSuccess} Redirecting to Invoices...</span>
          </div>
          <Link href="/invoices" className="text-xs font-bold underline">
            View Invoices
          </Link>
        </div>
      )}

      {convertError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{convertError}</span>
        </div>
      )}

      <ChipStrip
        chips={[
          { value: '', label: 'All', count: quotes.length },
          { value: 'draft', label: 'Draft', count: quotes.filter((q) => q.status === 'draft').length },
          { value: 'sent', label: 'Sent', count: quotes.filter((q) => q.status === 'sent').length },
          { value: 'viewed', label: 'Viewed', count: quotes.filter((q) => q.status === 'viewed').length },
          { value: 'accepted', label: 'Accepted', count: quotes.filter((q) => q.status === 'accepted').length },
          { value: 'declined', label: 'Declined', count: quotes.filter((q) => q.status === 'declined').length },
          { value: 'converted', label: 'Converted', count: quotes.filter((q) => q.status === 'converted').length },
          { value: 'expired', label: 'Expired', count: quotes.filter((q) => q.is_expired).length },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
            Loading quotes...
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No quotes found</h3>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-4">
              {statusFilter
                ? `No quotes found matching the '${statusFilter}' filter.`
                : 'Create your first project quote with custom validity and upfront deposits.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Draft New Quote
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-6 lg:p-8">
            {quotes.map((q) => {
              const effectiveStatus = q.effective_status || q.status;
              const isAccepted = q.status === 'accepted';
              const isConverted = q.status === 'converted';
              const isExpired = q.is_expired || effectiveStatus === 'expired';

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-neutral-900">{q.quote_number}</span>
                        {isExpired && !isAccepted && !isConverted && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                        <span>{q.client_name || 'Unnamed Client'}</span>
                        <span className="mx-0.5">•</span>
                        <span>Issued {new Date(q.issue_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                        <Clock className={`w-3 h-3 ${isExpired ? 'text-rose-500' : 'text-neutral-400'}`} />
                        <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-neutral-600'}>
                          Valid until {new Date(q.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      <StatusPill status={effectiveStatus} className="mt-2 inline-block" />
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black tracking-tight text-neutral-900">
                        {formatMoney(q.net_payable_minor, q.currency)}
                      </div>
                      <div className="text-xs text-neutral-500">Net Payable</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {q.status === 'draft' && (
                        <button
                          onClick={() => handleSend(q.id)}
                          className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition"
                          title="Send quote"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      )}
                      {q.share_token && (
                        <>
                          <button
                            onClick={() => handleCopy(q.id, q.share_token!)}
                            title="Copy Public Quote Link"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                          >
                            {copiedId === q.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <Link
                            href={`/q/${q.share_token}`}
                            target="_blank"
                            title="Preview Client View"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </>
                      )}
                      {q.whatsapp_share_url && (
                        <a
                          href={q.whatsapp_share_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Share on WhatsApp"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                      {isAccepted && !isConverted && (
                        <button
                          onClick={() => handleConvert(q)}
                          disabled={convertingId === q.id}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1"
                          title="Convert to Invoice"
                        >
                          {convertingId === q.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      {isConverted && (
                        <Link
                          href={q.invoice_id ? `/invoices/${q.invoice_id}` : '/invoices'}
                          className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-lg transition flex items-center gap-1"
                          title="View Invoice"
                        >
                          <span>{q.invoice_number || 'View Invoice'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-neutral-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h3 className="text-lg font-bold">Draft New Quote</h3>
                <p className="text-xs text-neutral-500">Create an official estimate with expiration date and terms.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuote} className="space-y-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'].map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Validity Duration (Days until Offer Expires)
                </label>
                <div className="flex items-center gap-3">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setValidityDays(days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        validityDays === days
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 hover:bg-neutral-100 border-neutral-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Line Items</label>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].description = e.target.value;
                          setItems(next);
                        }}
                        className="px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].quantity = Number(e.target.value) || 1;
                          setItems(next);
                        }}
                        className="px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={it.unitPriceMajor}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].unitPriceMajor = Number(e.target.value) || 0;
                          setItems(next);
                        }}
                        className="px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-emerald-500"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="px-2 py-1.5 text-neutral-500 hover:text-neutral-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Discount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={discountMajor}
                    onChange={(e) => setDiscountMajor(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Tax %</label>
                  <input
                    type="number"
                    placeholder="7.5"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">WHT %</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={whtPercent}
                    onChange={(e) => setWhtPercent(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Deposit %</label>
                <input
                  type="number"
                  placeholder="0"
                  value={depositPercent === '' ? '' : depositPercent}
                  onChange={(e) => setDepositPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500"
                />
              </div>

              {createError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 border rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition"
                >
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
