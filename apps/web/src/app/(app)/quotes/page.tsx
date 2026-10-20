'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  created_at: string;
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Conversion state
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  // New Quote Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State
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
      // Reset form
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

  // Calculations for preview in modal
  const modalSubtotalMajor = items.reduce((acc, it) => acc + (it.quantity || 1) * (it.unitPriceMajor || 0), 0);
  const modalDiscountedMajor = Math.max(0, modalSubtotalMajor - discountMajor);
  const modalTaxMajor = modalDiscountedMajor * (taxPercent / 100);
  const modalTotalMajor = modalDiscountedMajor + modalTaxMajor;
  const modalWhtMajor = modalDiscountedMajor * (whtPercent / 100);
  const modalNetMajor = Math.max(0, modalTotalMajor - modalWhtMajor);

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* Conversion Banner Feedback */}
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { label: 'All Quotes', value: '' },
          { label: 'Draft', value: 'draft' },
          { label: 'Sent', value: 'sent' },
          { label: 'Viewed', value: 'viewed' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Declined', value: 'declined' },
          { label: 'Converted', value: 'converted' },
          { label: 'Expired', value: 'expired' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-200 border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotes Table */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-neutral-50/70 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Quote #</th>
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Validity / Expiry</th>
                  <th className="py-3 px-4 font-semibold text-right">Net Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800">
                {quotes.map((q) => {
                  const isAccepted = q.status === 'accepted';
                  const isConverted = q.status === 'converted';
                  const isExpired = q.is_expired || q.status === 'expired';

                  return (
                    <tr key={q.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-neutral-900">{q.quote_number}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-900">{q.client_name || 'Unnamed Client'}</div>
                        <div className="text-xs text-neutral-400">Issued {new Date(q.issue_date).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-500' : 'text-neutral-400'}`} />
                          <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-neutral-600'}>
                            {new Date(q.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                        {isExpired && !isAccepted && !isConverted && (
                          <span className="text-[10px] text-rose-500 font-medium">Expired</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900">
                        {formatMoney(q.net_payable_minor, q.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isConverted
                              ? 'bg-purple-100 text-purple-700'
                              : isAccepted
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.status === 'declined'
                              ? 'bg-rose-100 text-rose-700'
                              : isExpired
                              ? 'bg-amber-100 text-amber-800'
                              : q.status === 'viewed'
                              ? 'bg-blue-100 text-blue-800'
                              : q.status === 'sent'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send button for draft */}
                          {q.status === 'draft' && (
                            <button
                              onClick={() => handleSend(q.id)}
                              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                            >
                              <Send className="w-3 h-3" /> Send
                            </button>
                          )}

                          {/* Share portal link */}
                          {q.share_token && (
                            <>
                              <button
                                onClick={() => handleCopy(q.id, q.share_token!)}
                                title="Copy Public Quote Link"
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                              >
                                {copiedId === q.id ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
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
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </>
                          )}

                          {/* WhatsApp Link */}
                          {q.whatsapp_share_url && (
                            <a
                              href={q.whatsapp_share_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Share on WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* 1-Click Convert to Invoice (US-QOT-03) */}
                          {isAccepted && !isConverted && (
                            <button
                              onClick={() => handleConvert(q)}
                              disabled={convertingId === q.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                            >
                              {convertingId === q.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              Convert to Invoice
                            </button>
                          )}

                          {/* Converted indicator */}
                          {isConverted && (
                            <Link
                              href="/invoices"
                              className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>View Invoice</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quote Modal Drawer */}
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
              {/* Client & Currency */}
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
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
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
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validity Days */}
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
                          : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-24 bg-neutral-50 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="Custom"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Description (e.g. Logo Design, Sprint 1)"
                        value={item.description}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].description = e.target.value;
                          setItems(copy);
                        }}
                        className="flex-1 bg-neutral-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].quantity = Math.max(1, Number(e.target.value));
                          setItems(copy);
                        }}
                        className="w-16 bg-neutral-50 border rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Price"
                        value={item.unitPriceMajor || ''}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].unitPriceMajor = Number(e.target.value);
                          setItems(copy);
                        }}
                        className="w-28 bg-neutral-50 border rounded-lg px-2 py-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments: Discount, VAT, WHT, Deposit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Discount ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={discountMajor || ''}
                    onChange={(e) => setDiscountMajor(Number(e.target.value))}
                    className="w-full bg-neutral-50 border rounded-lg px-2.5 py-1.5 text-xs text-right font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">VAT (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full bg-neutral-50 border rounded-lg px-2.5 py-1.5 text-xs text-right font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">WHT (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={whtPercent}
                    onChange={(e) => setWhtPercent(Number(e.target.value))}
                    className="w-full bg-neutral-50 border rounded-lg px-2.5 py-1.5 text-xs text-right font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Deposit (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-neutral-50 border rounded-lg px-2.5 py-1.5 text-xs text-right font-mono"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Scope Notes & Terms</label>
                <textarea
                  rows={2}
                  placeholder="Payment upon milestone completion, deliverables included, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Summary Calculations */}
              <div className="p-3 bg-neutral-50 rounded-xl border space-y-1 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Gross Total</span>
                  <span className="font-mono font-medium">{formatMoney(Math.round(modalTotalMajor * 100), currency)}</span>
                </div>
                {whtPercent > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>WHT ({whtPercent}%)</span>
                    <span className="font-mono">-{formatMoney(Math.round(modalWhtMajor * 100), currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-neutral-900 border-t pt-1">
                  <span>Net Payable</span>
                  <span className="font-mono text-emerald-600">{formatMoney(Math.round(modalNetMajor * 100), currency)}</span>
                </div>
              </div>

              {createError && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
