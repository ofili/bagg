'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Copy, ExternalLink, MoreHorizontal, Share2 } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { Button } from '@/components/ui';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface QuoteCardData {
  id: string;
  quote_number: string;
  client_name?: string | null;
  currency: string;
  status: string;
  effective_status?: string | null;
  is_expired: boolean;
  issue_date: string;
  expires_at: string;
  net_payable_minor: number;
  share_token?: string | null;
  whatsapp_share_url?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
}

interface QuoteCardProps {
  quote: QuoteCardData;
  onSend?: () => void;
  onConvert?: () => void;
  sending?: boolean;
  converting?: boolean;
}

const menuItemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-row px-3 text-left text-body-l font-medium hover:bg-surface-tint';

export function QuoteCard({ quote: q, onSend, onConvert, sending = false, converting = false }: QuoteCardProps) {
  const [copied, setCopied] = useState(false);
  const effectiveStatus = q.effective_status || q.status;
  const isAccepted = q.status === 'accepted';
  const isConverted = q.status === 'converted';
  const isExpired = (q.is_expired || effectiveStatus === 'expired') && !isAccepted && !isConverted;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/q/${q.share_token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked. The client view link is still in the menu.
    }
  }

  return (
    <article className="rounded-card border border-line-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-body-l font-extrabold">{q.quote_number}</h3>
            {isExpired && (
              <span className="rounded-full bg-[#FFB3B3] px-2 py-0.5 text-caption font-extrabold text-[#5A1010]">
                Expired
              </span>
            )}
          </div>
          <p className="text-body text-text-soft">
            {q.client_name || 'Unnamed client'} · Issued {formatDate(q.issue_date)}
          </p>
          <p
            className={cn(
              'flex items-center gap-1.5 text-body',
              isExpired ? 'font-extrabold text-danger dark:text-[#FFB3A8]' : 'text-text-soft',
            )}
          >
            <Clock aria-hidden className="h-3.5 w-3.5" /> Valid until {formatDate(q.expires_at)}
          </p>
          <StatusPill status={effectiveStatus} />
        </div>

        <div className="text-right">
          <Money amountMinor={q.net_payable_minor} currency={q.currency} className="text-amount-m" hideCurrencyCode />
          <p className="text-caption text-text-muted">{q.currency} · net payable</p>
        </div>

        {q.share_token && (
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-text hover:bg-surface-tint"
                aria-label={`More options for quote ${q.quote_number}`}
              >
                <MoreHorizontal aria-hidden className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent title={`Options for quote ${q.quote_number}`}>
              <div className="space-y-1 p-4">
                <h2 className="px-2 pb-2 text-title">{q.quote_number}</h2>
                <button type="button" onClick={copyLink} className={menuItemClass}>
                  {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
                <SheetClose asChild>
                  <Link href={`/q/${q.share_token}`} target="_blank" className={menuItemClass}>
                    <ExternalLink aria-hidden className="h-4 w-4" /> Preview client view
                  </Link>
                </SheetClose>
                {q.whatsapp_share_url && (
                  <SheetClose asChild>
                    <a href={q.whatsapp_share_url} target="_blank" rel="noopener noreferrer" className={menuItemClass}>
                      <Share2 aria-hidden className="h-4 w-4" /> Share on WhatsApp
                    </a>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* One next step per card */}
      {q.status === 'draft' && onSend && (
        <Button zone="calm" fullWidth className="mt-4" loading={sending} onClick={onSend}>
          Send quote
        </Button>
      )}
      {isAccepted && !isConverted && onConvert && (
        <Button zone="calm" fullWidth className="mt-4" loading={converting} onClick={onConvert}>
          Convert to invoice
        </Button>
      )}
      {isConverted && (
        <Link
          href={q.invoice_id ? `/invoices/${q.invoice_id}` : '/invoices'}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-body font-extrabold text-link underline underline-offset-4 hover:no-underline"
        >
          View invoice {q.invoice_number} <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      )}
    </article>
  );
}
