
'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';

import { cn } from '@/lib/cn';

interface NeedsAttentionStripProps {
  overdueCount: number;
  claimsCount: number;
  viewedCount: number;
  currency: string;
  className?: string;
}

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: typeof WarningCircle;
  tone: 'danger' | 'warning' | 'neutral';
}

const TONE_STYLES = {
  danger: {
    icon: 'bg-status-late text-status-late-fg',
    count: 'bg-status-late text-status-late-fg',
  },
  warning: {
    icon: 'bg-status-due text-status-due-fg',
    count: 'bg-status-due text-status-due-fg',
  },
  neutral: {
    icon: 'bg-surface-tint text-text',
    count: 'bg-surface-tint text-text',
  },
} as const;

export function NeedsAttentionStrip({
  overdueCount,
  claimsCount,
  viewedCount,
  currency,
  className,
}: NeedsAttentionStripProps) {
  const encodedCurrency = encodeURIComponent(currency);

  const items = [
  {
    id: 'overdue',
    title: 'Overdue invoices',
    description: 'Follow up on invoices past their due date.',
    count: overdueCount,
    href: `/invoices?status=overdue&currency=${encodedCurrency}`,
    icon: WarningCircle,
    tone: 'danger',
  },
  {
    id: 'claims',
    title: 'Payment claims to review',
    description: 'Check payment evidence and confirm legitimate claims.',
    count: claimsCount,
    href: `/invoices?status=payment_claimed&currency=${encodedCurrency}`,
    icon: CheckCircle,
    tone: 'warning',
  },
  {
    id: 'viewed',
    title: 'Viewed invoices awaiting payment',
    description: 'Clients have opened these invoices but payment is outstanding.',
    count: viewedCount,
    href: `/invoices?status=viewed&currency=${encodedCurrency}`,
    icon: Clock,
    tone: 'neutral',
  },
] satisfies AttentionItem[];

const visibleItems = items.filter((item) => item.count > 0);

  return (
    <section
      aria-labelledby="needs-attention-heading"
      className={cn('space-y-3', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="needs-attention-heading"
            className="text-heading font-extrabold text-ink"
          >
            Needs your attention
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            Work that may need a follow-up or decision.
          </p>
        </div>

        {visibleItems.length > 0 && (
          <span className="text-caption font-bold text-text-muted">
            {visibleItems.length} {visibleItems.length === 1 ? 'category' : 'categories'}
          </span>
        )}
      </div>

      {visibleItems.length > 0 ? (
        <div className="divide-y-2 divide-ink border-brut border-ink bg-surface shadow-brut-sm">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const styles = TONE_STYLES[item.tone];

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'group flex min-h-[76px] items-center gap-3 p-4',
                  'transition-colors hover:bg-surface-tint',
                  'focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink',
                  'sm:gap-4 sm:px-5',
                )}
                aria-label={`${item.count} ${item.title}. ${item.description} Open filtered invoices.`}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center',
                    styles.icon,
                  )}
                  aria-hidden
                >
                  <Icon weight="bold" className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-body text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-caption text-text-muted">
                    {item.description}
                  </span>
                </span>

                <span
                  className={cn(
                    'inline-flex min-w-9 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink px-2.5 py-1 text-caption font-black tabular-nums',
                    styles.count,
                  )}
                >
                  {item.count.toLocaleString()}
                </span>

                <ArrowRight
                  aria-hidden
                  weight="bold"
                  className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-1"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 border-brut border-ink bg-surface p-4 shadow-brut-sm sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-status-paid text-status-paid-fg">
            <CheckCircle weight="fill" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold text-body text-ink">
              You’re all caught up
            </p>
            <p className="mt-0.5 text-caption text-text-muted">
              No overdue invoices, payment claims or viewed invoices awaiting payment.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
