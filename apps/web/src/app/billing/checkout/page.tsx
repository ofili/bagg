'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
  availability_status?: string;
  billing_intervals: BillingInterval[];
  prices: Partial<Record<BillingInterval, number>>;
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
  detail?: string;
};

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function getStorageKey(plan: PaidPlan, interval: BillingInterval): string {
  return `bagg:checkout:idempotency:${plan}:${interval}`;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers. The key is an idempotency token, not a secret.
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join('-');
}

function getIdempotencyKey(
  plan: PaidPlan,
  interval: BillingInterval,
  forceNew: boolean,
): string {
  const storageKey = getStorageKey(plan, interval);

  try {
    if (forceNew) {
      const replacement = createIdempotencyKey();
      window.localStorage.setItem(storageKey, replacement);
      return replacement;
    }

    const existing = window.localStorage.getItem(storageKey);

    if (existing) return existing;

    const created = createIdempotencyKey();
    window.localStorage.setItem(storageKey, created);

    return created;
  } catch {
    // Storage may be disabled. The caller retains the generated key in memory.
    return createIdempotencyKey();
  }
}

function isPaystackAuthorizationUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname === 'checkout.paystack.com'
    );
  } catch {
    return false;
  }
}

function getPlanLabel(plan: string): string {
  if (plan === 'creator_pro') return 'Creator Pro';
  if (plan === 'professional') return 'Professional';
  return 'Selected plan';
}

function getApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  return fallback;
}

async function readJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getApiError(data, 'We could not complete your request. Please try again.'),
    );
  }

  if (data === null || typeof data !== 'object') {
    throw new Error('The server returned an unexpected response.');
  }

  return data as T;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const continuation = useMemo(
    () => readOnboardingContinuation(searchParams),
    [searchParams],
  );

  // The shared navigation helper validates both values against the supported
  // plan and interval allowlists. Do not cast arbitrary query strings.
  const planCode = continuation.plan;
  const interval = continuation.billingInterval;
  const retryRequested = searchParams.get('retry') === '1';

  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep one key for this mounted checkout attempt. A retry after an
  // initialization/network error must reuse the same key.
  const idempotencyKeyRef = useRef<string | null>(null);
  const retryFlagConsumedRef = useRef(false);

  useEffect(() => {
    if (!planCode || !interval) {
      const params = new URLSearchParams();

      if (continuation.next) {
        params.set('next', continuation.next);
      }

      const query = params.toString();
      router.replace(`/onboarding/plan${query ? `?${query}` : ''}`);
      return;
    }

    let cancelled = false;

    async function loadCatalogue() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/billing/plans`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          const params = new URLSearchParams({
            next: '/onboarding/plan',
            plan: planCode,
            billing_interval: interval,
          });

          if (continuation.next) {
            params.set('next', continuation.next);
          }

          router.replace(`/login?${params.toString()}`);
          return;
        }

        const data = await readJson<PlanCatalogue>(response);

        if (!Array.isArray(data.plans)) {
          throw new Error('The billing service returned an invalid plan catalogue.');
        }

        if (!cancelled) {
          setCatalogue(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'We could not load checkout details.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, [planCode, interval, continuation, router]);

  const selectedPlan = catalogue?.plans.find(
    (plan) => plan.code === planCode,
  );

  const amountMinor =
    selectedPlan && interval
      ? selectedPlan.prices[interval]
      : undefined;

  const intervalAvailable = Boolean(
    selectedPlan &&
    interval &&
    selectedPlan.billing_intervals.includes(interval),
  );

  const canCheckout = Boolean(
    selectedPlan &&
    selectedPlan.available &&
    intervalAvailable &&
    amountMinor !== undefined &&
    amountMinor > 0,
  );

  const currency = catalogue?.currency ?? 'NGN';

  function getCurrentIdempotencyKey(): string {
    if (!planCode || !interval) {
      throw new Error('A valid plan and billing interval are required.');
    }

    if (idempotencyKeyRef.current) {
      return idempotencyKeyRef.current;
    }

    const forceNew = retryRequested && !retryFlagConsumedRef.current;

    const key = getIdempotencyKey(
      planCode,
      interval,
      forceNew,
    );

    idempotencyKeyRef.current = key;

    if (forceNew) {
      retryFlagConsumedRef.current = true;

      // Consume the retry flag so a page reload does not generate another
      // idempotency key and accidentally create a second checkout.
      const params = new URLSearchParams();

      params.set('plan', planCode);
      params.set('billing_interval', interval);

      if (continuation.next) {
        params.set('next', continuation.next);
      }

      router.replace(`/billing/checkout?${params.toString()}`);
    }

    return key;
  }

  async function startCheckout() {
    if (submitting) return;

    if (!planCode || !interval || !canCheckout || amountMinor === undefined) {
      setError(
        'This plan or billing interval is not currently available. Return to plan selection and choose an available option.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = getCurrentIdempotencyKey();

      // The backend validates this against WEB_BASE_URL and the exact callback
      // path. In production, the frontend origin must match that configured URL.
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

      if (response.status === 401) {
        const params = new URLSearchParams({
          next: '/onboarding/plan',
          plan: planCode,
          billing_interval: interval,
        });

        if (continuation.next) {
          params.set('next', continuation.next);
        }

        router.replace(`/login?${params.toString()}`);
        return;
      }

      const result = await readJson<CheckoutResponse>(response);

      if (
        !result.checkout_id ||
        !result.authorization_url ||
        result.status !== 'pending'
      ) {
        throw new Error(
          'Checkout was created but is not ready for payment. Please check its status.',
        );
      }

      if (
        result.plan !== planCode ||
        result.billing_interval !== interval ||
        result.amount_minor !== amountMinor ||
        result.currency.toUpperCase() !== currency.toUpperCase()
      ) {
        throw new Error(
          'The checkout details returned by the billing service do not match the selected plan. No redirect was made.',
        );
      }

      if (!isPaystackAuthorizationUrl(result.authorization_url)) {
        throw new Error(
          'The payment provider returned an invalid checkout address. Please contact support.',
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
        // The payment redirect can proceed. The callback URL remains available.
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

  function backToPlans() {
    const params = new URLSearchParams();

    if (continuation.next) {
      params.set('next', continuation.next);
    }

    if (planCode) {
      params.set('plan', planCode);
    }

    if (interval) {
      params.set('billing_interval', interval);
    }

    const query = params.toString();

    router.push(`/onboarding/plan${query ? `?${query}` : ''}`);
  }

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
          ) : selectedPlan && amountMinor !== undefined && canCheckout ? (
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
                  <RefreshCw
                    className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />

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
                      Returning to Bagg from Paystack does not, by itself,
                      activate paid access.
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
                disabled={submitting}
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
              {selectedPlan
                ? 'The selected billing interval is not currently configured for this plan.'
                : 'The selected plan or billing interval is not available.'}
              {' '}Return to plan selection and choose an available option.
            </Alert>
          )}
        </section>
      </main>
    </div>
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