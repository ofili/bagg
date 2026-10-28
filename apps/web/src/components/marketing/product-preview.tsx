'use client';

import { useEffect, useState } from 'react';
import { PaidStamp } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/ui/status-pill';

const TOTAL = 45000000;

type Step = {
  key: string;
  tab: string;
  pill: string;
  headline: string;
  detail: string;
  paid: number;
};

const STEPS: Step[] = [
  {
    key: 'sent',
    tab: 'sent',
    pill: 'sent',
    headline: 'sent on WhatsApp',
    detail: 'Chidi has the link. Nothing for him to download or sign up for.',
    paid: 0,
  },
  {
    key: 'viewed',
    tab: 'viewed',
    pill: 'viewed',
    headline: 'Chidi opened it',
    detail: 'You see it the moment he does, so you know it landed.',
    paid: 0,
  },
  {
    key: 'part',
    tab: 'part paid',
    pill: 'part paid',
    headline: 'part payment recorded',
    detail: 'A reminder for the balance is scheduled for 3 Nov.',
    paid: 30000000,
  },
  {
    key: 'paid',
    tab: 'paid',
    pill: 'paid',
    headline: 'paid in full',
    detail: 'Receipt REC-0018 is ready. Reminders stopped on their own.',
    paid: TOTAL,
  },
];

const AUTO_MS = 3200;

export function ProductPreview() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  // Play through the story once, then rest on "paid". Skipped entirely for
  // reduced-motion users, who start on the part-paid state instead.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAuto(false);
      setIndex(2);
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    if (index >= STEPS.length - 1) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setIndex((i) => i + 1), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [auto, index]);

  const step = STEPS[index];
  const balance = TOTAL - step.paid;

  return (
    <figure
      className="relative mx-auto w-full max-w-[22rem]"
      aria-label="Example: invoice 0041 sent to a client on WhatsApp, then viewed, part paid and paid in full"
    >
      <div
        className="absolute -inset-3 rotate-2 rounded-[2.5rem] bg-peach-chip"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface">
        {/* chat header */}
        <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-peach-chip text-caption font-extrabold text-ink"
            aria-hidden="true"
          >
            C
          </span>
          <div className="leading-tight">
            <p className="text-label font-extrabold text-ink">Chidi</p>
            <p className="text-caption text-ink-muted">client</p>
          </div>
        </div>

        {/* chat */}
        <div className="space-y-2 bg-sunken px-4 py-4">
          <div className="ml-auto max-w-[88%] rounded-row bg-surface p-3 shadow-sheet">
            <p className="text-body text-ink-soft">
              Hi Chidi, here is invoice 0041 for{' '}
              <Money amountMinor={TOTAL} currency="NGN" className="text-ink" />, due 4 Nov. The
              payment details are on the page.
            </p>
            <div className="mt-2 flex items-center gap-3 rounded-row border border-line-subtle bg-canvas p-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mango text-caption font-extrabold text-on-mango"
                aria-hidden="true"
              >
                ₦
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-label font-extrabold text-ink">
                  Invoice 0041 · Tolu Studio
                </p>
                <p className="text-caption text-ink-muted">Tap to view and pay</p>
              </div>
            </div>
          </div>
        </div>

        {/* your side */}
        <div className="border-t border-line-subtle px-4 pb-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-extrabold text-ink-muted">what you see</p>
            {step.key === 'paid' ? (
              <StatusPill status="paid" />
            ) : (
              <span
                className={
                  step.key === 'part'
                    ? 'rounded-full bg-pill-due px-2.5 py-0.5 text-caption font-extrabold text-pill-due-fg'
                    : 'rounded-full bg-tint px-2.5 py-0.5 text-caption font-extrabold text-ink-soft'
                }
              >
                {step.pill}
              </span>
            )}
          </div>

          <div className="mt-3 rounded-row bg-sunken p-4" aria-live="polite">
            <p className="text-caption font-extrabold text-ink-soft">{step.headline}</p>
            <p className="mt-1 text-amount-l text-ink">
              <Money
                amountMinor={step.key === 'paid' ? TOTAL : balance}
                currency="NGN"
                hideCurrencyCode
              />
            </p>
            <p className="text-caption text-ink-muted">
              {step.key === 'paid' ? 'total received' : 'still to pay'}
            </p>
            <p className="mt-3 text-body text-ink-soft">{step.detail}</p>
            {step.key === 'paid' && (
              <div className="mt-3">
                <PaidStamp />
              </div>
            )}
          </div>

          {/* step selector */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Invoice stage">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={i === index}
                onClick={() => {
                  setAuto(false);
                  setIndex(i);
                }}
                className={
                  i === index
                    ? 'min-h-9 rounded-full bg-ink px-3 text-caption font-extrabold text-surface'
                    : 'min-h-9 rounded-full bg-surface px-3 text-caption font-extrabold text-ink-soft ring-1 ring-line hover:bg-tint'
                }
              >
                {s.tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}