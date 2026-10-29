'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { BaggCoin } from '@/components/brand/Logo';
import {
  Button,
  Card,
  Field,
  buttonStyles,
  inputStyles,
  DataTable,
  type ColumnDef,
  Pagination,
  TableToolbar,
} from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { useDataTable } from '@/hooks/useDataTable';

const API_BASE = '/api';

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
  latest_receipt?: {
    id: string;
    amount_minor: number;
    receipt_number?: string | null;
    issued_at?: string | null;
    created_at?: string | null;
  } | null;
  comment_count?: number;
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

const CURRENCY_OPTIONS = [
  { value: '', label: 'All currencies' },
  { value: 'NGN', label: 'NGN (₦)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GHS', label: 'GHS (GH₵)' },
  { value: 'KES', label: 'KES (KSh)' },
  { value: 'ZAR', label: 'ZAR (R)' },
];

export default function InvoicesPage() {
  const table = useDataTable<Invoice>({
    endpoint: '/invoices',
    defaultSortBy: 'sequence_number',
    defaultSortOrder: 'desc',
    defaultPerPage: 20,
  });

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
      table.reload();
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
      table.reload();
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
      table.reload();
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

  const invoices = table.data?.items ?? [];
  const overdueCount = invoices.filter(isInvoiceOverdue).length;

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'sequence_number',
      header: 'Invoice',
      align: 'left',
      sortable: true,
      render: (inv) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/invoices/${encodeURIComponent(inv.id)}`}
            className="font-bold underline-offset-4 hover:underline"
          >
            {inv.invoice_number}
          </Link>
          {(inv.comment_count ?? 0) > 0 && (
            <span
              title={`${inv.comment_count} comment${(inv.comment_count ?? 0) > 1 ? 's' : ''}`}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface-tint px-1.5 py-0.5 text-caption font-bold text-ink"
            >
              <MessageSquare className="h-3 w-3 text-ink-muted" />
              <span>{inv.comment_count}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'client_name',
      header: 'Customer',
      align: 'left',
      render: (inv) => inv.client_name || 'Unnamed client',
    },
    {
      key: 'issue_date',
      header: 'Issue date',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (inv) => formatDate(inv.issue_date),
    },
    {
      key: 'due_date',
      header: 'Due date',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (inv) => {
        const overdue = isInvoiceOverdue(inv);
        return (
          <span className={overdue ? 'font-bold text-danger' : ''}>
            {formatDate(inv.due_date)}
          </span>
        );
      },
    },
    {
      key: 'total_minor',
      header: 'Total',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (inv) => (
        <Money
          amountMinor={inv.total_minor}
          currency={inv.currency}
          hideCurrencyCode
        />
      ),
    },
    {
      key: 'amount_paid_minor',
      header: 'Paid',
      align: 'right',
      cellClassName: 'whitespace-nowrap',
      render: (inv) => (
        <Money
          amountMinor={inv.amount_paid_minor}
          currency={inv.currency}
          hideCurrencyCode
        />
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cellClassName: 'whitespace-nowrap font-semibold',
      render: (inv) => (
        <Money
          amountMinor={Math.max(0, inv.total_minor - inv.amount_paid_minor)}
          currency={inv.currency}
          hideCurrencyCode
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'left',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (inv) => {
        const overdue = isInvoiceOverdue(inv);
        return (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-caption font-bold',
              overdue
                ? 'bg-[#FFB3B3] text-[#5A1010]'
                : inv.status === 'paid'
                  ? 'bg-leaf text-[#052E1B]'
                  : 'bg-surface-tint',
            )}
          >
            {overdue
              ? 'Overdue'
              : (inv.effective_status || inv.status).replaceAll('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (inv) => (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/invoices/${encodeURIComponent(inv.id)}`}
            className={buttonStyles({
              variant: 'outline',
              zone: 'calm',
            })}
          >
            View
          </Link>
          {inv.latest_claim?.status === 'pending' && (
            <Button
              variant="outline"
              zone="calm"
              onClick={() => void handleOpenReview(inv)}
            >
              Review payment
            </Button>
          )}
        </div>
      ),
    },
  ];

  const emptyState = (
    <Card tone="peach" className="space-y-4 p-8 text-center">
      <BaggCoin size={48} className="mx-auto" />
      <h2 className="text-title">no invoices here</h2>
      <p className="mx-auto max-w-sm text-body text-text-soft">
        {table.search.trim() || table.filters['status'] || table.filters['currency']
          ? 'No invoices match your current search and filters.'
          : 'Create your first invoice in under a minute.'}
      </p>
      <Link href="/invoices/new" className={buttonStyles({ size: 'lg' })}>
        <Plus aria-hidden className="h-4 w-4" />
        Create an invoice
      </Link>
    </Card>
  );

  const renderMobileCard = (inv: Invoice) => {
    const overdue = isInvoiceOverdue(inv);
    const balance = Math.max(0, inv.total_minor - inv.amount_paid_minor);

    return (
      <Card zone="calm" className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/invoices/${encodeURIComponent(inv.id)}`}
              className="font-bold underline-offset-4 hover:underline"
            >
              {inv.invoice_number}
            </Link>
            <p className="mt-1 text-body text-text-soft">
              {inv.client_name || 'Unnamed client'}
            </p>
          </div>
          <Money
            amountMinor={inv.total_minor}
            currency={inv.currency}
            className="shrink-0 font-bold"
            hideCurrencyCode
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-body">
          <span className="text-text-soft">
            Due {formatDate(inv.due_date)}
          </span>
          <span className="rounded-full bg-surface-tint px-2.5 py-1 text-caption font-bold">
            {overdue
              ? 'Overdue'
              : (inv.effective_status || inv.status).replaceAll('_', ' ')}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">
          <div>
            <p className="text-caption text-text-muted">Balance due</p>
            <Money
              amountMinor={balance}
              currency={inv.currency}
              className="font-semibold"
              hideCurrencyCode
            />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/invoices/${encodeURIComponent(inv.id)}`}
              className={buttonStyles({ variant: 'outline', zone: 'calm' })}
            >
              View
            </Link>
            {inv.latest_claim?.status === 'pending' && (
              <Button
                variant="outline"
                zone="calm"
                onClick={() => void handleOpenReview(inv)}
              >
                Review
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

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
                {overdueCount} overdue {overdueCount === 1 ? 'invoice' : 'invoices'} on this page.
              </span>{' '}
              A friendly nudge on WhatsApp usually gets you paid faster.
            </span>
          </p>
          {table.filters['status'] !== 'overdue' && (
            <Button variant="link" onClick={() => table.setFilter('status', 'overdue')}>
              Show overdue
            </Button>
          )}
        </Card>
      )}

      {/* Unified Toolbar: Chips, Search, Filter Dropdowns */}
      <TableToolbar
        chips={FILTER_CHIPS.map((c) => ({
          value: c.value,
          label: c.label,
        }))}
        chipValue={table.filters['status'] || ''}
        onChipChange={(v) => table.setFilter('status', v)}
        chipLabel="Filter invoices by status"
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search invoice number, customer or status"
        filters={[
          {
            key: 'currency',
            label: 'Currency',
            value: table.filters['currency'] || '',
            onChange: (v) => table.setFilter('currency', v),
            options: CURRENCY_OPTIONS,
          },
        ]}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(inv) => inv.id}
        loading={table.loading}
        emptyState={emptyState}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSort={table.toggleSort}
        renderMobileCard={renderMobileCard}
        tableClassName="min-w-[900px]"
        caption="Invoices table"
      />

      {/* Pagination */}
      {table.data && (
        <Pagination
          page={table.page}
          totalPages={table.data.total_pages}
          total={table.data.total}
          perPage={table.perPage}
          onPageChange={table.setPage}
          onPerPageChange={table.setPerPage}
        />
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
