'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
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
  AlertCircle
} from 'lucide-react';

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
  status: 'draft' | 'sent' | 'viewed' | 'payment_claimed' | 'partially_paid' | 'paid' | 'cancelled';
  share_token?: string | null;
  latest_claim?: PaymentClaim | null;
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
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
      const url = statusFilter
        ? `${API_BASE}/invoices?status=${statusFilter}`
        : `${API_BASE}/invoices`;
      const res = await fetch(url, { credentials: 'include' });
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
  }, [statusFilter]);

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
      setActionError(err.message || 'Error rejecting payment claim');
    } finally {
      setProcessingAction(false);
    }
  };

  const isInvoiceOverdue = (inv: Invoice) => {
    if (['paid', 'payment_claimed', 'draft', 'cancelled'].includes(inv.status)) return false;
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

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Paid</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Partial</span>;
      case 'payment_claimed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
            Claimed
          </span>
        );
      case 'viewed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">Viewed</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Sent</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500">
            Create, track, and manage client invoices with automated numbering and minor-unit math.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Overdue Alert Banner (US-REM-02) */}
      {invoices.filter(isInvoiceOverdue).length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have <strong>{invoices.filter(isInvoiceOverdue).length} overdue invoice(s)</strong>. Send a 1-tap polite nudge on WhatsApp to get paid faster.
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold text-neutral-600">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === '' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          All Invoices
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'draft' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setStatusFilter('sent')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'sent' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Sent / Unpaid
        </button>
        <button
          onClick={() => setStatusFilter('payment_claimed')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'payment_claimed' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Payment Claimed
        </button>
        <button
          onClick={() => setStatusFilter('paid')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'paid' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Paid
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-semibold text-neutral-800 text-base">No invoices found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {statusFilter
              ? `No invoices currently in "${statusFilter}" status.`
              : 'Create your first invoice in under 60 seconds. Bagg auto-assigns sequential numbering.'}
          </p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create New Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b text-neutral-500 font-medium text-xs">
                <tr>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition">
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-800">
                      {inv.client_name || 'Client'}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
                      {inv.issue_date}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
                      {inv.due_date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      {formatMoney(inv.total_minor, inv.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {isInvoiceOverdue(inv) && (
                        <button
                          onClick={() => handleWhatsAppNudge(inv)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold shadow-sm inline-flex items-center gap-1 transition mr-1"
                          title="Send 1-tap WhatsApp nudge to client"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Nudge
                        </button>
                      )}

                      {inv.status === 'payment_claimed' && (
                        <button
                          onClick={() => handleOpenReview(inv)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-bold shadow-sm inline-flex items-center gap-1 transition mr-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Review Claim
                        </button>
                      )}

                      {inv.share_token && (
                        <>
                          <button
                            onClick={() => handleCopyLink(inv.share_token!, inv.id)}
                            title="Copy Share Link"
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `Hi, here is your invoice ${inv.invoice_number} for ${formatMoney(
                                inv.total_minor,
                                inv.currency
                              )}: ${typeof window !== 'undefined' ? window.location.origin : ''}/i/${inv.share_token}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Share to WhatsApp"
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition inline-flex items-center"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          <Link
                            href={`/i/${inv.share_token}`}
                            target="_blank"
                            title="View Public Client Receipt"
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                          >
                            <Share2 className="w-4 h-4" />
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Review Modal (US-CLM-02) */}
      {reviewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border">
            <div className="flex justify-between items-start border-b pb-3">
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
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold p-1"
              >
                &times;
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {actionError}
              </div>
            )}

            {loadingClaims ? (
              <div className="py-8 flex justify-center text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : claimsList.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">No payment claims on record.</p>
            ) : (
              <div className="space-y-4">
                {claimsList.map((claim) => (
                  <div key={claim.id} className="p-4 bg-neutral-50 rounded-xl border space-y-3 text-xs">
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

                    <div className="grid grid-cols-2 gap-2 text-neutral-600">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Payment Date</span>
                        <span>{claim.payment_date}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Reference / Session ID</span>
                        <span className="font-mono font-medium text-neutral-800">{claim.reference || 'None'}</span>
                      </div>
                    </div>

                    {claim.proof_file_url && (
                      <div className="pt-1">
                        <span className="text-neutral-400 block text-[10px] mb-1">Proof Attachment</span>
                        <a
                          href={claim.proof_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 underline text-xs font-semibold inline-flex items-center gap-1"
                        >
                          View Receipt Document
                        </a>
                      </div>
                    )}

                    {claim.rejection_reason && (
                      <div className="p-2 bg-red-50 text-red-700 rounded text-[11px]">
                        <strong>Rejection Reason:</strong> {claim.rejection_reason}
                      </div>
                    )}

                    {/* Actions if pending */}
                    {claim.status === 'pending' && (
                      <div className="pt-2 border-t space-y-2">
                        {!showRejectInput && !showPartialInput && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={processingAction}
                              onClick={() => handleConfirmFull(claim.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-sm transition disabled:opacity-50"
                            >
                              Confirm Full ({formatMoney(claim.amount_minor, reviewingInvoice.currency)})
                            </button>
                            <button
                              disabled={processingAction}
                              onClick={() => setShowPartialInput(true)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50"
                            >
                              Confirm Partial
                            </button>
                            <button
                              disabled={processingAction}
                              onClick={() => setShowRejectInput(true)}
                              className="px-3 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs transition disabled:opacity-50"
                            >
                              Reject Claim
                            </button>
                          </div>
                        )}

                        {showPartialInput && (
                          <div className="p-3 bg-white rounded-lg border space-y-2">
                            <label className="block text-[11px] font-medium text-neutral-700">
                              Actual Amount Received ({reviewingInvoice.currency}):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="e.g. 50000"
                              value={partialAmount}
                              onChange={(e) => setPartialAmount(e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-xs text-neutral-900"
                            />
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowPartialInput(false)}
                                className="px-2.5 py-1 text-xs border rounded-md text-neutral-600 hover:bg-neutral-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() => handleConfirmPartial(claim.id)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
                              >
                                Confirm Partial
                              </button>
                            </div>
                          </div>
                        )}

                        {showRejectInput && (
                          <div className="p-3 bg-white rounded-lg border space-y-2">
                            <label className="block text-[11px] font-medium text-neutral-700">
                              Reason for Rejection:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Funds not yet cleared into bank account"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-lg text-xs text-neutral-900"
                            />
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowRejectInput(false)}
                                className="px-2.5 py-1 text-xs border rounded-md text-neutral-600 hover:bg-neutral-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() => handleRejectClaim(claim.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition"
                              >
                                Reject Claim
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setReviewingInvoice(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
