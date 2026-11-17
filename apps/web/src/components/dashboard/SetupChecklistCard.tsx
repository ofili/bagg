'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CaretDown, Check, Circle, Plus, Sparkle } from '@phosphor-icons/react';
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

interface SetupChecklistCardProps {
  mode: 'hero' | 'slim';
  onMilestonesLoaded?: (dispatched: boolean, paid: boolean) => void;
  className?: string;
}

function hasMilestone(milestones: Milestone[], key: string): boolean {
  return milestones.some((m) => m.key === key && m.completed);
}

export function SetupChecklistCard({
  mode,
  onMilestonesLoaded,
  className,
}: SetupChecklistCardProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [collapsed, setCollapsed] = useState(mode === 'slim');
  const [dismissedCelebration, setDismissedCelebration] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(`${API_BASE}/activation`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API_BASE}/auth/me`, { credentials: 'include', cache: 'no-store' }),
    ])
      .then(async ([actRes, authRes]) => {
        const actData = actRes.ok ? await actRes.json() : null;
        const authData = authRes.ok ? await authRes.json() : null;
        if (!live) return;

        const ms: Milestone[] = actData?.milestones || [];
        setMilestones(ms);
        setOnboardingDone(authData?.workspace?.onboarding_completed === true);

        const dispatched = hasMilestone(ms, 'first_document_dispatched');
        const paid = hasMilestone(ms, 'first_payment_confirmed');

        if (onMilestonesLoaded) {
          onMilestonesLoaded(dispatched, paid);
        }
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [onMilestonesLoaded]);

  const invoiceCreated = hasMilestone(milestones, 'first_invoice_created');
  const quoteCreated = hasMilestone(milestones, 'first_quote_created');
  const documentCreated = invoiceCreated || quoteCreated;
  const documentDispatched = hasMilestone(milestones, 'first_document_dispatched');
  const paymentConfirmed = hasMilestone(milestones, 'first_payment_confirmed');

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
    [onboardingDone, documentCreated, documentDispatched, paymentConfirmed],
  );

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If first payment is confirmed, show the Celebration Card instead of checklist
  if (paymentConfirmed) {
    if (dismissedCelebration) return null;

    return (
      <div
        className={cn(
          'flex items-center justify-between border-brut border-ink bg-peach p-5 shadow-brut-sm',
          className,
        )}
      >
        <div className="flex items-center gap-4">
          <BagCharacter mood="celebrating" size={56} className="shrink-0" />
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
          className="rounded-btn border-brut-thin border-ink bg-surface px-2.5 py-1 text-caption font-extrabold text-ink shadow-brut-sm hover:bg-surface-tint"
        >
          Got it
        </button>
      </div>
    );
  }

  // 1. HERO TEACHING MODE (Full size before first invoice is dispatched)
  if (mode === 'hero') {
    return (
      <section
        aria-labelledby="first-steps-heading"
        className={cn(
          'border-brut border-ink bg-status-pending p-6 shadow-brut sm:p-7',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Your first steps
          </p>
          <span className="rounded-full border-brut-thin border-ink bg-surface px-2.5 py-0.5 text-caption font-black text-ink">
            {completedCount} of {steps.length} done
          </span>
        </div>

        <h2
          id="first-steps-heading"
          className="mt-2 text-title font-black text-ink"
        >
          Let us get your first invoice moving
        </h2>

        {/* Progress Bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full border border-ink bg-surface">
          <div
            className="h-full rounded-full bg-leaf transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 4 Steps */}
        <ol className="mt-5 space-y-3">
          {steps.map((step, idx) => (
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
                    {idx + 1}.
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

        {/* Primary CTA */}
        <div className="mt-6">
          <Link
            href="/invoices/new"
            className={buttonStyles({ variant: 'accent', size: 'lg', fullWidth: true })}
          >
            <Plus aria-hidden className="h-4 w-4" />
            Create invoice
          </Link>
        </div>
      </section>
    );
  }

  // 2. SLIM PROGRESS BAR (Money mode, sits below attention strip on mobile or in right column on desktop)
  return (
    <div
      className={cn(
        'border-brut border-ink bg-surface p-4 shadow-brut-sm transition-all',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-extrabold text-caption uppercase tracking-wider text-text-muted">
            Setup
          </span>
          <span className="font-extrabold text-body text-ink">
            {completedCount} of {steps.length} done
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          className="flex items-center gap-1 text-caption font-extrabold text-link hover:underline"
        >
          <span>{collapsed ? 'View steps' : 'Hide'}</span>
          <CaretDown
            aria-hidden
            className={cn('h-3.5 w-3.5 transition-transform duration-200', !collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Slim Progress Bar */}
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full border border-ink bg-surface-sunken">
        <div
          className="h-full rounded-full bg-leaf transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Expanded Step Checklist */}
      {!collapsed && (
        <ol className="mt-4 space-y-2 border-t border-line-subtle pt-3 text-caption">
          {steps.map((step, idx) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  'flex items-center justify-between py-1.5 font-bold transition-colors hover:text-link',
                  step.done ? 'text-text-muted line-through' : 'text-ink',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted">{idx + 1}.</span>
                  <span>{step.label}</span>
                </div>
                {step.done ? (
                  <Check weight="bold" className="h-3.5 w-3.5 text-leaf shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-text-muted shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
