'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import { AmountBand, StatusPill, type ReceiptInfo } from '@/components/status';
import {
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  FileDown,
  Plus,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { InvoiceCard } from '@/components/mobile/InvoiceCard';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MoneyInput } from '@/components/mobile/MoneyInput';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PaymentClaim {
  id: string;
  invoice_id: string;
  amount_minor: number;
  payment_date: string;
  reference?: string | null;
  proof_file_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string | null;
  currency: string;
  total_minor: number;
  amount_paid_minor: number;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'issued' | 'sent' | 'viewed' | 'payment_claimed' | 'partially_paid' | 'paid' | 'cancelled';
  effective_status?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  payment_state?: string;
  share_token?: string | null;
  latest_claim?: PaymentClaim | null;
  latest_receipt?: ReceiptInfo | null;
  created_at: string;
}

const FILTER_CHIPS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'issued', label: 'Issued' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'payment_claimed', label: 'Claimed' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Claim Review State (US-CLM-02)
  const [reviewingInvoice, setReviewingInvoice] = useState<Invoice | null>(null);
  const [claimsList, setClaimsList] = useState<PaymentClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (currencyFilter) params.set('currency', currencyFilter);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`${API_BASE}/invoices${queryStr}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, currencyFilter]);

  const handleOpenReview = async (inv: Invoice) => {
    setReviewingInvoice(inv);
    setShowRejectInput(false);
    setShowPartialInput(false);
    setRejectReason('');
    setPartialAmount('');
    setActionError(null);
    setLoadingClaims(true);

    try {
      const res = await fetch(`${API_BASE}/invoices/${inv.id}/claims`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClaimsList(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleConfirmFull = async (claimId: string) => {
    if (!reviewingInvoice) return;
    setProcessingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/invoices/${reviewingInvoice.id}/claims/${claimId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to confirm claim');
      setReviewingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setActionError(err.message || 'Error confirming payment');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmPartial = async (claimId: string) => {
    if (!reviewingInvoice) return;
    const amountVal = parseFloat(partialAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setActionError('Please enter a valid partial amount.');
      return;
    }
    const minorVal = Math.round(amountVal * 100);

    setProcessingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/invoices/${reviewingInvoice.id}/claims/${claimId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount_paid_minor: minorVal }),
      });
      if (!res.ok) throw new Error('Failed to confirm partial payment');
      setReviewingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setActionError(err.message || 'Error confirming partial payment');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    if (!reviewingInvoice) return;
    if (!rejectReason.trim()) {
      setActionError('Please provide an explanation for rejecting this payment claim.');
      return;
    }

    setProcessingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/invoices/${reviewingInvoice.id}/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejection_reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error('Failed to reject claim');
      setReviewingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setActionError(err.message || 'Error rejecting claim');
    } finally {
      setProcessingAction(false);
    }
  };

  const isInvoiceOverdue = (inv: Invoice) => {
    if (typeof inv.is_overdue === 'boolean') return inv.is_overdue;
    if (['paid', 'draft', 'cancelled'].includes(inv.status)) return false;
    const due = new Date(inv.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handleWhatsAppNudge = async (inv: Invoice) => {
    try {
      const res = await fetch(`${API_BASE}/reminders/invoices/${inv.id}/nudge/whatsapp`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.whatsapp_url, '_blank');
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/i/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (currencyFilter && inv.currency !== currencyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8 max-w-none w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500">
            Create, track, and manage client invoices with automated numbering and minor-unit math.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Overdue Alert Banner */}
      {filteredInvoices.filter(isInvoiceOverdue).length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="flex-1 min-w-0 truncate">
              You have <strong>{filteredInvoices.filter(isInvoiceOverdue).length} overdue invoice(s)</strong>.
              Send a 1-tap polite nudge on WhatsApp to get paid faster.
            </span>
          </div>
          <button
            onClick={() => setCurrencyFilter('')}
            className="ml-2 text-[11px] font-bold text-emerald-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Chip Strip */}
      <ChipStrip
        chips={FILTER_CHIPS.map((c) => ({
          ...c,
          count: filteredInvoices.filter((inv) => {
            if (c.value === 'overdue') return isInvoiceOverdue(inv);
            return inv.status === c.value;
          }).length,
        }))}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <label className="text-[11px] text-neutral-400 font-normal">Currency:</label>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="min-h-[40px] px-3 py-1.5 text-xs font-medium border rounded-lg bg-white text-neutral-800 focus:ring-1 focus:ring-emerald-500 shadow-sm"
        >
          <option value="">All Currencies</option>
          <option value="NGN">NGN (₦)</option>
          <option value="USD">USD ($)</option>
          <option value="GBP">GBP (£)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GHS">GHS (GH₵)</option>
          <option value="KES">KES (KSh)</option>
          <option value="ZAR">ZAR (R)</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-semibold text-neutral-800 text-base">No invoices found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {statusFilter
              ? `No invoices currently in "${statusFilter}" status.`
              : 'Create your first invoice in under 60 seconds. Bagg auto-assigns sequential numbering.'}
          </p>
          <Link
            href="/invoices/new"
            className="w-full inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create New Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              id={inv.id}
              invoiceNumber={inv.invoice_number}
              clientName={inv.client_name}
              currency={inv.currency}
              totalMinor={inv.total_minor}
              amountPaidMinor={inv.amount_paid_minor}
              status={inv.status}
              effectiveStatus={inv.effective_status}
              isOverdue={isInvoiceOverdue(inv)}
              daysOverdue={inv.days_overdue || 0}
              paymentState={inv.payment_state}
              shareToken={inv.share_token}
              latestReceipt={inv.latest_receipt}
              dueDate={inv.due_date}
            />
          ))}
        </div>
      )}

      {/* Claim Review Bottom Sheet */}
      {reviewingInvoice && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="hidden" />
          </SheetTrigger>
          <SheetContent
            className="rounded-2xl border border-neutral-200 bg-white shadow-xl max-h-[90dvh]"
          >
            <div className="flex justify-between items-start border-b border-neutral-100 px-4 py-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  Review Payment Claim ({reviewingInvoice.invoice_number})
                </h3>
                <p className="text-xs text-neutral-500">
                  Client: <strong>{reviewingInvoice.client_name || 'Client'}</strong> &bull; Total: {formatMoney(reviewingInvoice.total_minor, reviewingInvoice.currency)}
                </p>
              </div>
              <button
                onClick={() => setReviewingInvoice(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="px-4 py-2 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {actionError}
              </div>
            )}

            <div className="p-4">
              {loadingClaims ? (
                <div className="py-6 flex justify-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : claimsList.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No payment claims on record.</p>
              ) : (
                <div className="space-y-3">
                  {claimsList.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 bg-neutral-50 rounded-xl border space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-900 text-sm">
                          {formatMoney(claim.amount_minor, reviewingInvoice.currency)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          claim.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {claim.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
                        <div>
                          <span className="text-neutral-400 block">Payment Date</span>
                          <span>{claim.payment_date}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block">Reference / Session ID</span>
                          <span className="font-mono font-medium text-neutral-800">
                            {claim.reference || 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => handleConfirmFull(claim.id)}
                          disabled={processingAction}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                        >
                          {processingAction ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Confirm Funds Received
                        </button>
                      </div>

                      {claim.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPartialInput(false);
                              setShowRejectInput(true);
                              setRejectReason('');
                            }}
                            className="text-[11px] text-amber-600 hover:text-amber-800 font-medium py-1"
                          >
                            Confirm Partial Amount
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPartialInput(false);
                              setShowRejectInput(false);
                              setRejectReason('');
                              setActionError(null);
                            }}
                            className="text-[11px] text-neutral-500 hover:text-neutral-700 font-medium py-1"
                          >
                            Dismiss
                          </button>
                        </>
                      )}

                      {showPartialInput && (
                        <div className="mt-3 space-y-2">
                          <MoneyInput
                            id="partial-amount"
                            label="Partial amount to confirm"
                            value={partialAmount}
                            onChange={setPartialAmount}
                            currencySymbol={reviewingInvoice.currency === 'NGN' ? '₦' : ''}
                            placeholder="0.00"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmPartial(claim.id)}
                              disabled={processingAction}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 transition"
                            >
                              Confirm Partial
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPartialInput(false)}
                              className="flex-1 py-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {showRejectInput && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-[11px] font-medium text-neutral-700">
                            Rejection Reason
                          </label>
                          <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain why the claim is being rejected..."
                            className="min-h-[60px] w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRejectClaim(claim.id)}
                              disabled={processingAction}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition"
                            >
                              Reject Claim
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowRejectInput(false)}
                              className="flex-1 py-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
