
'use client';

import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Clock3,
  Eye,
  FileText,
  Link2,
} from 'lucide-react';

import { Money } from '@/components/money/Money';
import { PaidStamp } from '@/components/brand';
import { StatusPill } from '@/components/ui/status-pill';

const TOTAL = 45000000;
const AUTO_MS = 3200;

type Step = {
  key: 'sent' | 'viewed' | 'part' | 'paid';
  tab: string;
  headline: string;
  description: string;
  received: number;
};

const STEPS: Step[] = [
  {
    key: 'sent',
    tab: 'Sent',
    headline: 'Invoice sent',
    description: 'Your client has a link to view the invoice and payment instructions.',
    received: 0,
  },
  {
    key: 'viewed',
    tab: 'Viewed',
    headline: 'Your client opened it',
    description: 'You can see that the invoice has been viewed.',
    received: 0,
  },
  {
    key: 'part',
    tab: 'Part paid',
    headline: 'Part payment recorded',
    description: 'A confirmed payment is recorded against the invoice. The remaining balance stays visible.',
    received: 30000000,
  },
  {
    key: 'paid',
    tab: 'Paid',
    headline: 'Invoice paid in full',
    description: 'The full balance is settled. A receipt is ready and payment reminders stop.',
    received: TOTAL,
  },
];

export function ProductPreview() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  const step = STEPS[index];
  const balance = TOTAL - step.received;
  const progress = (step.received / TOTAL) * 100;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (media.matches) {
      setAuto(false);
    }

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setAuto(false);
      }
    };

    media.addEventListener('change', handleChange);

    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!auto || index >= STEPS.length - 1) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, STEPS.length - 1));
    }, AUTO_MS);

    return () => window.clearTimeout(timeoutId);
  }, [auto, index]);

  function selectStep(nextIndex: number) {
    setAuto(false);
    setIndex(nextIndex);
  }

  return (
      <div className="w-full">
        {/* Invoice identity */}
        <div className="flex items-start justify-between gap-4 border-b border-line p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut-sm">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>

            <div className="min-w-0">
              <p className="text-caption font-bold uppercase tracking-wide text-text-muted">
                Invoice example
              </p>
              <h3 className="truncate text-heading font-extrabold text-ink">
                Creative services
              </h3>
            </div>
          </div>

          <span className="shrink-0 border border-line bg-cream px-2 py-1 text-caption font-extrabold text-text-soft">
          NGN
        </span>
        </div>

        {/* Invoice amount */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              Invoice total
            </p>
          </div>

          <p className="mt-2 text-[clamp(2rem,5vw,2.75rem)] font-extrabold leading-none tracking-tight text-ink">
            <Money amountMinor={TOTAL} currency="NGN" hideCurrencyCode />
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-line bg-cream p-3">
              <p className="text-caption font-bold text-text-muted">
                Received
              </p>
              <p className="mt-1 text-heading font-extrabold text-ink">
                <Money
                    amountMinor={step.received}
                    currency="NGN"
                    hideCurrencyCode
                />
              </p>
            </div>

            <div className="border border-line bg-cream p-3">
              <p className="text-caption font-bold text-text-muted">
                Balance
              </p>
              <p className="mt-1 text-heading font-extrabold text-ink">
                <Money
                    amountMinor={balance}
                    currency="NGN"
                    hideCurrencyCode
                />
              </p>
            </div>
          </div>

          {/* Payment progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-caption font-bold text-text-soft">
                Payment progress
              </p>
              <p className="text-caption font-extrabold tabular-nums text-ink">
                {Math.round(progress)}%
              </p>
            </div>

            <div
                className="h-3 overflow-hidden border border-ink bg-surface-sunken"
                role="progressbar"
                aria-label="Example invoice payment progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
            >
              <div
                  className="h-full bg-mango transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="border-t border-line bg-surface-tint p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              Invoice activity
            </p>

            {step.key === 'paid' ? (
                <StatusPill status="paid" />
            ) : (
                <span className="border border-line bg-surface px-2.5 py-1 text-caption font-extrabold text-text-soft">
              {step.tab}
            </span>
            )}
          </div>

          <div className="mt-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-surface text-ink">
            {step.key === 'sent' && (
                <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            {step.key === 'viewed' && (
                <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {step.key === 'part' && (
                <Clock3 className="h-4 w-4" aria-hidden="true" />
            )}
            {step.key === 'paid' && (
                <CircleCheck className="h-4 w-4" aria-hidden="true" />
            )}
          </span>

            <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
              <p className="text-label font-extrabold text-ink">
                {step.headline}
              </p>
              <p className="mt-1 text-caption leading-relaxed text-text-soft">
                {step.description}
              </p>
            </div>
          </div>

          {step.key === 'paid' && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-2 text-caption font-bold text-text-soft">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Payment complete
                </div>
                <PaidStamp />
              </div>
          )}
        </div>

        {/* Interactive stage selector */}
        <div className="border-t border-line p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-caption font-extrabold text-text-muted">
              Explore the journey
            </p>
            <span className="text-caption text-text-muted">
            {index + 1} of {STEPS.length}
          </span>
          </div>

          <div
              className="grid grid-cols-4 gap-1.5"
              role="group"
              aria-label="Choose invoice stage"
          >
            {STEPS.map((item, itemIndex) => {
              const active = itemIndex === index;

              return (
                  <button
                      key={item.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectStep(itemIndex)}
                      className={[
                        'flex min-h-10 items-center justify-center border px-1.5',
                        'text-[11px] font-extrabold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
                        active
                            ? 'border-ink bg-ink text-surface'
                            : 'border-line bg-surface text-text-soft hover:border-ink hover:bg-cream',
                      ].join(' ')}
                  >
                    {item.tab}
                  </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-cream px-4 py-3">
        <span className="text-caption font-bold text-text-muted">
          Bagg · Get-paid workspace
        </span>
          <span className="inline-flex items-center gap-1 text-caption font-extrabold text-ink">
          See the experience
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        </div>
      </div>
  );
}
