
'use client';

import Link from 'next/link';
import { ArrowUpRight, Receipt } from 'lucide-react';

import {
  Card,
  DataTable,
  ErrorState,
  PageContainer,
  PageHeader,
  StatCard,
  type ColumnDef,
  Pagination,
  TableToolbar,
} from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useDataTable } from '@/hooks/useDataTable';
import { DocTabs } from '@/components/mobile/DocTabs';
import { ReceiptRow } from '@/components/mobile/ReceiptRow';

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
  const selectedCurrency = table.filters.currency || '';

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
      render: (receipt) =>
        receipt.client_name || receipt.payer_name || 'Customer',
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
      cellClassName: 'whitespace-nowrap',
      render: (receipt) => formatDate(receipt.payment_date),
    },
    {
      // Maps to ReceiptRepository.SORT_COLUMNS["amount_minor"].
      key: 'amount_minor',
      header: 'Amount received',
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
              ? 'bg-leaf text-on-leaf'
              : 'bg-sun text-on-sun',
          )}
        >
          {receipt.is_verified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
  ];

  const emptyState = (
    <Card zone="calm" tone="peach" className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink">
        <Receipt aria-hidden className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-title font-extrabold text-ink">
        No receipts found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-body text-text-soft">
        {totalReceipts === 0 &&
        !table.search.trim() &&
        !selectedCurrency
          ? 'Receipts will appear here when payments are recorded.'
          : 'Try a different search or currency filter.'}
      </p>
    </Card>
  );

  const renderMobileCard = (receipt: ReceiptRecord) => (
    <ReceiptRow receipt={receipt} />
  );

  return (
    <PageContainer width="list">
      <PageHeader
        title="Receipts"
        description="Find payment receipts and trace them back to their invoices."
      />

      <DocTabs className="mt-5" />

      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        <StatCard
          zone="calm"
          label={
            selectedCurrency
              ? `${selectedCurrency} receipts`
              : 'Total receipts'
          }
          value={totalReceipts.toLocaleString()}
          description="Matching your current filters"
        />

        <StatCard
          zone="calm"
          label="Currency filter"
          value={selectedCurrency || 'All currencies'}
          description="Use the toolbar to narrow your results"
        />
      </div>

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search receipt, invoice or customer"
        filters={[
          {
            key: 'currency',
            label: 'Currency',
            value: selectedCurrency,
            onChange: (value) => table.setFilter('currency', value),
            options: CURRENCY_OPTIONS,
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={receipts}
        getRowKey={(receipt) => receipt.id}
        loading={table.loading}
        errorState={
          table.error ? (
            <ErrorState
              title="We couldn't load your receipts"
              description={`${table.error}. Your receipt records have not been changed.`}
              retryLabel="Try again"
              onRetry={() => void table.reload()}
              compact
            />
          ) : undefined
        }
        emptyState={emptyState}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSort={table.toggleSort}
        renderMobileCard={renderMobileCard}
        tableClassName="min-w-[850px]"
        caption="Receipts table"
        getRowHref={(receipt) =>
          `/receipts/${encodeURIComponent(receipt.id)}`
        }
      />

      {table.data && !table.error && (
        <Pagination
          page={table.page}
          totalPages={table.data.total_pages}
          total={table.data.total}
          perPage={table.perPage}
          onPageChange={table.setPage}
          onPerPageChange={table.setPerPage}
        />
      )}
    </PageContainer>
  );
}
