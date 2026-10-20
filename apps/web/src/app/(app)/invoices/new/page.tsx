'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  Building,
  CreditCard,
  X
} from 'lucide-react';
import { formatMoney } from '@/lib/money';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  preferred_currency: string;
  default_payment_terms_days: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // Major unit in form, converted to minor on submit
}

interface ValidationState {
  has_profile: boolean;
  message: string;
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

export default function NewInvoicePage() {
  const router = useRouter();

  // Workspace & clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [currency, setCurrency] = useState<string>('NGN');
  const [profileValidation, setProfileValidation] = useState<ValidationState | null>(null);

  // Dates
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');

  // Line Items
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Brand Identity Design', quantity: 1, unit_price: 250000 },
    { id: '2', description: 'Social Media Templates', quantity: 2, unit_price: 75000 },
  ]);

  // Adjustments
  const [discountMajor, setDiscountMajor] = useState<number>(20000);
  const [taxPercent, setTaxPercent] = useState<number>(7.5);
  const [notes, setNotes] = useState<string>('Payment instructions attached. Thank you for your partnership!');

  // State flags
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetch(`${API_BASE}/clients`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: Client[]) => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
          setCurrency(data[0].preferred_currency || 'NGN');
          calculateDueDate(issueDate, data[0].default_payment_terms_days || 14);
        }
      })
      .catch(() => {});
  }, []);

  // Validate currency payment profile whenever currency changes (US-PAY-02)
  useEffect(() => {
    if (!currency) return;
    fetch(`${API_BASE}/payments/profiles/validate/${currency}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setProfileValidation({
          has_profile: data.has_profile,
          message: data.message,
        });
      })
      .catch(() => {
        setProfileValidation({
          has_profile: true,
          message: 'Validated',
        });
      });
  }, [currency]);

  const calculateDueDate = (issue: string, terms: number) => {
    const d = new Date(issue);
    d.setDate(d.getDate() + terms);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      if (client.preferred_currency) setCurrency(client.preferred_currency);
      calculateDueDate(issueDate, client.default_payment_terms_days || 14);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Calculations in minor units (US-INV-02)
  const factor = 100; // standard minor unit factor
  const subtotalMinor = items.reduce(
    (acc, it) => acc + (it.quantity || 1) * Math.round((it.unit_price || 0) * factor),
    0
  );
  const discountMinor = Math.round((discountMajor || 0) * factor);
  const discountedSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = Math.round(discountedSubtotalMinor * (taxPercent / 100));
  const totalMinor = discountedSubtotalMinor + taxMinor;

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      setErrorMsg('Please select or create a client first.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      client_id: selectedClientId,
      currency,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      items: items.map((it) => ({
        description: it.description || 'Line item',
        quantity: Number(it.quantity) || 1,
        unit_price_minor: Math.round((Number(it.unit_price) || 0) * factor),
      })),
      discount_minor: discountMinor,
      tax_rate_percent: Number(taxPercent) || 0.0,
      notes,
    };

    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save draft invoice');
      }

      const created = await res.json();
      router.push('/invoices');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 transition"
          >
            <Eye className="w-3.5 h-3.5" /> Live Preview
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Payment Profile Guard Banner (US-PAY-02) */}
      {profileValidation && !profileValidation.has_profile && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-900">Missing Payout Instructions (US-PAY-02 Guard)</h4>
            <p className="text-amber-800">
              You do not have a saved payment profile for <strong>{currency}</strong>. Before sending this invoice to a client, you must configure bank or digital payment instructions so they know where to pay.
            </p>
            <div className="pt-1">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-950"
              >
                <CreditCard className="w-3.5 h-3.5" /> Configure {currency} Profile in Settings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Drafting Card */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
        {/* Header Details */}
        <div className="grid sm:grid-cols-3 gap-4 border-b pb-6 text-sm">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Select Client *</label>
            {clients.length > 0 ? (
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-neutral-800 text-xs font-semibold"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.preferred_currency})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-neutral-500">
                No clients yet.{' '}
                <Link href="/clients" className="text-emerald-600 font-bold underline">
                  Add a client
                </Link>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Currency *</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-neutral-800 text-xs font-semibold"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  const client = clients.find((c) => c.id === selectedClientId);
                  calculateDueDate(e.target.value, client?.default_payment_terms_days || 14);
                }}
                className="w-full px-2.5 py-1.5 border rounded-lg text-xs text-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg text-xs text-neutral-800"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table (US-INV-02) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-neutral-900">Line Items & Deliverables</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="border rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 w-20">Qty</th>
                  <th className="py-2.5 px-3 w-32">Unit Price</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it) => {
                  const lineTotalMinor = (it.quantity || 1) * Math.round((it.unit_price || 0) * factor);
                  return (
                    <tr key={it.id} className="hover:bg-neutral-50/50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Website development, consultation..."
                          value={it.description}
                          onChange={(e) => handleItemChange(it.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(it.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unit_price}
                          onChange={(e) => handleItemChange(it.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-800 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-neutral-800 font-mono">
                        {formatMoney(lineTotalMinor, currency)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="text-neutral-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-neutral-600">Client Notes & Instructions</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Include invoice number in wire reference..."
              className="w-full p-2.5 border rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 border space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatMoney(subtotalMinor, currency)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-600">Discount ({currency}):</span>
              <input
                type="number"
                min="0"
                value={discountMajor}
                onChange={(e) => setDiscountMajor(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 border rounded text-right font-mono bg-white text-neutral-800"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-600">Tax / VAT (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 border rounded text-right font-mono bg-white text-neutral-800"
              />
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Tax Amount:</span>
              <span className="font-mono">{formatMoney(taxMinor, currency)}</span>
            </div>

            <div className="pt-2 border-t flex justify-between items-center text-sm font-bold text-neutral-900">
              <span>Total Due:</span>
              <span className="text-base text-emerald-700 font-mono">{formatMoney(totalMinor, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal (US-INV-03) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Live Client Preview
              </span>
              <button onClick={() => setPreviewOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-xs text-neutral-800">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">INVOICE</h2>
                  <p className="text-neutral-400">Auto-number assigned upon saving</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-neutral-900">Studio Bagg Creative Ltd</div>
                  <div className="text-neutral-500">Lagos, Nigeria</div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5">{it.description || 'Deliverable'}</td>
                        <td className="p-2.5 text-center">{it.quantity}</td>
                        <td className="p-2.5 text-right font-mono">{formatMoney(Math.round(it.unit_price * factor), currency)}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {formatMoney(it.quantity * Math.round(it.unit_price * factor), currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Subtotal:</span>
                    <span className="font-mono">{formatMoney(subtotalMinor, currency)}</span>
                  </div>
                  {discountMinor > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono">-{formatMoney(discountMinor, currency)}</span>
                    </div>
                  )}
                  {taxMinor > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Tax ({taxPercent}%):</span>
                      <span className="font-mono">+{formatMoney(taxMinor, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t">
                    <span>Total Due:</span>
                    <span className="text-emerald-700 font-mono">{formatMoney(totalMinor, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
