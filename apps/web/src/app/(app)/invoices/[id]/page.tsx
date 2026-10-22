'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Money } from '@/components/money/Money';
import { InvoiceDocument } from '@/components/invoice';
import { StatusPill } from '@/components/status';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  ReceiptText,
  Send,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PaymentClaim {
  id: string;
  amount_minor: number;
  payment_date: string;
  reference?: string | null;
  proof_file_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string | null;
  client_email?: string | null;
  currency: string;
  status: string;
  user_facing_status?: string | null;
  remaining_minor?: number;
  issue_date: string;
  due_date: string;
  items: Array<{
    id: string;
    position?: number;
    description: string;
    quantity: number;
    unit_price_minor: number;
    total_minor: number;
  }>;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  wht_minor?: number;
  net_payable_minor?: number;
  amount_paid_minor: number;
  notes?: string | null;
  share_token?: string | null;
  latest_claim?: PaymentClaim | null;
  latest_receipt?: {
    id: string;
    receipt_number: string;
    amount_paid_minor: number;
    balance_remaining_minor?: number;
    payment_date?: string;
    payment_method?: string;
    reference?: string | null;
    confirmation_source?: string;
    provider?: string | null;
    verification_code?: string;
    share_token?: string | null;
  } | null;
  created_at: string;
}

