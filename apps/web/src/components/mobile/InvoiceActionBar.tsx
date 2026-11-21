
'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  ReceiptText,
  Share2,
} from 'lucide-react';

import { Button } from '@/components/ui';
import {
  Sheet,
  SheetClose,
  SheetContent,
} from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

export interface InvoiceActionBarProps {
  status: string;
  pendingClaims: number;
  canRecordPayment: boolean;
  busy: boolean;
  onIssue: () => void;
  onSend: () => void;
  onRecord: () => void;
  onReviewClaims: () => void;
  copied: boolean;
  onCopy: () => void;
  clientViewHref?: string;
  whatsappHref?: string;
  receiptHref?: string;
}

const rowClass = [
  'flex min-h-14 w-full items-center gap-3 px-3',
  'text-left text-body-l font-extrabold',
  'hover:bg-surface-tint',
].join(' ');

export function InvoiceActionBar(p: InvoiceActionBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  let primary: { label: string; run: () => void } | null = null;

  if (p.pendingClaims > 0) {
    primary = {
      label:
        p.pendingClaims > 1
          ? `Review ${p.pendingClaims} payments`
          : 'Review payment',
      run: p.onReviewClaims,
    };
  } else if (p.status === 'draft') {
    primary = {
      label: 'Approve & issue',
      run: p.onIssue,
    };
  } else if (['issued', 'sent', 'viewed'].includes(p.status)) {
    primary = {
      label: p.status === 'issued' ? 'Send invoice' : 'Send again',
      run: p.onSend,
    };
  } else if (p.canRecordPayment) {
    primary = {
      label: 'Record payment',
      run: p.onRecord,
    };
  }

  const showRecordSecondary =
    p.canRecordPayment &&
    p.status !== 'draft' &&
    primary?.label !== 'Record payment';

  const hasMore = Boolean(
    p.clientViewHref ||
      p.whatsappHref ||
      p.receiptHref,
  );

  const hasActions = Boolean(
    primary || showRecordSecondary || hasMore,
  );

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <div
        className={[
          'safe-bottom fixed inset-x-0 bottom-0 z-40',
          'border-t-brut border-ink bg-surface px-4 pt-3 sm:hidden',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 pb-3">
          {hasMore && (
            <button
              type="button"
              aria-label="More actions"
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center',
                'rounded-btn border-brut border-ink bg-surface',
                'focus-visible:outline focus-visible:outline-2',
                'focus-visible:outline-offset-2 focus-visible:outline-ink',
              ].join(' ')}
            >
              <MoreHorizontal
                aria-hidden
                className="h-5 w-5"
              />
            </button>
          )}

          {showRecordSecondary && (
            <Button
              variant="outline"
              zone="calm"
              size="lg"
              onClick={p.onRecord}
            >
              <ReceiptText aria-hidden className="h-4 w-4" />
              Record
            </Button>
          )}

          {primary && (
            <Button
              size="lg"
              fullWidth
              zone="expressive"
              loading={p.busy}
              onClick={primary.run}
            >
              {primary.label}
            </Button>
          )}
        </div>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent title="More invoice actions">
          <div className="space-y-1 p-4 pb-8">
            <h2 className="px-2 pb-2 text-title">
              More actions
            </h2>

            {p.clientViewHref && (
              <button
                type="button"
                className={rowClass}
                onClick={p.onCopy}
              >
                {p.copied ? (
                  <Check aria-hidden className="h-5 w-5" />
                ) : (
                  <Copy aria-hidden className="h-5 w-5" />
                )}
                {p.copied ? 'Link copied' : 'Copy client link'}
              </button>
            )}

            {p.whatsappHref && (
              <SheetClose asChild>
                <a
                  href={p.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass}
                >
                  <Share2 aria-hidden className="h-5 w-5" />
                  Share on WhatsApp
                </a>
              </SheetClose>
            )}

            {p.clientViewHref && (
              <SheetClose asChild>
                <Link
                  href={p.clientViewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass}
                >
                  <ExternalLink
                    aria-hidden
                    className="h-5 w-5"
                  />
                  See client view
                </Link>
              </SheetClose>
            )}

            {p.receiptHref && (
              <SheetClose asChild>
                <Link
                  href={p.receiptHref}
                  className={rowClass}
                >
                  <FileText
                    aria-hidden
                    className="h-5 w-5"
                  />
                  Official receipt
                </Link>
              </SheetClose>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
