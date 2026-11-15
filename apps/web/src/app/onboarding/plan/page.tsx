'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock3,
  Loader2,
} from 'lucide-react';

import { BagMark, Wordmark } from '@/components/brand';
import { Alert, Button } from '@/components/ui';
import {
  buildPlanSelectionUrl,
  readOnboardingContinuation,
} from '@/lib/onboarding-navigation';

const API_BASE = '/api';

type BillingInterval = 'monthly' | 'annual';
type PaidPlan = 'creator_pro' | 'professional';

type Plan = {
  code: string;
  name: string;
  available: boolean;
  availability_status: string;
  billing_intervals: BillingInterval[];
  prices: Record<string, number>;
};

type PlanCatalogue = {
  currency: string;
  plans: Plan[];
};

type Checkout = {
  checkout_id: string;
  reference: string;
  purchase_type: string;
  plan: string | null;
  billing_interval: BillingInterval | null;
  amount_minor: number;
  currency: string;
  status: string;
  authorization_url: string | null;
  paid_at: string | null;
  created_at: string;
};

type Subscription = {
  tier: string;
  status: string;
  billing_interval: BillingInterval;
  current_period_end: string | null;
  in_grace_period: boolean;
};

const FEATURES: Record<string, string[]> = {
  free: [
    'Create invoices and quotes',
    'Manage clients and payment records',
    'Shareable document links and PDFs',
    'Three document sends every month',
  ],
  creator_pro: [
    'Everything in Free',
    'No monthly document-send limit',
    'Recurring invoice schedules',
    'Automated recurring invoice generation',
    'Quote withdrawal and management',
  ],
  professional: [
    'Everything in Creator Pro',
    'Eligible invoice recall',
    'Advanced reporting and reminders',
    'Retainers and payment schedules',
    'Unlimited clients',
    'Up to 25 active engagements',
    'Up to 3 team members',
  ],
  studio: [
    'Contracts and commercial agreements',
    'Projects and milestone management',
    'Deliverables, reviews and approvals',
    'Team collaboration and file integrations',
  ],
};

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function formatEffectiveMonthly(
  annualAmountMinor: number,
  currency: string,
): string {
  return formatMoney(Math.round(annualAmountMinor / 12), currency);
}

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const continuation = useMemo(
    () => readOnboardingContinuation(searchParams),
    [searchParams],
  );

  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [pendingCheckouts, setPendingCheckouts] = useState<Checkout[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    continuation.plan ?? 'creator_pro',
  );
  const [interval, setInterval] = useState<BillingInterval>(
    continuation.billingInterval ?? 'annual',
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const plansResponse = await fetch(`${API_BASE}/billing/plans`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (plansResponse.status === 401) {
          const params = new URLSearchParams({
            next: '/onboarding/plan',
          });

          if (continuation.plan) {
            params.set('plan', continuation.plan);
          }

          if (continuation.billingInterval) {
            params.set('billing_interval', continuation.billingInterval);
          }

          router.replace(`/login?${params.toString()}`);
          return;
        }

        const plansData = await plansResponse.json().catch(() => null);

        if (!plansResponse.ok || !plansData?.plans) {
          throw new Error(
            plansData?.detail || 'We could not load the available plans.',
          );
        }

        const [pendingResponse, subscriptionResponse] = await Promise.all([
          fetch(`${API_BASE}/billing/checkouts/pending`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${API_BASE}/billing/subscription`, {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        const pendingData = pendingResponse.ok
          ? await pendingResponse.json().catch(() => [])
          : [];

        const subscriptionData = subscriptionResponse.ok
          ? await subscriptionResponse.json().catch(() => null)
          : null;

        if (cancelled) return;

        setCatalogue(plansData as PlanCatalogue);
        setPendingCheckouts(
          Array.isArray(pendingData) ? (pendingData as Checkout[]) : [],
        );
        setSubscription(subscriptionData as Subscription | null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'We could not load your plans. Please try again.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, continuation]);

  const plans = catalogue?.plans ?? [];
  const freePlan = plans.find((plan) => plan.code === 'free');
  const creatorPlan = plans.find((plan) => plan.code === 'creator_pro');
  const professionalPlan = plans.find(
    (plan) => plan.code === 'professional',
  );
  const studioPlan = plans.find((plan) => plan.code === 'studio');

  const currency = catalogue?.currency ?? 'NGN';

  function continueWithFree() {
    router.replace(continuation.next ?? '/dashboard');
  }

  function continueToCheckout(plan: PaidPlan) {
    router.push(
      buildPlanSelectionUrl(plan, interval, continuation.next),
    );
  }

  function resumeCheckout(checkout: Checkout) {
    if (!checkout.authorization_url) return;

    try {
      window.sessionStorage.setItem(
        'bagg:active-checkout-id',
        checkout.checkout_id,
      );
    } catch {
      // The checkout can still be resumed in the current navigation.
    }

    window.location.assign(checkout.authorization_url);
  }

  function renderPaidPrice(plan: Plan | undefined) {
    if (!plan) return null;

    const monthly = plan.prices.monthly;
    const annual = plan.prices.annual;

    if (monthly === undefined || annual === undefined) {
      return (
        <p className="text-caption text-status-danger-fg">
          Pricing is not configured for this plan.
        </p>
      );
    }

    const savings = monthly * 12 - annual;

    return (
      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-line py-4">
        <div>
          <p className="text-caption font-bold uppercase text-text-muted">
            Monthly
          </p>
          <p className="mt-1 text-title font-extrabold text-ink">
            {formatMoney(monthly, currency)}
          </p>
          <p className="text-caption text-text-muted">per month</p>
        </div>

        <div className="border-l border-line pl-3">
          <p className="text-caption font-bold uppercase text-text-muted">
            Annual
          </p>
          <p className="mt-1 text-title font-extrabold text-ink">
            {formatMoney(annual, currency)}
          </p>
          <p className="text-caption text-text-muted">per year</p>
        </div>

        <div className="col-span-2">
          <p className="text-caption font-bold text-status-paid-fg">
            Annual equivalent: {formatEffectiveMonthly(annual, currency)}/month
            {savings > 0
              ? ` · Save ${formatMoney(savings, currency)}`
              : ''}
          </p>
        </div>
      </div>
    );
  }

  function renderPlanCard(
    plan: Plan | undefined,
    description: string,
    featured = false,
  ) {
    if (!plan) return null;

    const isFree = plan.code === 'free';
    const isCurrent = subscription?.tier === plan.code;
    const intervalAvailable =
    isFree || plan.billing_intervals.includes(interval);

    const selectable = plan.available && intervalAvailable;

    return (
      <article
        key={plan.code}
        className={
          featured
            ? 'flex h-full flex-col border-brut border-ink bg-mango p-6 text-on-mango shadow-brut sm:p-7'
            : 'flex h-full flex-col border-brut border-ink bg-surface p-6 shadow-brut-sm sm:p-7'
        }
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-caption font-extrabold uppercase tracking-wider ${
                featured ? 'text-on-mango/75' : 'text-text-muted'
              }`}
            >
              {isFree ? 'For getting started' : 'For growing businesses'}
            </p>

            {isCurrent && (
              <span className="border-brut-thin border-ink bg-surface px-2 py-1 text-caption font-extrabold text-ink">
                Current plan
              </span>
            )}
          </div>

          <h2
            className={`mt-3 text-title-l font-extrabold ${
              featured ? 'text-on-mango' : 'text-ink'
            }`}
          >
            {plan.name}
          </h2>

          <p
            className={`mt-3 min-h-12 text-body ${
              featured ? 'text-on-mango/85' : 'text-text-soft'
            }`}
          >
            {description}
          </p>

          {isFree ? (
            <div className="mt-5 border-y border-line py-4">
              <p className="text-title-l font-extrabold text-ink">
                {formatMoney(0, currency)}
              </p>
              <p className="text-caption text-text-muted">
                Free forever · No card required
              </p>
            </div>
          ) : (
            renderPaidPrice(plan)
          )}

          <ul className="mt-5 space-y-3">
            {(FEATURES[plan.code] ?? []).map((feature) => (
              <li
                key={feature}
                className={`flex items-start gap-2 text-body ${
                  featured ? 'text-on-mango' : 'text-text-soft'
                }`}
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-7">
          {isFree ? (
            <Button
              type="button"
              fullWidth
              size="lg"
              disabled={!selectable || subscription?.tier !== 'free'}
              onClick={continueWithFree}
            >
              {subscription?.tier === 'free'
                ? 'Continue with Free'
                : 'Manage current plan'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              fullWidth
              size="lg"
              disabled={!selectable}
              onClick={() => continueToCheckout(plan.code as PaidPlan)}
            >
              {isCurrent ? 'Continue with this plan' : `Choose ${plan.name}`}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}

          {!selectable && (
            <p className="mt-2 text-caption text-text-muted">
              This plan is not currently available.
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link
          href="/"
          aria-label="Bagg home"
          className="inline-flex min-h-11 items-center gap-2"
        >
          <BagMark size={32} />
          <Wordmark />
        </Link>

        <Link
          href="/dashboard"
          className="text-caption font-bold text-link hover:underline"
        >
          Skip for now
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Your workspace, your choice
          </p>
          <h1 className="mt-3 text-display text-ink">
            Choose how you want to use Bagg.
          </h1>
          <p className="mt-4 text-body-l text-text-soft">
            Start with Free. Upgrade when your invoicing and payment workflow
            needs more room.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-7 max-w-3xl">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {subscription?.status === 'past_due' &&
          subscription.in_grace_period && (
            <div className="mx-auto mt-7 max-w-3xl">
              <Alert variant="warning">
                Your current subscription is in its grace period. Review your
                billing status before starting another checkout.
              </Alert>
            </div>
          )}

        {pendingCheckouts.length > 0 && (
          <section className="mx-auto mt-8 max-w-3xl border-brut border-ink bg-surface p-5 shadow-brut-sm">
            <div className="flex items-start gap-3">
              <Clock3
                className="mt-1 h-5 w-5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-heading font-extrabold text-ink">
                  You have a checkout to finish.
                </h2>
                <p className="mt-1 text-body text-text-soft">
                  Your previous payment was not yet confirmed. You can resume
                  the existing checkout instead of creating another one.
                </p>

                <div className="mt-4 space-y-3">
                  {pendingCheckouts.map((checkout) => (
                    <div
                      key={checkout.checkout_id}
                      className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-extrabold text-ink">
                          {checkout.plan === 'creator_pro'
                            ? 'Creator Pro'
                            : checkout.plan === 'professional'
                              ? 'Professional'
                              : 'Subscription'}
                          {' · '}
                          {checkout.billing_interval}
                        </p>
                        <p className="text-caption text-text-muted">
                          {formatMoney(
                            checkout.amount_minor,
                            checkout.currency,
                          )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="md"
                        onClick={() => resumeCheckout(checkout)}
                      >
                        Resume payment
                        <ArrowRight
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20" role="status">
            <Loader2
              className="h-7 w-7 animate-spin text-text-muted"
              aria-hidden="true"
            />
            <span className="sr-only">Loading plans</span>
          </div>
        ) : catalogue ? (
          <>
            <div className="mx-auto mt-9 flex max-w-md items-center justify-center gap-2 border-brut border-ink bg-surface p-2 shadow-brut-sm">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                aria-pressed={interval === 'monthly'}
                className={`flex-1 px-4 py-3 text-body font-extrabold ${
                  interval === 'monthly'
                    ? 'bg-ink text-surface'
                    : 'text-text-soft hover:bg-cream'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval('annual')}
                aria-pressed={interval === 'annual'}
                className={`flex-1 px-4 py-3 text-body font-extrabold ${
                  interval === 'annual'
                    ? 'bg-ink text-surface'
                    : 'text-text-soft hover:bg-cream'
                }`}
              >
                Annual
              </button>
            </div>

            <div className="mt-8 grid items-stretch gap-5 lg:grid-cols-3">
              {renderPlanCard(
                freePlan,
                'The essentials to create, share and track your invoices.',
              )}
              {renderPlanCard(
                creatorPlan,
                'For freelancers and creators who send documents regularly.',
                true,
              )}
              {renderPlanCard(
                professionalPlan,
                'For established independents and small teams.',
              )}
            </div>

            {studioPlan && (
              <section className="mt-7 border-brut border-ink bg-surface p-6 shadow-brut-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
                      Coming soon
                    </p>
                    <h2 className="mt-1 text-title font-extrabold text-ink">
                      {studioPlan.name}
                    </h2>
                    <p className="mt-2 max-w-2xl text-body text-text-soft">
                      A broader client-engagement workspace for contracts,
                      projects, milestones, deliverables and team collaboration.
                    </p>
                  </div>
                  <span className="border-brut-thin border-ink bg-cream px-3 py-2 text-caption font-extrabold text-text-muted">
                    Not available for purchase
                  </span>
                </div>
              </section>
            )}
          </>
        ) : null}

        <div className="mx-auto mt-9 max-w-3xl border-t border-line pt-5 text-center">
          <p className="text-caption text-text-muted">
            Your plan can be changed later. Payment for Bagg subscriptions is
            separate from payments your clients make to you.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-7 w-7 animate-spin text-text-muted"
            aria-label="Loading plans"
          />
        </div>
      }
    >
      <PlanPageContent />
    </Suspense>
  );
}