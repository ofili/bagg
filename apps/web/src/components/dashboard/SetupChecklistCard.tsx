
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CaretDown,
  Check,
  Circle,
  Plus,
  Sparkle,
  X,
} from '@phosphor-icons/react';

import { BagCharacter } from '@/components/brand';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface Milestone {
  key: string;
  completed: boolean;
}

interface StepItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export type SetupVisibility = 'expanded' | 'minimized' | 'dismissed';

interface SetupChecklistCardProps {
  mode: 'hero' | 'slim';
  visibility: SetupVisibility;
  onVisibilityChange: (visibility: SetupVisibility) => void;
  onMilestonesLoaded?: (dispatched: boolean, paid: boolean) => void;
  className?: string;
}

function hasMilestone(milestones: Milestone[], key: string): boolean {
  return milestones.some((milestone) => milestone.key === key && milestone.completed);
}

export function SetupChecklistCard({
  mode,
  visibility,
  onVisibilityChange,
  onMilestonesLoaded,
  className,
}: SetupChecklistCardProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [dismissedCelebration, setDismissedCelebration] = useState(false);

  useEffect(() => {
    let live = true;

    Promise.all([
      fetch(`${API_BASE}/activation`, {
        credentials: 'include',
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      }),
    ])
      .then(async ([actRes, authRes]) => {
        const actData = actRes.ok ? await actRes.json() : null;
        const authData = authRes.ok ? await authRes.json() : null;

        if (!live) return;

        const nextMilestones: Milestone[] = Array.isArray(actData?.milestones)
          ? actData.milestones
          : [];

        setMilestones(nextMilestones);
        setOnboardingDone(
          authData?.workspace?.onboarding_completed === true,
        );

        const dispatched = hasMilestone(
          nextMilestones,
          'first_document_dispatched',
        );
        const paid = hasMilestone(
          nextMilestones,
          'first_payment_confirmed',
        );

        onMilestonesLoaded?.(dispatched, paid);
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [onMilestonesLoaded]);

  const invoiceCreated = hasMilestone(milestones, 'first_invoice_created');
  const quoteCreated = hasMilestone(milestones, 'first_quote_created');
  const documentCreated = invoiceCreated || quoteCreated;
  const documentDispatched = hasMilestone(
    milestones,
    'first_document_dispatched',
  );
  const paymentConfirmed = hasMilestone(
    milestones,
    'first_payment_confirmed',
  );

  const steps: StepItem[] = useMemo(
    () => [
      {
        id: 'business',
        label: 'Set up your business',
        done: onboardingDone,
        href: '/onboarding',
      },
      {
        id: 'invoice',
        label: 'Create your first invoice',
        done: documentCreated,
        href: '/invoices/new',
      },
      {
        id: 'send',
        label: 'Send your first document',
        done: documentDispatched,
        href: '/invoices',
      },
      {
        id: 'payment',
        label: 'Record your first payment',
        done: paymentConfirmed,
        href: '/invoices',
      },
    ],
    [
      onboardingDone,
      documentCreated,
      documentDispatched,
      paymentConfirmed,
    ],
  );

  const completedCount = steps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Keep the first-payment celebration independent of checklist visibility.
  if (paymentConfirmed) {
    if (dismissedCelebration) return null;

    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-brut border-ink bg-peach p-5 shadow-brut-sm',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <BagCharacter
            mood="celebrating"
            size={56}
            className="shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-ink">
              <Sparkle weight="fill" className="h-4 w-4 text-mango" />
              First payment received!
            </div>
            <p className="mt-0.5 text-caption text-text-soft">
              Your cashflow is in motion. Keep creating and sharing invoices.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissedCelebration(true)}
          className="shrink-0 rounded-btn border-brut-thin border-ink bg-surface px-2.5 py-1 text-caption font-extrabold text-ink shadow-brut-sm hover:bg-surface-tint"
        >
          Got it
        </button>
      </div>
    );
  }

  if (visibility === 'dismissed') {
    return null;
  }

  const visibilityControls = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onVisibilityChange('minimized')}
        aria-label="Minimize setup guide"
        title="Minimize setup guide"
        className="inline-flex h-8 w-8 items-center justify-center rounded-btn border-brut-thin border-ink bg-surface text-ink hover:bg-surface-tint"
      >
        <CaretDown aria-hidden className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onVisibilityChange('dismissed')}
        aria-label="Close setup guide"
        title="Close setup guide"
        className="inline-flex h-8 w-8 items-center justify-center rounded-btn border-brut-thin border-ink bg-surface text-ink hover:bg-surface-tint"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );

  if (visibility === 'minimized') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-brut border-ink bg-surface p-3 shadow-brut-sm',
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
              Setup
            </span>
            <span className="text-body font-extrabold text-ink">
              {completedCount} of {steps.length} done
            </span>
          </div>

          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full border border-ink bg-surface-sunken"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={completedCount}
          >
            <div
              className="h-full rounded-full bg-leaf transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onVisibilityChange('expanded')}
            className="rounded-btn border-brut-thin border-ink bg-surface px-3 py-2 text-caption font-extrabold text-ink shadow-brut-sm hover:bg-surface-tint"
          >
            Expand
          </button>

          <button
            type="button"
            onClick={() => onVisibilityChange('dismissed')}
            aria-label="Close setup guide"
            title="Close setup guide"
            className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-text-muted hover:bg-surface-tint hover:text-ink"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'hero') {
    return (
      <section
        aria-labelledby="first-steps-heading"
        className={cn(
          'border-brut border-ink bg-status-pending p-6 shadow-brut sm:p-7',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Your first steps
          </p>

          <div className="flex items-center gap-2">
            <span className="rounded-full border-brut-thin border-ink bg-surface px-2.5 py-0.5 text-caption font-black text-ink">
              {completedCount} of {steps.length} done
            </span>
            {visibilityControls}
          </div>
        </div>

        <h2
          id="first-steps-heading"
          className="mt-2 text-title font-black text-ink"
        >
          Let us get your first invoice moving
        </h2>

        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full border border-ink bg-surface"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={completedCount}
        >
          <div
            className="h-full rounded-full bg-leaf transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  'flex items-center justify-between rounded-btn border-brut-thin p-3 text-body font-extrabold transition-colors',
                  step.done
                    ? 'border-ink/50 bg-surface/80 text-text-muted line-through'
                    : 'border-ink bg-surface text-ink shadow-brut-sm hover:bg-surface-tint',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-caption font-black text-text-muted">
                    {index + 1}.
                  </span>
                  <span>{step.label}</span>
                </div>

                {step.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf text-surface">
                    <Check weight="bold" className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <Circle weight="bold" className="h-4 w-4 text-text-muted" />
                )}
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <Link
            href="/invoices/new"
            className={buttonStyles({
              variant: 'accent',
              size: 'lg',
              fullWidth: true,
            })}
          >
            <Plus aria-hidden className="h-4 w-4" />
            Create invoice
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div
      className={cn(
        'border-brut border-ink bg-surface p-4 shadow-brut-sm transition-all',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Setup
          </span>
          <span className="text-body font-extrabold text-ink">
            {completedCount} of {steps.length} done
          </span>
        </div>

        {visibilityControls}
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full border border-ink bg-surface-sunken"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completedCount}
      >
        <div
          className="h-full rounded-full bg-leaf transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2 border-t border-line-subtle pt-3 text-caption">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                'flex items-center justify-between py-1.5 font-bold transition-colors hover:text-link',
                step.done ? 'text-text-muted line-through' : 'text-ink',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">
                  {index + 1}.
                </span>
                <span>{step.label}</span>
              </div>

              {step.done ? (
                <Check
                  weight="bold"
                  className="h-3.5 w-3.5 shrink-0 text-leaf"
                />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}