'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, CheckCircle2, Copy, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { Money } from '@/components/money/Money';
import { ConfirmationProvenance } from '@/components/status';
import { Button, Card, buttonStyles } from '@/components/ui';
import { formatDate } from '@/lib/date';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PublicReceiptData {
  id: string;
  receipt_number: string;
  invoice_number: string;
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
  confirmation_source?: string;
  provider?: string | null;
  notes?: string | null;
  business_name: string;
  business_logo_url?: string | null;
  business_brand_color?: string | null;
  client_name?: string | null;
  show_badge: boolean;
}

export default function PublicReceiptPage() {
  const params = useParams();
  const token = params?.token as string;

  const [receipt, setReceipt] = useState<PublicReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/receipts/share/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Receipt not found or link has expired.');
          } else {
            const errData = await res.json().catch(() => ({}));
            setError(errData.detail || 'Unable to load receipt details.');
          }
          return;
        }
        const data: PublicReceiptData = await res.json();
        setReceipt(data);
      } catch {
        setError('Network error while loading receipt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleCopyCode = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.verification_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Clipboard can be blocked; the code is still on screen to copy by hand.
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream p-6 text-text-muted">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin" />
        <p className="text-body">Loading your receipt</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream p-6">
        <Card zone="calm" className="w-full max-w-md space-y-4 p-6 text-center">
          <AlertCircle aria-hidden className="mx-auto h-10 w-10" />
          <h1 className="text-title">receipt unavailable</h1>
          <p className="text-body text-text-soft">{error || 'Receipt could not be found.'}</p>
          <Link href="/" className={buttonStyles({ variant: 'outline', zone: 'calm' })}>
            Visit bagg
          </Link>
        </Card>
      </div>
    );
  }

  const brandColor = receipt.business_brand_color || 'var(--bagg-mango)';
  const methodLabel = receipt.payment_method
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
  const initials = (receipt.business_name || 'b')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toLowerCase();

  return (
    <div className="min-h-dvh bg-cream p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        {receipt.is_verified && (
          <Card zone="calm" tone="peach" className="flex items-start gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-body font-extrabold">Payment verified</p>
              <p className="text-body text-text-soft">
                This is an official payment receipt issued on{' '}
                {formatDate(receipt.verified_at || receipt.payment_date)}.
              </p>
            </div>
          </Card>
        )}

        <article className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="h-1.5" style={{ backgroundColor: brandColor }} />

          <div className="space-y-6 p-5 sm:p-6">
            {/* Who issued it */}
            <header className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {receipt.business_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={receipt.business_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-body font-extrabold"
                  >
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-heading">{receipt.business_name}</h1>
                  <p className="text-body text-text-soft">Official payment receipt</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-caption text-text-muted">Receipt</p>
                <p className="tabular text-title">{receipt.receipt_number}</p>
              </div>
            </header>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-text-soft">
              <span className="inline-flex items-center gap-1.5">
                <FileText aria-hidden className="h-3.5 w-3.5" /> Invoice {receipt.invoice_number}
              </span>
              <span>{formatDate(receipt.payment_date)}</span>
              <span>
                Paid by{' '}
                <span className="font-medium text-text">{receipt.payer_name || receipt.client_name || 'Client'}</span>
              </span>
            </p>

            {/* Amount and the one paid stamp */}
            <div className="space-y-3 rounded-row bg-surface-sunken p-5 text-center">
              <p className="text-body text-text-soft">Amount received</p>
              <Money
                amountMinor={receipt.amount_paid_minor}
                currency={receipt.currency}
                variant="paid"
                className="block text-amount-l sm:text-amount-xl"
                hideCurrencyCode
              />
              <p className="text-caption text-text-muted">{receipt.currency}</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-1.5 text-body font-extrabold text-[#052E1B]">
                <CheckCircle2 aria-hidden className="h-4 w-4" /> Paid and verified
              </span>
            </div>

            {/* Details */}
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-text-muted">Payment method</dt>
                <dd className="text-body font-medium">{methodLabel}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-text-muted">Reference or session ID</dt>
                <dd className="tabular break-all text-body font-medium">{receipt.reference || 'None given'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-text-muted">Confirmed by</dt>
                <dd>
                  <ConfirmationProvenance source={receipt.confirmation_source} provider={receipt.provider} />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">Balance left on the invoice</dt>
                <dd className="text-body font-medium">
                  {receipt.balance_remaining_minor === 0 ? (
                    'Fully settled'
                  ) : (
                    <>
                      <Money amountMinor={receipt.balance_remaining_minor} currency={receipt.currency} variant="inherit" />{' '}
                      outstanding
                    </>
                  )}
                </dd>
              </div>
              {receipt.notes && (
                <div>
                  <dt className="text-caption text-text-muted">Notes</dt>
                  <dd className="text-body text-text-soft">{receipt.notes}</dd>
                </div>
              )}
            </dl>

            {/* Verification code */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
              <div>
                <p className="text-caption text-text-muted">Verification code</p>
                <p className="tabular text-body font-extrabold">{receipt.verification_code}</p>
              </div>
              <Button variant="outline" zone="calm" onClick={handleCopyCode}>
                {copiedCode ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                {copiedCode ? 'Copied' : 'Copy code'}
              </Button>
            </div>

            <p className="border-t border-line-subtle pt-4 text-center text-caption text-text-muted">
              This document constitutes valid legal proof of payment issued via Bagg. The verification code can be used
              to confirm authenticity.
            </p>
          </div>
        </article>

        {receipt.show_badge && (
          <div className="text-center">
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-2 text-caption text-text-muted hover:text-text"
            >
              <BaggCoin size={20} />
              <span>Sent with bagg. Instant receipts for African freelancers.</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
