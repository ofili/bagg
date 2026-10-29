'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  FileText,
  ReceiptText,
} from 'lucide-react';
import {
  Card,
  buttonStyles,
  DataTable,
  type ColumnDef,
  Pagination,
  TableToolbar,
} from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useDataTable } from '@/hooks/useDataTable';

interface ReceiptRecord {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string | null;
  currency: string;
  amount_paid_minor: number;
  balance_remaining_minor: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
  payer_name?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  verification_code: string;
  share_token?: string | null;
  share_url?: string | null;
  created_at: string;
}

function paymentMethodLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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

export default function ReceiptsPage() {
  const table = useDataTable<ReceiptRecord>({
    endpoint: '/receipts',
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
    defaultPerPage: 20,
  });

  const receipts = table.data?.items ?? [];
  const totalReceipts = table.data?.total ?? 0;

  const columns: ColumnDef<ReceiptRecord>[] = [
    {
      key: 'receipt_number',
      header: 'Receipt',
      align: 'left',
      sortable: true,
      render: (receipt) => (
        <Link
          href={`/receipts/${encodeURIComponent(receipt.id)}`}
          className="font-bold underline-offset-4 hover:underline"
        >
          {receipt.receipt_number}
        </Link>
      ),
    },
    {
      key: 'client_name',
      header: 'Customer',
      align: 'left',
      render: (receipt) => receipt.client_name || receipt.payer_name || 'Customer',
    },
    {
      key: 'invoice_number',
      header: 'Invoice',
      align: 'left',
      render: (receipt) => (
        <Link
          href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {receipt.invoice_number}
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      key: 'payment_date',
      header: 'Payment date',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (receipt) => formatDate(receipt.payment_date),
    },
    {
      key: 'amount_paid_minor',
      header: 'Amount',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap font-semibold',
      render: (receipt) => (
        <Money
          amountMinor={receipt.amount_paid_minor}
          currency={receipt.currency}
          hideCurrencyCode
        />
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      align: 'left',
      render: (receipt) => paymentMethodLabel(receipt.payment_method),
    },
    {
      key: 'verification',
      header: 'Verification',
      align: 'left',
      render: (receipt) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-caption font-bold',
            receipt.is_verified
              ? 'bg-leaf text-[#052E1B]'
              : 'bg-sun text-[#4A3200]',
          )}
        >
          {receipt.is_verified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (receipt) => (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/receipts/${encodeURIComponent(receipt.id)}`}
            className={buttonStyles({
              variant: 'outline',
              zone: 'calm',
            })}
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  const emptyState = (
    <Card zone="calm" className="space-y-3 p-8 text-center">
      <ReceiptText aria-hidden className="mx-auto h-10 w-10 text-text-muted" />
      <h2 className="text-title">no receipts found</h2>
      <p className="mx-auto max-w-md text-body text-text-soft">
        {totalReceipts === 0 && !table.search.trim() && !table.filters['currency']
          ? 'Issued receipts will appear here when payments are recorded.'
          : 'Try a different search or currency filter.'}
      </p>
    </Card>
  );

  const renderMobileCard = (receipt: ReceiptRecord) => (
    <Card zone="calm" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/receipts/${encodeURIComponent(receipt.id)}`}
            className="font-bold underline-offset-4 hover:underline"
          >
            {receipt.receipt_number}
          </Link>
          <p className="mt-1 truncate text-body text-text-soft">
            {receipt.client_name || receipt.payer_name || 'Customer'}
          </p>
        </div>
        <Money
          amountMinor={receipt.amount_paid_minor}
          currency={receipt.currency}
          className="shrink-0 font-bold"
          hideCurrencyCode
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-body">
        <div>
          <dt className="text-caption text-text-muted">Invoice</dt>
          <dd>
            <Link
              href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
              className="underline-offset-4 hover:underline"
            >
              {receipt.invoice_number}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">Payment date</dt>
          <dd>{formatDate(receipt.payment_date)}</dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">Method</dt>
          <dd>{paymentMethodLabel(receipt.payment_method)}</dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">Verification</dt>
          <dd>{receipt.is_verified ? 'Verified' : 'Unverified'}</dd>
        </div>
      </dl>

      <Link
        href={`/receipts/${encodeURIComponent(receipt.id)}`}
        className={buttonStyles({
          variant: 'outline',
          zone: 'calm',
          fullWidth: true,
        })}
      >
        View receipt
      </Link>
    </Card>
  );

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title-l sm:text-display">receipts</h1>
          <p className="mt-1 text-body text-text-soft">
            Find payment receipts and trace them back to their invoices.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card zone="calm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-row bg-peach">
            <ReceiptText aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-caption text-text-soft">
              {table.filters['currency'] ? `${table.filters['currency']} receipts` : 'Total receipts'}
            </p>
            <p className="text-title">{totalReceipts}</p>
          </div>
        </Card>

        <Card zone="calm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-row bg-peach">
            <FileText aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-caption text-text-soft">Current currency filter</p>
            <p className="text-title">
              {table.filters['currency'] || 'All'}
            </p>
          </div>
        </Card>
      </div>

      {/* Unified Toolbar: Search + Currency dropdown */}
      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search receipt, invoice, customer or reference"
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

      {table.error && (
        <Card zone="calm" className="space-y-3 p-6">
          <AlertCircle aria-hidden className="h-6 w-6 text-danger" />
          <h2 className="text-heading">we couldn’t load your receipts</h2>
          <p role="alert" className="text-body text-text-soft">
            {table.error}
          </p>
          <button
            type="button"
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
            onClick={() => table.reload()}
          >
            Try again
          </button>
        </Card>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        rows={receipts}
        getRowKey={(receipt) => receipt.id}
        loading={table.loading}
        emptyState={emptyState}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSort={table.toggleSort}
        renderMobileCard={renderMobileCard}
        tableClassName="min-w-[850px]"
        caption="Receipts table"
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
    </div>
  );
}
