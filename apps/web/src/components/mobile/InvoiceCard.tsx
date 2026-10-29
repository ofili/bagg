'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, FileDown, MoreHorizontal, Share2 } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { Button, buttonStyles } from '@/components/ui';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface InvoiceCardProps {
  id: string;
  invoiceNumber: string;
  clientName?: string | null;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  status: string;
  effectiveStatus?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  paymentState?: string;
  shareToken?: string | null;
  latestReceipt?: { share_token?: string | null; confirmation_source?: string | null } | null;
  dueDate: string;
  /** Issuer only: opens the payment claim review when the client says they paid. */
  onReviewClaim?: () => void;
  /** Issuer only: asks the API for a polite WhatsApp reminder link. Shown on overdue invoices. */
  onNudge?: () => void;
}

const menuItemClass = 'flex min-h-11 w-full items-center gap-3 rounded-row px-3 text-body-l font-medium hover:bg-surface-tint';

export function InvoiceCard({
  id,
  invoiceNumber,
  clientName,
  currency,
  totalMinor,
  amountPaidMinor,
  status,
  effectiveStatus,
  isOverdue = false,
  daysOverdue = 0,
  paymentState,
  shareToken,
  dueDate,
  onReviewClaim,
  onNudge,
}: InvoiceCardProps) {
  const [copied, setCopied] = useState(false);
  const displayStatus = effectiveStatus || status;
  const balanceMinor = Math.max(0, totalMinor - amountPaidMinor);
  const isPaid = displayStatus === 'paid' || paymentState === 'paid';

  const publicUrl = () => `${window.location.origin}/i/${shareToken}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin or permissions). The link is still on the invoice page.
    }
  }

  const whatsappHref = shareToken
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${clientName || 'there'}, here is invoice ${invoiceNumber}: ${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/i/${shareToken}`,
      )}`
    : undefined;

  return (
    <article className="rounded-card border border-line-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-body-l font-extrabold">{invoiceNumber}</h3>
            {isOverdue && (
              <span className="rounded-full bg-[#FFB3B3] px-2 py-0.5 text-caption font-extrabold text-[#5A1010]">
                {daysOverdue > 0 ? `${daysOverdue} days late` : 'Past due'}
              </span>
            )}
          </div>
          <p className="text-body text-text-soft">
            {clientName || 'Client'} · Due {formatDate(dueDate)}
          </p>
          <StatusPill status={displayStatus} />
        </div>

        <div className="text-right">
          <Money
            amountMinor={isPaid ? amountPaidMinor : balanceMinor}
            currency={currency}
            variant={isPaid ? 'paid' : 'total'}
            className="text-amount-m"
            hideCurrencyCode
          />
          {!isPaid && balanceMinor > 0 && balanceMinor < totalMinor && (
            <p className="text-caption text-text-muted">
              of <Money amountMinor={totalMinor} currency={currency} variant="muted" hideCurrencyCode />
            </p>
          )}
          <p className="text-caption text-text-muted">{currency}</p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-text hover:bg-surface-tint"
              aria-label={`More options for invoice ${invoiceNumber}`}
            >
              <MoreHorizontal aria-hidden className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent title={`Options for invoice ${invoiceNumber}`}>
            <div className="space-y-1 p-4">
              <h2 className="px-2 pb-2 text-title">{invoiceNumber}</h2>
              <SheetClose asChild>
                <Link href={`/invoices/${id}`} className={menuItemClass}>
                  <ExternalLink aria-hidden className="h-4 w-4" /> View details
                </Link>
              </SheetClose>
              {shareToken && (
                <button type="button" onClick={copyLink} className={cn(menuItemClass, 'text-left')}>
                  {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
              )}
              {shareToken && (
                <a
                  href={`${API_BASE}/invoices/${id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={menuItemClass}
                >
                  <FileDown aria-hidden className="h-4 w-4" /> Download PDF
                </a>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {displayStatus === 'payment_claimed' && onReviewClaim && (
        <Button zone="calm" fullWidth className="mt-4" onClick={onReviewClaim}>
          Review payment claim
        </Button>
      )}

      {isOverdue && onNudge && displayStatus !== 'payment_claimed' && !isPaid && (
        <Button variant="outline" zone="calm" fullWidth className="mt-4" onClick={onNudge}>
          <Share2 aria-hidden className="h-4 w-4" /> Send a nudge on WhatsApp
        </Button>
      )}

      {whatsappHref && !isPaid && displayStatus !== 'payment_claimed' && !(isOverdue && onNudge) && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonStyles({ variant: 'outline', zone: 'calm', fullWidth: true }), 'mt-4')}
        >
          <Share2 aria-hidden className="h-4 w-4" /> Share on WhatsApp
        </a>
      )}
    </article>
  );
}
