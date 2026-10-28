'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  Share2,
} from 'lucide-react';

import { Card, Button, buttonStyles } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { useCurrentBreadcrumb } from '@/components/navigation/BreadcrumbContext';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ReceiptDetail {
   id: string;
  bagg_reference: string;
  receipt_number: string;
  workspace_id: string;
  client_id: string;
  client_name?: string | null;
  invoice_id: string;
  invoice_number: string;
  sequence_number: number;
  currency: string;
  amount_paid_minor: number;
  balance_remaining_minor: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
  payer_name?: string | null;
  notes?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  verification_code: string;
  confirmation_source: string;
  provider?: string | null;
  provider_reference?: string | null;
  share_token?: string | null;
  share_url?: string | null;
  whatsapp_share_url?: string | null;
  created_at: string;
  updated_at: string;
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

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params.id;

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const { setCurrentLabel } = useCurrentBreadcrumb();

  useEffect(() => {
    setCurrentLabel(receipt?.receipt_number ?? null);

    return () => setCurrentLabel(null);
  }, [receipt?.receipt_number, setCurrentLabel]);

  const loadReceipt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/receipts/${encodeURIComponent(receiptId)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw await readError(response, 'Receipt could not be loaded.');
      }

      setReceipt((await response.json()) as ReceiptDetail);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Receipt could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    if (receiptId) void loadReceipt();
  }, [receiptId, loadReceipt]);

  const copyReceiptLink = async () => {
    if (!receipt) return;

    const url = receipt.share_url;

    if (!url) {
      setShareError(
        'There is no public receipt link available for this receipt.',
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError('Could not copy the receipt link. Please copy it manually.');
    }
  };

  const shareReceipt = async () => {
    if (!receipt?.share_url) {
      setShareError(
        'There is no public receipt link available for this receipt.',
      );
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receipt ${receipt.receipt_number}`,
          text: `Payment receipt ${receipt.receipt_number} for invoice ${receipt.invoice_number}.`,
          url: receipt.share_url,
        });
      } else {
        await navigator.clipboard.writeText(receipt.share_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }

      setShareError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setShareError('Could not share the receipt. Try copying its link instead.');
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-[50vh] items-center justify-center text-text-muted"
      >
        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
        <span className="sr-only">Loading receipt</span>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card
          zone="calm"
          className="mx-auto max-w-lg space-y-3 p-8 text-center"
        >
          <AlertCircle aria-hidden className="mx-auto h-9 w-9" />
          <h1 className="text-title">receipt unavailable</h1>
          <p role="alert" className="text-body text-text-soft">
            {error || 'Receipt not found.'}
          </p>
          <Link
            href="/receipts"
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            Back to receipts
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-3">
          <Link
            href="/receipts"
            className={buttonStyles({ variant: 'link' })}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            All receipts
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <ReceiptText aria-hidden className="h-7 w-7" />
            <h1 className="text-title-l sm:text-display">
              {receipt.receipt_number}
            </h1>
          </div>

          <p className="text-body text-text-soft">
            Issued payment receipt · {formatDate(receipt.payment_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            zone="calm"
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer aria-hidden className="h-4 w-4" />
            Print
          </Button>

          <Button
            zone="calm"
            variant="outline"
            onClick={() => void copyReceiptLink()}
            disabled={!receipt.share_url}
          >
            {copied ? (
              <Check aria-hidden className="h-4 w-4" />
            ) : (
              <Copy aria-hidden className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy link'}
          </Button>

          <Button
            zone="calm"
            onClick={() => void shareReceipt()}
            disabled={!receipt.share_url}
          >
            <Share2 aria-hidden className="h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      {shareError && (
        <p
          role="alert"
          className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010] print:hidden"
        >
          {shareError}
        </p>
      )}

      <Card zone="calm" className="space-y-6 p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-caption font-bold uppercase tracking-wide text-text-soft">
              Payment receipt
            </p>
            <h2 className="mt-2 text-title-l">{receipt.receipt_number}</h2>
            <p className="mt-1 text-body text-text-soft">
              Receipt sequence #{receipt.sequence_number}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-caption font-bold',
              receipt.is_verified
                ? 'bg-leaf text-[#052E1B]'
                : 'bg-sun text-[#4A3200]',
            )}
          >
            {receipt.is_verified ? (
              <Check aria-hidden className="h-4 w-4" />
            ) : (
              <AlertCircle aria-hidden className="h-4 w-4" />
            )}
            {receipt.is_verified ? 'Verified' : 'Unverified'}
          </span>
        </div>

        <div className="rounded-row bg-surface-tint p-5">
          <p className="text-body text-text-soft">Amount received</p>
          <p className="mt-2 text-amount-l">
            <Money
              amountMinor={receipt.amount_paid_minor}
              currency={receipt.currency}
              variant="inherit"
            />
          </p>
          <p className="mt-2 text-caption text-text-soft">
            {receipt.currency} · {formatDate(receipt.payment_date)}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Received from
            </h3>
            <p className="mt-2 text-heading">
              {receipt.payer_name || receipt.client_name || 'Customer'}
            </p>
            {receipt.client_name &&
              receipt.payer_name &&
              receipt.client_name !== receipt.payer_name && (
                <p className="mt-1 text-body text-text-soft">
                  Customer account: {receipt.client_name}
                </p>
              )}
          </div>

          <div>
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Related invoice
            </h3>
            <Link
              href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
              className="mt-2 inline-flex items-center gap-2 text-heading underline-offset-4 hover:underline print:no-underline"
            >
              {receipt.invoice_number}
              <ExternalLink
                aria-hidden
                className="h-4 w-4 print:hidden"
              />
            </Link>
          </div>

          <div>
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Payment method
            </h3>
            <p className="mt-2 text-body">
              {paymentMethodLabel(receipt.payment_method)}
            </p>
          </div>

          <div>
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Payment reference
            </h3>
            <p className="mt-2 break-words text-body">
              {receipt.reference || receipt.provider_reference || 'Not provided'}
            </p>
          </div>

          <div>
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Confirmation source
            </h3>
            <p className="mt-2 text-body">
              {paymentMethodLabel(receipt.confirmation_source)}
            </p>
          </div>

          {receipt.provider && (
            <div>
              <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
                Payment provider
              </h3>
              <p className="mt-2 text-body">
                {paymentMethodLabel(receipt.provider)}
              </p>
            </div>
          )}
        </div>

        {receipt.notes && (
          <div className="border-t border-line-subtle pt-5">
            <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-body">
              {receipt.notes}
            </p>
          </div>
        )}

        <div className="border-t border-line-subtle pt-5">
          <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">
            Verification details
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-text-muted">
                Verification code
              </dt>
              <dd className="mt-1 break-all font-mono text-body">
                {receipt.verification_code}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Verified at</dt>
              <dd className="mt-1 text-body">
                {receipt.verified_at
                  ? formatDate(receipt.verified_at)
                  : 'Not recorded'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-3 border-t border-line-subtle pt-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="text-caption text-text-soft">
            Keep this receipt for your records.
          </p>

          <Link
            href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            <FileText aria-hidden className="h-4 w-4" />
            View invoice
          </Link>
        </div>
      </Card>
    </div>
  );
}