'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { BagMark, Wordmark } from '@/components/brand';
import { Alert, Button } from '@/components/ui';
import {
  readOnboardingContinuation,
} from '@/lib/onboarding-navigation';

const API_BASE = '/api';

type BillingInterval = 'monthly' | 'annual';
type PaidPlan = 'creator_pro' | 'professional';

type Plan = {
  code: string;
  name: string;
  available: boolean;
  billing_intervals: BillingInterval[];
  prices: Record<string, number>;
};

type PlanCatalogue = {
  currency: string;
  plans: Plan[];
};

type CheckoutResponse = {
  checkout_id: string;
  authorization_url: string;
  reference: string;
  plan: string;
  billing_interval: BillingInterval;
  amount_minor: number;
  currency: string;
  status: string;
};

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function getStorageKey(plan: string, interval: string): string {
  return `bagg:checkout:idempotency:${plan}:${interval}`;
}

function getIdempotencyKey(
  plan: string,
  interval: string,
  forceNew: boolean,
): string {
  const storageKey = getStorageKey(plan, interval);

  if (forceNew) {
    const replacement = crypto.randomUUID();
    window.localStorage.setItem(storageKey, replacement);
    return replacement;
  }

  const existing = window.localStorage.getItem(storageKey);

  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);

  return created;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const continuation = useMemo(
    () => readOnboardingContinuation(searchParams),
    [searchParams],
  );

  const planCode = searchParams.get('plan') as PaidPlan | null;
  const interval = searchParams.get('billing_interval') as
    | BillingInterval
    | null;

  const retry = searchParams.get('retry') === '1';

  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceNewKey, setForceNewKey] = useState(retry);

  useEffect(() => {
    if (
      !planCode ||
      !['creator_pro', 'professional'].includes(planCode) ||
      !interval ||
      !['monthly', 'annual'].includes(interval)
    ) {
      router.replace('/onboarding/plan');
      return;
    }

    let cancelled = false;

    async function loadCatalogue() {
      try {
        const response = await fetch(`${API_BASE}/billing/plans`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          const params = new URLSearchParams({
            next: '/onboarding/plan',
            plan: planCode!,
            billing_interval: interval!,
          });

          router.replace(`/login?${params.toString()}`);
          return;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.plans) {
          throw new Error(
            data?.detail || 'We could not retrieve current plan pricing.',
          );
        }

        if (!cancelled) setCatalogue(data as PlanCatalogue);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'We could not load checkout details.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, [planCode, interval, router]);

  const selectedPlan = catalogue?.plans.find(
    (plan) => plan.code === planCode,
  );

  const amountMinor =
    selectedPlan && interval
      ? selectedPlan.prices[interval]
      : undefined;

  const currency = catalogue?.currency ?? 'NGN';

  async function startCheckout(useNewKey = retry) {
    if (
      !planCode ||
      !interval ||
      !selectedPlan?.available ||
      amountMinor === undefined
    ) {
      setError('This plan or billing interval is not available.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = getIdempotencyKey(
        planCode,
        interval,
        useNewKey,
      );

      const callbackUrl =
        `${window.location.origin}/billing/checkout/pending`;

      const response = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          plan: planCode,
          billing_interval: interval,
          callback_url: callbackUrl,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!data || typeof data !== 'object') {
        throw new Error(
          'The billing service returned an unexpected response.',
        );
      }

      const result = data as CheckoutResponse & { detail?: string };

      if (response.status === 401) {
        router.replace(
          `/login?${new URLSearchParams({
            next: '/onboarding/plan',
            plan: planCode,
            billing_interval: interval,
          }).toString()}`,
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.detail ||
            'We could not start checkout. Please try again.',
        );
      }

      if (
        !result.checkout_id ||
        !result.authorization_url ||
        result.status !== 'pending'
      ) {
        throw new Error(
          'Checkout was created but is not ready for payment. Please check its status.',
        );
      }

      try {
        window.sessionStorage.setItem(
            'bagg:active-checkout-id',
            result.checkout_id,
        );

        window.localStorage.setItem(
            'bagg:last-checkout-id',
            result.checkout_id,
        );

        if (continuation.next) {
            window.localStorage.setItem(
            'bagg:checkout:return-next',
            continuation.next,
            );
        } else {
            window.localStorage.removeItem('bagg:checkout:return-next');
        }
    } catch {
    // Redirect remains possible if browser storage is unavailable.
    }

      window.location.assign(result.authorization_url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not start checkout. Please try again.',
      );
      setSubmitting(false);
    }
  }

  const backToPlans = () => {
    const params = new URLSearchParams();

    if (continuation.next) params.set('next', continuation.next);

    const query = params.toString();
    router.push(`/onboarding/plan${query ? `?${query}` : ''}`);
  };

  return (
    <div className="min-h-dvh bg-cream">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5">
        <Link
          href="/"
          aria-label="Bagg home"
          className="inline-flex min-h-11 items-center gap-2"
        >
          <BagMark size={32} />
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-16 pt-5">
        <button
          type="button"
          onClick={backToPlans}
          className="mb-6 inline-flex min-h-10 w-fit items-center gap-2 text-body font-bold text-link hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to plans
        </button>

        <section className="border-brut border-ink bg-surface p-6 shadow-brut sm:p-8">
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Review your subscription
          </p>

          <h1 className="mt-2 text-display text-ink">
            Confirm your plan.
          </h1>

          <p className="mt-3 text-body text-text-soft">
            Check the plan and billing terms before continuing to Paystack.
          </p>

          {error && (
            <Alert variant="error" className="mt-5">
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-14" role="status">
              <Loader2
                className="h-7 w-7 animate-spin text-text-muted"
                aria-hidden="true"
              />
              <span className="sr-only">Loading checkout details</span>
            </div>
          ) : selectedPlan && amountMinor !== undefined ? (
            <>
              <div className="mt-7 border-brut border-ink bg-cream p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-caption font-bold uppercase tracking-wider text-text-muted">
                      Selected plan
                    </p>
                    <h2 className="mt-1 text-title-l font-extrabold text-ink">
                      {selectedPlan.name}
                    </h2>
                    <p className="mt-1 text-body text-text-soft">
                      {interval === 'monthly'
                        ? 'Monthly billing'
                        : 'Annual billing'}
                    </p>
                  </div>

                  <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-mango text-ink">
                    <CheckCircle2
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                  <div>
                    <p className="text-caption font-bold text-text-muted">
                      Amount due today
                    </p>
                    <p className="mt-1 text-display text-ink">
                      {formatMoney(amountMinor, currency)}
                    </p>
                  </div>
                  <p className="pb-1 text-caption text-text-muted">
                    {interval === 'monthly' ? 'Every month' : 'Every year'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <RefreshCwIcon />
                  <div>
                    <p className="font-extrabold text-ink">
                      Renewal terms
                    </p>
                    <p className="mt-1 text-body text-text-soft">
                      {interval === 'monthly'
                        ? 'Your subscription renews monthly until you cancel.'
                        : 'Your subscription renews annually until you cancel.'}
                      {' '}You can stop renewal from your billing settings.
                      Your paid access remains available until the end of the
                      current paid period.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-extrabold text-ink">
                      Verified payment
                    </p>
                    <p className="mt-1 text-body text-text-soft">
                      Paystack processes your payment. Bagg activates your
                      subscription only after the payment is verified.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard
                    className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-extrabold text-ink">
                      Separate from client payments
                    </p>
                    <p className="mt-1 text-body text-text-soft">
                      This payment is for your Bagg subscription. It does not
                      configure how your clients pay you.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                fullWidth
                size="lg"
                disabled={submitting || !selectedPlan.available}
                onClick={() => void startCheckout()}
                className="mt-8"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Preparing secure checkout…
                  </>
                ) : (
                  <>
                    Continue to Paystack
                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-caption text-text-muted">
                You will review and complete payment on Paystack.
              </p>
            </>
          ) : (
            <Alert variant="error" className="mt-5">
              The selected plan or billing interval is not available. Return
              to plan selection and choose an available option.
            </Alert>
          )}
        </section>
      </main>
    </div>
  );
}

function RefreshCwIcon() {
  return (
    <RefreshCw
      className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
      aria-hidden="true"
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-7 w-7 animate-spin text-text-muted"
            aria-label="Loading checkout"
          />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}