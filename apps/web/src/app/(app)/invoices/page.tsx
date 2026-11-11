'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChatDots,
  CheckCircle,
  CircleNotch,
  Plus,
  WarningCircle,
  X,
} from '@phosphor-icons/react';

import {
  Sheet,
  SheetClose,
  SheetContent,
} from '@/components/ui/sheet';


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
  EmptyState,
  PageHeader,
} from '@/components/ui';

import { StatusPill } from '@/components/status/StatusPill';

import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { DocTabs } from '@/components/mobile/DocTabs';
import { InvoiceRow } from '@/components/mobile/InvoiceRow';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { useDataTable } from '@/hooks/useDataTable';
import { CURRENCIES } from '@/lib/money';

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
  status:
      | 'draft'
      | 'issued'
      | 'sent'
      | 'viewed'
      | 'payment_claimed'
      | 'partially_paid'
      | 'paid'
      | 'cancelled';
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

/**
 * Extract a useful API error message.
 */
async function getApiError(
    response: Response,
    fallback: string,
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data?.detail === 'string') {
      return data.detail;
    }

    if (Array.isArray(data?.detail)) {
      return data.detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join(', ') || fallback;
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Response was not valid JSON.
  }

  return fallback;
}

function getSafeEvidenceUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    // Only allow secure, absolute evidence URLs.
    if (url.protocol !== 'https:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export default function InvoicesPage() {
  const table = useDataTable<Invoice>({
    endpoint: '/invoices',
    defaultSortBy: 'sequence_number',
    defaultSortOrder: 'desc',
    defaultPerPage: 20,
  });

  // Initialize filters from URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    ['status', 'currency'].forEach((key) => {
      const value = params.get(key);

      if (value) {
        table.setFilter(key, value);
      }
    });

    // The initialization should happen once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Payment claim review state.
  const [reviewingInvoice, setReviewingInvoice] =
      useState<Invoice | null>(null);

  const [claimsList, setClaimsList] = useState<PaymentClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const [partialAmount, setPartialAmount] = useState('');
  const [showPartialInput, setShowPartialInput] = useState(false);

  const [actionClaimId, setActionClaimId] = useState<string | null>(null);

  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Open the payment claim review sheet.
   */
  const handleOpenReview = async (invoice: Invoice) => {
    setReviewingInvoice(invoice);
    setClaimsList([]);

    setShowRejectInput(false);
    setShowPartialInput(false);

    setActionClaimId(null);
    setRejectReason('');
    setPartialAmount('');
    setActionError(null);

    setLoadingClaims(true);

    try {
      const response = await fetch(
          `${API_BASE}/invoices/${encodeURIComponent(invoice.id)}/claims`,
          {
            credentials: 'include',
            headers: {
              Accept: 'application/json',
            },
          },
      );

      if (!response.ok) {
        throw new Error(
            await getApiError(response, 'Unable to load payment claims.'),
        );
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid payment claims response from server.');
      }

      setClaimsList(data as PaymentClaim[]);
    } catch (error) {
      setActionError(
          error instanceof Error
              ? error.message
              : 'Unable to load payment claims.',
      );
    } finally {
      setLoadingClaims(false);
    }
  };

  /**
   * Confirm the full claimed payment.
   */
  const handleConfirmFull = async (claimId: string) => {
    if (!reviewingInvoice || processingAction) return;

    setProcessingAction(true);
    setActionError(null);

    try {
      const response = await fetch(
          `${API_BASE}/invoices/${encodeURIComponent(reviewingInvoice.id)}/claims/${encodeURIComponent(claimId)}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({}),
          },
      );

      if (!response.ok) {
        throw new Error(
            await getApiError(response, 'Failed to confirm payment claim.'),
        );
      }

      setReviewingInvoice(null);
      await table.reload();
    } catch (error) {
      setActionError(
          error instanceof Error
              ? error.message
              : 'Error confirming payment.',
      );
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Confirm a partial payment.
   *
   * The amount entered is converted to minor units.
   * Replace the precision with your shared currency configuration
   * if the application supports zero- or three-decimal currencies.
   */
  const handleConfirmPartial = async (claimId: string) => {
    if (!reviewingInvoice || processingAction) return;

    const amountValue = Number(partialAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setActionError('Please enter a valid partial amount.');
      return;
    }

    const currencyConfig =
      CURRENCIES[reviewingInvoice.currency as keyof typeof CURRENCIES];

    if (!currencyConfig) {
      setActionError('Unsupported invoice currency.');
      return;
    }

    const minorValue = Math.round(amountValue * currencyConfig.factor);

    if (!Number.isSafeInteger(minorValue) || minorValue <= 0) {
      setActionError('The payment amount is invalid.');
      return;
    }

    if (minorValue > reviewingInvoice.total_minor -
        reviewingInvoice.amount_paid_minor) {
      setActionError('The amount cannot exceed the outstanding invoice balance.');
      return;
    }

    setProcessingAction(true);
    setActionError(null);

    try {
      const response = await fetch(
          `${API_BASE}/invoices/${encodeURIComponent(reviewingInvoice.id)}/claims/${encodeURIComponent(claimId)}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              amount_paid_minor: minorValue,
            }),
          },
      );

      if (!response.ok) {
        throw new Error(
            await getApiError(response, 'Failed to confirm partial payment.'),
        );
      }

      setReviewingInvoice(null);
      await table.reload();
    } catch (error) {
      setActionError(
          error instanceof Error
              ? error.message
              : 'Error confirming partial payment.',
      );
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Reject a payment claim.
   */
  const handleRejectClaim = async (claimId: string) => {
    if (!reviewingInvoice || processingAction) return;

    if (!rejectReason.trim()) {
      setActionError(
          'Please provide an explanation for rejecting this payment claim.',
      );
      return;
    }

    setProcessingAction(true);
    setActionError(null);

    try {
      const response = await fetch(
          `${API_BASE}/invoices/${encodeURIComponent(reviewingInvoice.id)}/claims/${encodeURIComponent(claimId)}/reject`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              rejection_reason: rejectReason.trim(),
            }),
          },
      );

      if (!response.ok) {
        throw new Error(
            await getApiError(response, 'Failed to reject payment claim.'),
        );
      }

      setReviewingInvoice(null);
      await table.reload();
    } catch (error) {
      setActionError(
          error instanceof Error
              ? error.message
              : 'Error rejecting payment claim.',
      );
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Determine whether an invoice is overdue.
   */
  const isInvoiceOverdue = (invoice: Invoice): boolean => {
    if (typeof invoice.is_overdue === 'boolean') {
      return invoice.is_overdue;
    }

    if (
        ['paid', 'draft', 'cancelled'].includes(invoice.status)
    ) {
      return false;
    }

    const dueDate = new Date(invoice.due_date);

    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  const invoices = table.data?.items ?? [];

  const overdueCount = invoices.filter(isInvoiceOverdue).length;

  /**
   * Desktop table columns.
   */
  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'sequence_number',
      header: 'Invoice',
      align: 'left',
      sortable: true,
      render: (invoice) => (
          <div className="flex items-center gap-2">
            <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className="font-bold underline-offset-4 hover:underline"
            >
              {invoice.invoice_number}
            </Link>

            {(invoice.comment_count ?? 0) > 0 && (
                <span
                    title={`${invoice.comment_count} comment${(invoice.comment_count ?? 0) > 1 ? 's' : ''}`}
                    className="inline-flex items-center gap-1 rounded border border-border bg-surface-tint px-1.5 py-0.5 text-caption font-bold text-ink"
                >
              <ChatDots className="h-3 w-3 text-ink-muted" />
              <span>{invoice.comment_count}</span>
            </span>
            )}
          </div>
      ),
    },
    {
      key: 'client_name',
      header: 'Customer',
      align: 'left',
      render: (invoice) => invoice.client_name || 'Unnamed client',
    },
    {
      key: 'issue_date',
      header: 'Issue date',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (invoice) => formatDate(invoice.issue_date),
    },
    {
      key: 'due_date',
      header: 'Due date',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (invoice) => {
        const overdue = isInvoiceOverdue(invoice);

        return (
            <span className={overdue ? 'font-bold text-danger' : ''}>
            {formatDate(invoice.due_date)}
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
      render: (invoice) => (
          <Money
              amountMinor={invoice.total_minor}
              currency={invoice.currency}
              hideCurrencyCode
          />
      ),
    },
    {
      key: 'amount_paid_minor',
      header: 'Paid',
      align: 'right',
      cellClassName: 'whitespace-nowrap',
      render: (invoice) => (
          <Money
              amountMinor={invoice.amount_paid_minor}
              currency={invoice.currency}
              hideCurrencyCode
          />
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cellClassName: 'whitespace-nowrap font-semibold',
      render: (invoice) => (
          <Money
              amountMinor={Math.max(
                  0,
                  invoice.total_minor - invoice.amount_paid_minor,
              )}
              currency={invoice.currency}
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
      render: (invoice) => {
        const overdue = isInvoiceOverdue(invoice);

        return (
          <StatusPill
            status={
              overdue
                ? 'overdue'
                : invoice.effective_status || invoice.status
            }
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (invoice) => (
          <div className="flex items-center justify-center gap-2">
            <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className={buttonStyles({
                  variant: 'outline',
                  zone: 'calm',
                })}
            >
              View
            </Link>

            {invoice.latest_claim?.status === 'pending' && (
                <Button
                    variant="outline"
                    zone="calm"
                    onClick={() => void handleOpenReview(invoice)}
                >
                  Review payment
                </Button>
            )}
          </div>
      ),
    },
  ];

  /**
   * Empty state.
   */
    const hasActiveFilters =
      Boolean(table.search.trim()) ||
      Boolean(table.filters.status) ||
      Boolean(table.filters.currency);

    const emptyState = hasActiveFilters ? (
      <EmptyState
        mood="confused"
        title="No matching invoices"
        body="Try a different search or clear your filters to see more invoices."
        compact
      />
    ) : (
      <EmptyState
        mood="happy"
        title="No invoices yet"
        body="Create your first invoice and send it to your client."
        action={{
          label: 'Create invoice',
          href: '/invoices/new',
        }}
      />
    );

  /**
   * Mobile invoice card rendering.
   */
  const renderMobileCard = (invoice: Invoice) => (
      <InvoiceRow
          inv={invoice}
          overdue={isInvoiceOverdue(invoice)}
          onReview={() => void handleOpenReview(invoice)}
      />
  );

  /**
   * Main page.
   */
  return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <PageHeader
          eyebrow="Documents"
          title="Invoices"
          description="Create, send and track what clients owe you."
          actions={
            <Link
              href="/invoices/new"
              className={cn(
                buttonStyles({ variant: 'accent' }),
                'hidden sm:inline-flex',
              )}
            >
              <Plus aria-hidden className="h-4 w-4" />
              New invoice
            </Link>
          }
        />

        {/* Document navigation */}
        <DocTabs className="mt-3" />

        {/* Overdue notice */}
        {overdueCount > 0 && (
            <Card
                zone="calm"
                tone="peach"
                className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="flex items-center gap-2 text-body">
                <WarningCircle
                    aria-hidden
                    className="h-4 w-4 shrink-0"
                />

                <span>
                  <span className="font-extrabold">
                    {overdueCount} overdue{' '}
                    {overdueCount === 1 ? 'invoice' : 'invoices'} on this page.
                  </span>{' '}
                      A friendly nudge on WhatsApp usually gets you paid faster.
                </span>
              </p>

              {table.filters['status'] !== 'overdue' && (
                  <Button
                      variant="link"
                      onClick={() => table.setFilter('status', 'overdue')}
                  >
                    Show overdue
                  </Button>
              )}
            </Card>
        )}

        {/* Toolbar */}
        <TableToolbar
            chips={FILTER_CHIPS.map((chip) => ({
              value: chip.value,
              label: chip.label,
            }))}
            chipValue={table.filters['status'] || ''}
            onChipChange={(value) => table.setFilter('status', value)}
            chipLabel="Filter invoices by status"
            search={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search invoice number, customer or status"
            filters={[
              {
                key: 'currency',
                label: 'Currency',
                value: table.filters['currency'] || '',
                onChange: (value) => table.setFilter('currency', value),
                options: CURRENCY_OPTIONS,
              },
            ]}
        />

        {table.error && (
          <Card
            zone="calm"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-extrabold text-danger">
                We couldn't load your invoices
              </p>
              <p className="text-body text-text-soft">
                {table.error}. Your invoice records have not been changed.
              </p>
            </div>

            <Button
              variant="outline"
              zone="calm"
              onClick={() => void table.reload()}
              loading={table.loading}
            >
              Try again
            </Button>
          </Card>
        )}

        {/* Invoice table */}
          <DataTable
            columns={columns}
            rows={invoices}
            getRowKey={(invoice) => invoice.id}
            loading={table.loading}
            emptyState={table.error ? undefined : emptyState}
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

        {/* Payment claim review sheet */}
        {reviewingInvoice && (
            <Sheet
                open
                onOpenChange={(open) => {
                  if (!open && !processingAction) {
                    setReviewingInvoice(null);
                  }
                }}
            >
              <SheetContent
                  title="Review payment claim"
                  className="overflow-y-auto"
              >
                <div className="space-y-4 p-4 pb-8">
                  {/* Sheet header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-title">
                        review claim
                      </h2>

                      <p className="text-body text-text-soft">
                        {reviewingInvoice.invoice_number}
                        {' · '}
                        {reviewingInvoice.client_name || 'Client'}
                        {' · total '}

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
                          disabled={processingAction}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn hover:bg-surface-tint"
                      >
                        <X aria-hidden className="h-5 w-5" />
                      </button>
                    </SheetClose>
                  </div>

                  {/* Errors */}
                  {actionError && (
                      <p
                          role="alert"
                          className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
                      >
                        {actionError}
                      </p>
                  )}

                  {/* Loading */}
                  {loadingClaims ? (
                      <div
                          role="status"
                          className="flex justify-center py-6 text-text-muted"
                      >
                        <CircleNotch
                            aria-hidden
                            className="h-6 w-6 animate-spin"
                        />

                        <span className="sr-only">
                    Loading claims
                  </span>
                      </div>
                  ) : claimsList.length === 0 ? (
                      <p className="py-4 text-center text-body text-text-soft">
                        No payment claims on record.
                      </p>
                  ) : (
                      <ul className="space-y-3">
                        {claimsList.map((claim) => {
                          const isPending = claim.status === 'pending';
                          const formOpen = actionClaimId === claim.id;

                          return (
                              <li key={claim.id}>
                                <Card zone="calm" className="space-y-4">
                                  {/* Claim amount and status */}
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
                              {claim.status === 'pending'
                                  ? 'Waiting for you'
                                  : claim.status === 'confirmed'
                                      ? 'Confirmed'
                                      : 'Rejected'}
                            </span>
                                  </div>

                                  {/* Claim details */}
                                  <dl className="grid grid-cols-2 gap-3 text-body">
                                    <div>
                                      <dt className="text-caption text-text-muted">
                                        Payment date
                                      </dt>

                                      <dd>
                                        {formatDate(claim.payment_date)}
                                      </dd>
                                    </div>

                                    <div className="min-w-0">
                                      <dt className="text-caption text-text-muted">
                                        Reference
                                      </dt>

                                      <dd className="tabular truncate font-medium">
                                        {claim.reference || 'None'}
                                      </dd>
                                    </div>
                                  </dl>

                                                                    {/* Submitted payment evidence */}
                                  {(() => {
                                    const evidenceUrl = getSafeEvidenceUrl(
                                      claim.proof_file_url,
                                    );

                                    return (
                                      <div className="space-y-1">
                                        <p className="text-caption font-semibold text-text-muted">
                                          Payment evidence
                                        </p>

                                        {evidenceUrl ? (
                                          <a
                                            href={evidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center font-bold text-text underline underline-offset-4 hover:text-text-soft"
                                          >
                                            View submitted proof
                                          </a>
                                        ) : (
                                          <p className="text-body text-text-soft">
                                            No accessible proof attachment.
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Rejection reason */}
                                  {claim.status === 'rejected' &&
                                      claim.rejection_reason && (
                                          <p className="text-body text-text-soft">
                                            Reason: {claim.rejection_reason}
                                          </p>
                                      )}

                                  {/* Pending claim actions */}
                                  {isPending && (
                                      <div className="space-y-3 border-t border-line-subtle pt-4">
                                        <Button
                                            zone="calm"
                                            size="lg"
                                            fullWidth
                                            loading={processingAction}
                                            disabled={processingAction}
                                            onClick={() =>
                                                void handleConfirmFull(claim.id)
                                            }
                                        >
                                          <CheckCircle
                                              aria-hidden
                                              className="h-4 w-4"
                                          />
                                          Confirm funds received
                                        </Button>

                                        <div className="grid grid-cols-2 gap-3">
                                          <Button
                                              variant="outline"
                                              zone="calm"
                                              fullWidth
                                              disabled={processingAction}
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
                                              disabled={processingAction}
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

                                        {/* Partial payment form */}
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
                                                    disabled={processingAction}
                                                    onClick={() => {
                                                      setShowPartialInput(false);
                                                      setActionClaimId(null);
                                                      setActionError(null);
                                                    }}
                                                >
                                                  Cancel
                                                </Button>

                                                <Button
                                                    zone="calm"
                                                    fullWidth
                                                    loading={processingAction}
                                                    disabled={processingAction}
                                                    onClick={() =>
                                                        void handleConfirmPartial(claim.id)
                                                    }
                                                >
                                                  Confirm amount
                                                </Button>
                                              </div>
                                            </div>
                                        )}

                                        {/* Reject form */}
                                        {formOpen && showRejectInput && (
                                            <div className="space-y-3">
                                              <Field
                                                  label="Why are you rejecting this?"
                                                  hint="Say what is wrong so your client can fix it."
                                              >
                                                {(a11y) => (
                                                    <textarea
                                                        rows={3}
                                                        value={rejectReason}
                                                        disabled={processingAction}
                                                        onChange={(event) =>
                                                            setRejectReason(event.target.value)
                                                        }
                                                        className={cn(
                                                            inputStyles,
                                                            'min-h-24 py-2',
                                                        )}
                                                        {...a11y}
                                                    />
                                                )}
                                              </Field>

                                              <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    zone="calm"
                                                    fullWidth
                                                    disabled={processingAction}
                                                    onClick={() => {
                                                      setShowRejectInput(false);
                                                      setActionClaimId(null);
                                                      setActionError(null);
                                                    }}
                                                >
                                                  Cancel
                                                </Button>

                                                <Button
                                                    variant="danger"
                                                    zone="calm"
                                                    fullWidth
                                                    loading={processingAction}
                                                    disabled={processingAction}
                                                    onClick={() =>
                                                        void handleRejectClaim(claim.id)
                                                    }
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

        {/* Mobile floating action */}
        <div className="fixed bottom-5 right-5 z-30 sm:hidden">
          <Link
              href="/invoices/new"
              aria-label="Create invoice"
              className={cn(
                  buttonStyles({
                    variant: 'accent',
                    size: 'lg',
                  }),
                  'h-14 w-14 rounded-full p-0 shadow-lg',
              )}
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Link>
        </div>
      </div>
  );
}