const PAYMENT_METHODS = ['bank_transfer', 'card', 'mobile_money', 'cash', 'manual'];

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingClaimId, setConfirmingClaimId] = useState<string | null>(null);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invoiceRes, eventsRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE}/invoices/${invoiceId}`, { credentials: 'include' }),
        fetch(`${API_BASE}/invoices/${invoiceId}/status-events`, { credentials: 'include' }),
        fetch(`${API_BASE}/invoices/${invoiceId}/claims`, { credentials: 'include' }),
      ]);

      if (!invoiceRes.ok) {
        const err = await invoiceRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Invoice could not be loaded');
      }

      const invoiceData: InvoiceDetail = await invoiceRes.json();
      setInvoice(invoiceData);
      setEvents(eventsRes.ok ? await eventsRes.json() : []);
      setClaims(claimsRes.ok ? await claimsRes.json() : []);
    } catch (err: any) {
      setError(err.message || 'Invoice could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId]);

  const copyShareLink = () => {
    if (!invoice?.share_token) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${shareUrl}/i/${invoice.share_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openReceiptModal = () => {
    if (!invoice) return;
    const payable = invoice.net_payable_minor || invoice.total_minor;
    setAmount((Math.max(0, payable - invoice.amount_paid_minor) / 100).toFixed(2));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('bank_transfer');
    setReference('');
    setConfirmed(false);
    setFormError(null);
    setShowReceiptModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setFormError('Confirm that the funds have arrived before recording this payment.');
      return;
    }
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setFormError('Enter a valid amount received.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const res = await fetch(`${API_BASE}/receipts/invoice/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount_paid_minor: amountMinor,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
          confirm_received: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to record payment');
      }

      setShowReceiptModal(false);
      await loadInvoice();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClaim = async (claim: PaymentClaim) => {
    try {
      setConfirmingClaimId(claim.id);
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/claims/${claim.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to confirm claim');
      }
      await loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm claim');
    } finally {
      setConfirmingClaimId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-lg font-bold text-neutral-900">Invoice unavailable</h1>
        <p className="mt-1 text-sm text-neutral-500">{error || 'Invoice not found.'}</p>
        <Link href="/invoices" className="mt-4 inline-flex text-sm font-semibold text-emerald-700">
          Back to invoices
        </Link>
      </div>
    );
  }

  const netPayable = invoice.net_payable_minor || invoice.total_minor;
  const balanceMinor = Math.max(0, netPayable - invoice.amount_paid_minor);
  const pendingClaims = claims.filter((claim) => claim.status === 'pending');
  const displayStatus = invoice.user_facing_status || invoice.status;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All invoices
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900">{invoice.invoice_number}</h1>
            <StatusPill
              status={invoice.status}
              labelOverride={invoice.user_facing_status}
              subLabel={
                ['issued', 'sent', 'viewed'].includes(invoice.status)
                  ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
                  : undefined
              }
            />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {invoice.client_name || 'Client'} · Due {invoice.due_date}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.share_token && (
            <>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <Link
                href={`/i/${invoice.share_token}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Client view
              </Link>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${invoice.client_name || 'there'}, here is invoice ${invoice.invoice_number}: ${
                    typeof window !== 'undefined' ? window.location.origin : ''
                  }/i/${invoice.share_token}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </>
          )}
          {!['paid', 'cancelled'].includes(invoice.status) && (
            <button
              type="button"
              onClick={openReceiptModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <ReceiptText className="h-3.5 w-3.5" /> Record payment
            </button>
                ))}
          </div>

        <aside className="space-y-6">

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* InvoiceDocument (issuer variant) */}
          <InvoiceDocument
            variant="issuer"
            invoice={{
              ...invoice,
              remaining_minor: invoice.remaining_minor,
            }}
          />

          {/* Pending Claims */}
          {pendingClaims.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-bold text-amber-950">Payments awaiting your confirmation</h2>
              <p className="mt-1 text-xs text-amber-800">
                The client submitted these claims. Check your bank or mobile money account before confirming.
              </p>
              <div className="mt-3 space-y-2">
                {pendingClaims.map((claim) => (
                  <div key={claim.id} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-neutral-900">
                        <Money amountMinor={claim.amount_minor} currency={invoice.currency} />
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Claimed {claim.payment_date}
                        {claim.reference ? ` · Ref ${claim.reference}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmClaim(claim)}
                      disabled={confirmingClaimId === claim.id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {confirmingClaimId === claim.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Confirm funds received
                    </button>
                  </div>
                )}
          </div>
            {invoice.notes && (
              <div className="rounded-xl border bg-white p-5">
                <h2 className="text-sm font-bold text-neutral-900">Notes</h2>
                <p className="mt-1 whitespace-pre-line text-xs text-neutral-600">{invoice.notes}</p>
              </div>
            )}
          </div>
                ))}
          </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-bold text-neutral-900">Status history</h2>
            </div>
            <div className="mt-4">
              {/* Timeline placeholder - events come from API */}
              {events.length === 0 ? (
                <div className="text-xs text-neutral-500 text-center py-8">
                  No status history available
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-neutral-900">
                          {event.source.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-neutral-400">{event.to_status}</span>
                      </div>
                      {event.event_metadata && (
                        <div className="ml-8 text-[10px] text-neutral-500">
                          {JSON.stringify(event.event_metadata)}
                        </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {invoice.latest_receipt?.share_token && (
            <Link
              href={`/r/${invoice.latest_receipt.share_token}`}
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Official receipt
              </span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}

          <div className="rounded-xl border bg-white p-5 text-xs text-neutral-600">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <CreditCard className="h-4 w-4 text-neutral-400" /> Payment details
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between gap-3">
                <span>Issued</span>
                <span className="font-medium text-neutral-900">{invoice.issue_date}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Due</span>
                <span className="font-medium text-neutral-900">{invoice.due_date}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Amount paid</span>
                <span className="font-medium text-neutral-900">
                  <Money amountMinor={invoice.amount_paid_minor} currency={invoice.currency} />
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Outstanding</span>
                <span className="font-medium text-neutral-900">
                  <Money amountMinor={balanceMinor} currency={invoice.currency} />
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Record Payment Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleRecordPayment}
            className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Record payment received</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Only record this after the funds have arrived. This issues an official receipt and marks the invoice paid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Amount received ({invoice.currency})</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="mt-1 block text-[11px] text-neutral-400">
                Outstanding balance: <Money amountMinor={balanceMinor} currency={invoice.currency} />
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-700">Payment date</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-700">Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Reference (optional)</span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Bank session ID or transfer reference"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600"
              />
              <span>I confirm I have verified that these funds were received in my account.</span>
            </label>

            {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm payment received
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
