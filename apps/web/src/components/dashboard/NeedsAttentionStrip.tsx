'use client';

import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { BagCharacter } from '@/components/brand';
import { cn } from '@/lib/cn';

export interface AttentionItem {
  id: string;
  dotColor: string;
  title: string;
  count: number;
  href: string;
}

interface NeedsAttentionStripProps {
  overdueCount: number;
  claimsCount: number;
  viewedCount: number;
  quotesCount?: number;
  currency: string;
  className?: string;
}

export function NeedsAttentionStrip({
  overdueCount,
  claimsCount,
  viewedCount,
  quotesCount = 0,
  currency,
  className,
}: NeedsAttentionStripProps) {
  const items: AttentionItem[] = [];

  if (overdueCount > 0) {
    items.push({
      id: 'overdue',
      dotColor: 'bg-status-late-fg',
      title: `${overdueCount.toLocaleString()} invoice${overdueCount === 1 ? '' : 's'} overdue`,
      count: overdueCount,
      href: `/invoices?status=overdue&currency=${encodeURIComponent(currency)}`,
    });
  }

  if (claimsCount > 0) {
    items.push({
      id: 'claims',
      dotColor: 'bg-status-due-fg',
      title: `${claimsCount.toLocaleString()} payment claim${claimsCount === 1 ? '' : 's'} to confirm`,
      count: claimsCount,
      href: `/invoices?status=payment_claimed&currency=${encodeURIComponent(currency)}`,
    });
  }

  if (viewedCount > 0) {
    items.push({
      id: 'viewed',
      dotColor: 'bg-status-pending-fg',
      title: `${viewedCount.toLocaleString()} invoice${viewedCount === 1 ? '' : 's'} viewed but not paid`,
      count: viewedCount,
      href: `/invoices?status=viewed&currency=${encodeURIComponent(currency)}`,
    });
  }

  if (quotesCount > 0) {
    items.push({
      id: 'quotes',
      dotColor: 'bg-status-draft-fg',
      title: `${quotesCount.toLocaleString()} quote${quotesCount === 1 ? '' : 's'} waiting for a reply`,
      count: quotesCount,
      href: '/quotes?status=sent',
    });
  }

  // Max 3 rows per specification
  const displayedItems = items.slice(0, 3);

  return (
    <section aria-labelledby="needs-attention-heading" className={cn('space-y-2', className)}>
      <h2
        id="needs-attention-heading"
        className="text-heading font-extrabold text-ink"
      >
        Needs your attention
      </h2>

      {displayedItems.length > 0 ? (
        <div className="border-brut border-ink bg-surface shadow-brut-sm divide-y-2 divide-ink">
          {displayedItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between p-4 transition-colors hover:bg-surface-tint active:bg-surface-sunken"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn('h-3 w-3 shrink-0 rounded-full', item.dotColor)}
                  aria-hidden
                />
                <span className="font-extrabold text-body text-ink">
                  {item.title}
                </span>
              </div>

              <CaretRight aria-hidden weight="bold" className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State with Happy Mascot - so the strip never silently vanishes */
        <div className="flex items-center gap-4 border-brut border-ink bg-surface p-5 shadow-brut-sm">
          <BagCharacter mood="happy" size={52} className="shrink-0" />
          <div>
            <p className="font-extrabold text-body text-ink">
              Nothing needs you yet. Nice and calm.
            </p>
            <p className="mt-0.5 text-caption text-text-muted">
              Overdue invoices, unconfirmed payments, and viewed quotes will appear here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
