'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  FileText,
  Loader2,
  ReceiptText,
  Search,
} from 'lucide-react';

import { Card, Button, buttonStyles, inputStyles } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

async function readError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  return new Error(body.detail || body.message || fallback);
}

function paymentMethodLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const response = await fetch(`${API_BASE}/receipts`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw await readError(response, 'Could not load receipts.');
      }

      const data = (await response.json()) as ReceiptRecord[];
      setReceipts(data);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : 'Could not load receipts.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const currencies = useMemo(
    () => [...new Set(receipts.map((receipt) => receipt.currency))].sort(),
    [receipts],
  );

  const visibleReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receipts.filter((receipt) => {
      if (currencyFilter && receipt.currency !== currencyFilter) {
        return false;
      }

      if (!query) return true;

      return [
        receipt.receipt_number,
        receipt.invoice_number,
        receipt.client_name,
        receipt.payer_name,
        receipt.reference,
        receipt.payment_method,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [receipts, search, currencyFilter]);

  const totalReceipts = visibleReceipts.length;

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
              {currencyFilter ? `${currencyFilter} receipts` : 'Receipts'}
            </p>
            <p className="text-title">{totalReceipts}</p>
          </div>
        </Card>

        <Card zone="calm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-row bg-peach">
            <FileText aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-caption text-text-soft">Currencies represented</p>
            <p className="text-title">
              {currencyFilter ? 1 : currencies.length}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">
            Search receipts, invoices, customers or payment references
          </span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search receipt, invoice, customer or reference"
            className={cn(inputStyles, 'w-full pl-10')}
          />
        </label>

        <label className="sm:w-48">
          <span className="sr-only">Filter by currency</span>
          <select
            value={currencyFilter}
            onChange={(event) => setCurrencyFilter(event.target.value)}
            className={cn(inputStyles, 'w-full')}
          >
            <option value="">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div
          role="status"
          className="flex justify-center py-16 text-text-muted"
        >
          <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
          <span className="sr-only">Loading receipts</span>
        </div>
      ) : loadError ? (
        <Card zone="calm" className="space-y-3 p-6">
          <AlertCircle aria-hidden className="h-6 w-6" />
          <h2 className="text-heading">we couldn’t load your receipts</h2>
          <p role="alert" className="text-body text-text-soft">
            {loadError}
          </p>
          <Button variant="outline" zone="calm" onClick={() => void loadReceipts()}>
            Try again
          </Button>
        </Card>
      ) : visibleReceipts.length === 0 ? (
        <Card zone="calm" className="space-y-3 p-8 text-center">
          <ReceiptText aria-hidden className="mx-auto h-10 w-10" />
          <h2 className="text-title">no receipts found</h2>
          <p className="mx-auto max-w-md text-body text-text-soft">
            {receipts.length === 0
              ? 'Issued receipts will appear here when payments are recorded.'
              : 'Try a different search or currency filter.'}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop and tablet list */}
          <div className="hidden overflow-x-auto rounded-row border border-line-subtle md:block">
            <table className="w-full min-w-[850px] text-left text-body">
              <thead className="bg-surface-tint text-caption text-text-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Payment date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                </tr>
              </thead>
              <tbody>
                {visibleReceipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="border-t border-line-subtle transition-colors hover:bg-surface-tint"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/receipts/${encodeURIComponent(receipt.id)}`}
                        className="font-bold underline-offset-4 hover:underline"
                      >
                        {receipt.receipt_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {receipt.client_name || receipt.payer_name || 'Customer'}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                      >
                        {receipt.invoice_number}
                        <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatDate(receipt.payment_date)}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap font-semibold">
                      <Money
                        amountMinor={receipt.amount_paid_minor}
                        currency={receipt.currency}
                        hideCurrencyCode
                      />
                    </td>
                    <td className="px-4 py-4">
                      {paymentMethodLabel(receipt.payment_method)}
                    </td>
                    <td className="px-4 py-4">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="space-y-3 md:hidden">
            {visibleReceipts.map((receipt) => (
              <li key={receipt.id}>
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
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}