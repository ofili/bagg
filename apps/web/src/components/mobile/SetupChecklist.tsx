
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  RotateCcw,
  X,
} from 'lucide-react';

import { BagCharacter } from '@/components/brand';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

type ActivationStatus =
  | 'in_progress'
  | 'initially_activated'
  | 'commercially_activated';

type ActivationMilestone = {
  key: string;
  completed: boolean;
  completed_at: string | null;
};

type ActivationResponse = {
  activation_status: ActivationStatus;
  milestones: ActivationMilestone[];
  next_recommended_action: {
    key: string;
    href: string;
  };
  checklist_dismissed: boolean;
};

type AuthResponse = {
  workspace?: {
    onboarding_completed?: boolean;
    default_currency?: string;
  };
};

type Step = {
  key: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
};

type PaymentProfileValidation = {
  has_profile?: boolean;
};

type ChecklistEvent =
  | 'activation.checklist_dismissed'
  | 'activation.checklist_resumed';

function milestoneCompleted(
  milestones: ActivationMilestone[],
  key: string,
): boolean {
  return milestones.some(
    (milestone) =>
      milestone.key === key && milestone.completed,
  );
}

async function recordChecklistEvent(
  eventName: ChecklistEvent,
): Promise<void> {
  const response = await fetch(`${API_BASE}/analytics/events`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_id: crypto.randomUUID(),
      event_name: eventName,
      event_version: 1,
      properties: {
        surface: 'dashboard',
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Could not update checklist preference.');
  }
}

export function SetupChecklist() {
  const [activation, setActivation] =
    useState<ActivationResponse | null>(null);

  const [workspace, setWorkspace] =
    useState<AuthResponse['workspace'] | null>(null);

  const [hasPaymentProfile, setHasPaymentProfile] =
    useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bagg_setup_collapsed');
      if (stored === 'true') {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bagg_setup_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setPreferenceError('');

    try {
      const options = {
        credentials: 'include' as const,
        cache: 'no-store' as const,
      };

      const [activationResponse, authResponse] =
        await Promise.all([
          fetch(`${API_BASE}/activation`, options),
          fetch(`${API_BASE}/auth/me`, options),
        ]);

      if (!activationResponse.ok || !authResponse.ok) {
        throw new Error('Could not load activation progress.');
      }

      const [activationData, authData] = await Promise.all([
        activationResponse.json() as Promise<ActivationResponse>,
        authResponse.json() as Promise<AuthResponse>,
      ]);

      setActivation(activationData);
      setWorkspace(authData.workspace ?? null);

      // Payment setup is contextual, not a required checklist step.
      // Only check it after the first document has been dispatched.
      const dispatched = milestoneCompleted(
        activationData.milestones,
        'first_document_dispatched',
      );

      if (dispatched) {
        const currency =
          authData.workspace?.default_currency || 'NGN';

        try {
          const profileResponse = await fetch(
            `${API_BASE}/payments/profiles/validate/${encodeURIComponent(currency)}`,
            options,
          );

          if (profileResponse.ok) {
            const profileData =
              (await profileResponse.json()) as PaymentProfileValidation;

            setHasPaymentProfile(
              profileData.has_profile === true,
            );
          } else {
            setHasPaymentProfile(null);
          }
        } catch {
          // A failed optional check must not be interpreted as
          // proof that payment instructions are missing.
          setHasPaymentProfile(null);
        }
      } else {
        setHasPaymentProfile(null);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = useMemo<Step[]>(() => {
    if (!activation) return [];

    const milestones = activation.milestones;

    const invoiceCreated = milestoneCompleted(
      milestones,
      'first_invoice_created',
    );

    const quoteCreated = milestoneCompleted(
      milestones,
      'first_quote_created',
    );

    const firstDocumentCreated =
      invoiceCreated || quoteCreated;

    const firstDocumentDispatched = milestoneCompleted(
      milestones,
      'first_document_dispatched',
    );

    const firstPaymentConfirmed = milestoneCompleted(
      milestones,
      'first_payment_confirmed',
    );

    return [
      {
        key: 'business_profile',
        label: 'Set up your business',
        description: 'Add the details that appear on your documents.',
        href: '/onboarding',
        completed: workspace?.onboarding_completed === true,
      },
      {
        key: 'first_document',
        label: 'Create your first invoice',
        description: 'Create an invoice or quote for your client.',
        href: '/invoices/new',
        completed: firstDocumentCreated,
      },
      {
        key: 'first_dispatch',
        label: 'Send your first document',
        description: 'Share it with your client by email or link.',
        href: invoiceCreated || !quoteCreated ? '/invoices' : '/quotes',
        completed: firstDocumentDispatched,
      },
      {
        key: 'first_payment',
        label: 'Record your first payment',
        description: 'Confirm a client payment and keep your records up to date.',
        href: '/invoices',
        completed: firstPaymentConfirmed,
      },
    ];
  }, [activation, workspace]);

  const completedCount = steps.filter(
    (step) => step.completed,
  ).length;

  const allCompleted =
    steps.length > 0 && completedCount === steps.length;

  const nextStep = steps.find((step) => !step.completed);

  const checklistDismissed =
    activation?.checklist_dismissed === true;

  const handleDismiss = async () => {
    setSavingPreference(true);
    setPreferenceError('');

    try {
      await recordChecklistEvent(
        'activation.checklist_dismissed',
      );

      setActivation((current) =>
        current
          ? {
              ...current,
              checklist_dismissed: true,
            }
          : current,
      );
    } catch {
      setPreferenceError(
        'We could not hide the checklist. Please try again.',
      );
    } finally {
      setSavingPreference(false);
    }
  };

  const handleResume = async () => {
    setSavingPreference(true);
    setPreferenceError('');

    try {
      await recordChecklistEvent(
        'activation.checklist_resumed',
      );

      setActivation((current) =>
        current
          ? {
              ...current,
              checklist_dismissed: false,
            }
          : current,
      );
    } catch {
      setPreferenceError(
        'We could not restore the checklist. Please try again.',
      );
    } finally {
      setSavingPreference(false);
    }
  };

  if (loading) {
    return (
      <section
        aria-label="Getting started"
        aria-busy="true"
        className="space-y-4 border-brut border-ink bg-surface p-4 shadow-brut-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse bg-surface-tint motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse bg-surface-tint motion-reduce:animate-none" />
            <div className="h-3 w-24 animate-pulse bg-surface-tint motion-reduce:animate-none" />
          </div>
        </div>
        <div className="h-2.5 animate-pulse bg-surface-tint motion-reduce:animate-none" />
        <span className="sr-only">
          Loading your activation progress
        </span>
      </section>
    );
  }

  if (failed || !activation) {
    return (
      <section
        aria-label="Getting started"
        className="border-brut border-ink bg-surface p-4 shadow-brut-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-heading text-ink">
              Your first steps
            </h2>
            <p className="mt-1 text-caption text-text-muted">
              We could not retrieve your activation progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className={buttonStyles({
              variant: 'outline',
              zone: 'calm',
            })}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (checklistDismissed) {
    return (
      <section
        aria-label="Getting started"
        className="flex flex-wrap items-center justify-between gap-3 border-brut-thin border-ink bg-surface px-4 py-3"
      >
        <div>
          <p className="font-bold text-body text-ink">
            Your getting-started checklist is hidden.
          </p>
          <p className="text-caption text-text-muted">
            Your progress is saved.
          </p>
        </div>

        <button
          type="button"
          disabled={savingPreference}
          onClick={() => void handleResume()}
          className={cn(
            buttonStyles({
              variant: 'outline',
              zone: 'calm',
            }),
            'gap-2',
          )}
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Show checklist
        </button>

        {preferenceError && (
          <p
            role="alert"
            className="w-full text-caption text-status-late-fg"
          >
            {preferenceError}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Getting started"
      className="space-y-4 border-brut border-ink bg-surface p-4 shadow-brut-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <BagCharacter
          size={48}
          mood={allCompleted ? 'excited' : 'happy'}
          decorative
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption font-bold uppercase tracking-wide text-text-muted">
                Your first steps
              </p>

              <h2 className="mt-1 text-heading font-extrabold text-ink">
                {allCompleted
                  ? 'You’re up and running.'
                  : 'Let’s get your first invoice moving.'}
              </h2>

              {collapsed ? (
                <p className="mt-1 text-caption font-bold text-text-muted">
                  {completedCount} of {steps.length} steps completed
                </p>
              ) : (
                <p className="mt-1 text-body text-text-muted">
                  {allCompleted
                    ? 'You have created, sent and received payment for a document through Bagg.'
                    : 'A few steps to help you start getting paid through Bagg.'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label={collapsed ? 'Expand getting-started checklist' : 'Collapse getting-started checklist'}
                title={collapsed ? 'Expand checklist' : 'Collapse checklist'}
                aria-expanded={!collapsed}
                onClick={toggleCollapsed}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-brut-thin border-ink text-text-muted transition-colors hover:bg-surface-tint hover:text-ink"
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    !collapsed && 'rotate-180',
                  )}
                />
              </button>

              <button
                type="button"
                aria-label="Hide getting-started checklist"
                title="Hide checklist"
                disabled={savingPreference}
                onClick={() => void handleDismiss()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-brut-thin border-ink text-text-muted transition-colors hover:bg-surface-tint hover:text-ink disabled:opacity-50"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-bold text-text">
            Progress
          </span>

          <span className="text-caption font-extrabold tabular-nums text-ink">
            {completedCount} of {steps.length}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Activation progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={completedCount}
          className="h-2.5 overflow-hidden border-brut-thin border-ink bg-surface-tint"
        >
          <div
            className="h-full bg-leaf transition-[width] motion-reduce:transition-none"
            style={{
              width: `${(completedCount / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <ol className="divide-y divide-line-subtle">
        {steps.map((step, index) => {
          const isNext = nextStep?.key === step.key;

          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-label={
                  step.completed
                    ? `${step.label}, completed`
                    : `${step.label}${isNext ? ', next step' : ''}`
                }
                className={cn(
                  'flex min-h-16 items-center gap-3 py-3 transition-colors',
                  'hover:bg-surface-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center border-brut-thin border-ink',
                    step.completed
                      ? 'bg-leaf text-ink'
                      : isNext
                        ? 'bg-sun text-ink'
                        : 'bg-surface text-text-muted',
                  )}
                >
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : isNext ? (
                    <span className="text-caption font-extrabold">
                      {index + 1}
                    </span>
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-body font-extrabold',
                      step.completed && 'text-text-muted',
                    )}
                  >
                    {step.label}
                  </span>

                  {!step.completed && (
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {step.description}
                    </span>
                  )}

                  {step.completed && (
                    <span className="mt-0.5 block text-caption font-semibold text-status-success-fg">
                      Completed
                    </span>
                  )}
                </span>

                {!step.completed && (
                  <ChevronRight
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-text-muted"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {!allCompleted && nextStep && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={nextStep.href}
            className={buttonStyles({
              variant: 'accent',
            })}
          >
            {nextStep.key === 'business_profile'
              ? 'Set up your business'
              : nextStep.key === 'first_document'
                ? 'Create your first document'
                : nextStep.key === 'first_dispatch'
                  ? 'Send your first document'
                  : 'View your invoices'}
          </Link>
        </div>
      )}

      {activation.activation_status === 'commercially_activated' && (
        <div className="border-brut-thin border-ink bg-surface-tint p-3">
          <p className="text-body font-bold text-ink">
            You’ve reached your first payment milestone.
          </p>
          <p className="mt-1 text-caption text-text-muted">
            Keep the momentum going with your next invoice or recurring billing.
          </p>
          <Link
            href="/invoices/new"
            className="mt-2 inline-flex items-center gap-1 text-body font-bold text-link underline underline-offset-2"
          >
            Create another invoice
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      )}

      {activation.milestones.some(
        (milestone) =>
          milestone.key === 'first_document_dispatched' &&
          milestone.completed,
      ) &&
        hasPaymentProfile === false && (
          <div className="border-brut-thin border-ink bg-surface-tint p-3">
            <p className="text-body font-extrabold text-ink">
              Make it easier for clients to pay you.
            </p>
            <p className="mt-1 text-caption text-text-muted">
              Add payment instructions for your default currency. This is optional and does not affect your ability to create or send invoices.
            </p>
            <Link
              href="/settings/payments"
              className="mt-2 inline-flex items-center gap-1 text-body font-bold text-link underline underline-offset-2"
            >
              Set up payment instructions
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        )}
        </>
      )}

      {preferenceError && (
        <p role="alert" className="text-caption text-status-late-fg">
          {preferenceError}
        </p>
      )}
    </section>
  );
}
