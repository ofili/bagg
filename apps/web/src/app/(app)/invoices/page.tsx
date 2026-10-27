'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { type ReceiptInfo } from '@/components/status';
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { InvoiceCard } from '@/components/mobile/InvoiceCard';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { BaggCoin } from '@/components/brand/Logo';
import { Button, Card, Field, buttonStyles, inputStyles } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
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

  // Claim Review State (US-CLM-02)
  const [reviewingInvoice, setReviewingInvoice] = useState<Invoice | null>(null);
  const [claimsList, setClaimsList] = useState<PaymentClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [actionClaimId, setActionClaimId] = useState<string | null>(null);
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
    setActionClaimId(null);
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


  const filteredInvoices = invoices.filter((inv) => {
    if (currencyFilter && inv.currency !== currencyFilter) return false;
    return true;
  });
  const overdueCount = filteredInvoices.filter(isInvoiceOverdue).length;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-title-l sm:text-display">invoices</h1>
          <p className="mt-1 text-body text-text-soft">Create, send and track what clients owe you.</p>
        </div>
        <Link href="/invoices/new" className={buttonStyles({ variant: 'accent' })}>
          <Plus aria-hidden className="h-4 w-4" /> New invoice
        </Link>
      </div>

      {/* Overdue notice */}
      {overdueCount > 0 && (
        <Card zone="calm" tone="peach" className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-body">
            <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-extrabold">
                {overdueCount} overdue {overdueCount === 1 ? 'invoice' : 'invoices'}.
              </span>{' '}
              A friendly nudge on WhatsApp usually gets you paid faster.
            </span>
          </p>
          {statusFilter !== 'overdue' && (
            <Button variant="link" onClick={() => setStatusFilter('overdue')}>
              Show overdue
            </Button>
          )}
        </Card>
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
        label="Filter invoices by status"
      />

      <div className="flex items-center gap-3">
        <label htmlFor="currency-filter" className="text-body text-text-soft">
          Currency
        </label>
        <select
          id="currency-filter"
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className={cn(inputStyles, 'w-auto min-w-40')}
        >
          <option value="">All currencies</option>
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
        <div role="status" className="flex justify-center py-16 text-text-muted">
          <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
          <span className="sr-only">Loading invoices</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card tone="peach" className="space-y-4 p-8 text-center">
          <BaggCoin size={48} className="mx-auto" />
          <h2 className="text-title">no invoices here</h2>
          <p className="mx-auto max-w-sm text-body text-text-soft">
            {statusFilter
              ? `Nothing is marked ${statusFilter.replace('_', ' ')} right now.`
              : 'Create your first invoice in under a minute. Numbers are assigned in order for you.'}
          </p>
          <Link href="/invoices/new" className={buttonStyles({ size: 'lg' })}>
            <Plus aria-hidden className="h-4 w-4" /> Create an invoice
          </Link>
        </Card>
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
              onReviewClaim={() => handleOpenReview(inv)}
              onNudge={() => handleWhatsAppNudge(inv)}
            />
          ))}
        </div>
      )}

      {/* Claim review sheet */}
      {reviewingInvoice && (
        <Sheet open onOpenChange={(open) => !open && setReviewingInvoice(null)}>
          <SheetContent title="Review payment claim" className="overflow-y-auto">
            <div className="space-y-4 p-4 pb-8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-title">review claim</h2>
                  <p className="text-body text-text-soft">
                    {reviewingInvoice.invoice_number} · {reviewingInvoice.client_name || 'Client'} · total{' '}
                    <Money
                      amountMinor={reviewingInvoice.total_minor}
                      currency={reviewingInvoice.currency}
                      variant="inherit"
                      className="font-extrabold"
                    />
                  </p>
                </div>
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn hover:bg-surface-tint"
                  >
                    <X aria-hidden className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>

              {actionError && (
                <p role="alert" className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                  {actionError}
                </p>
              )}

              {loadingClaims ? (
                <div role="status" className="flex justify-center py-6 text-text-muted">
                  <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
                  <span className="sr-only">Loading claims</span>
                </div>
              ) : claimsList.length === 0 ? (
                <p className="py-4 text-center text-body text-text-soft">No payment claims on record.</p>
              ) : (
                <ul className="space-y-3">
                  {claimsList.map((claim) => {
                    const isPending = claim.status === 'pending';
                    const formOpen = actionClaimId === claim.id;
                    return (
                      <li key={claim.id}>
                        <Card zone="calm" className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <Money
                              amountMinor={claim.amount_minor}
                              currency={reviewingInvoice.currency}
                              className="text-amount-m"
                            />
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-caption font-extrabold',
                                claim.status === 'confirmed'
                                  ? 'bg-leaf text-[#052E1B]'
                                  : claim.status === 'rejected'
                                  ? 'bg-[#FFB3B3] text-[#5A1010]'
                                  : 'bg-sun text-[#4A3200]',
                              )}
                            >
                              {claim.status === 'pending' ? 'Waiting for you' : claim.status === 'confirmed' ? 'Confirmed' : 'Rejected'}
                            </span>
                          </div>

                          <dl className="grid grid-cols-2 gap-3 text-body">
                            <div>
                              <dt className="text-caption text-text-muted">Payment date</dt>
                              <dd>{formatDate(claim.payment_date)}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-caption text-text-muted">Reference</dt>
                              <dd className="tabular truncate font-medium">{claim.reference || 'None'}</dd>
                            </div>
                          </dl>

                          {claim.status === 'rejected' && claim.rejection_reason && (
                            <p className="text-body text-text-soft">Reason: {claim.rejection_reason}</p>
                          )}

                          {isPending && (
                            <div className="space-y-3 border-t border-line-subtle pt-4">
                              <Button
                                zone="calm"
                                size="lg"
                                fullWidth
                                loading={processingAction}
                                onClick={() => handleConfirmFull(claim.id)}
                              >
                                <CheckCircle2 aria-hidden className="h-4 w-4" /> Confirm funds received
                              </Button>
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  variant="outline"
                                  zone="calm"
                                  fullWidth
                                  onClick={() => {
                                    setActionError(null);
                                    setActionClaimId(claim.id);
                                    setShowRejectInput(false);
                                    setShowPartialInput(true);
                                  }}
                                >
                                  Different amount
                                </Button>
                                <Button
                                  variant="outline"
                                  zone="calm"
                                  fullWidth
                                  onClick={() => {
                                    setActionError(null);
                                    setActionClaimId(claim.id);
                                    setShowPartialInput(false);
                                    setShowRejectInput(true);
                                    setRejectReason('');
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>

                              {formOpen && showPartialInput && (
                                <div className="space-y-3">
                                  <MoneyInput
                                    id={`partial-${claim.id}`}
                                    label="Amount you actually received"
                                    value={partialAmount}
                                    onChange={setPartialAmount}
                                    currency={reviewingInvoice.currency}
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <Button
                                      variant="outline"
                                      zone="calm"
                                      fullWidth
                                      onClick={() => {
                                        setShowPartialInput(false);
                                        setActionClaimId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      zone="calm"
                                      fullWidth
                                      loading={processingAction}
                                      onClick={() => handleConfirmPartial(claim.id)}
                                    >
                                      Confirm amount
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {formOpen && showRejectInput && (
                                <div className="space-y-3">
                                  <Field label="Why are you rejecting this?" hint="Say what is wrong so your client can fix it.">
                                    {(a11y) => (
                                      <textarea
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className={cn(inputStyles, 'min-h-24 py-2')}
                                        {...a11y}
                                      />
                                    )}
                                  </Field>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Button
                                      variant="outline"
                                      zone="calm"
                                      fullWidth
                                      onClick={() => {
                                        setShowRejectInput(false);
                                        setActionClaimId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="danger"
                                      zone="calm"
                                      fullWidth
                                      loading={processingAction}
                                      onClick={() => handleRejectClaim(claim.id)}
                                    >
                                      Reject claim
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
