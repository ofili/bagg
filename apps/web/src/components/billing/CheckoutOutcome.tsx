'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

import { BagMark, Wordmark } from '@/components/brand';
import { Alert, Button } from '@/components/ui';

const API_BASE = '/api';

type OutcomeVariant = 'pending' | 'failed' | 'success';

type CheckoutStatus = {
  checkout_id: string;
  reference: string;
  purchase_type: string;
  plan: string | null;
  billing_interval: 'monthly' | 'annual' | null;
  amount_minor: number;
  currency: string;
  status: 'initializing' | 'pending' | 'succeeded' | 'failed';
  authorization_url: string | null;
  paid_at: string | null;
  created_at: string;
};

type Props = {
  variant: OutcomeVariant;
};

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function getCheckoutId(
  searchParams: { get(name: string): string | null },
): string | null {
  const fromUrl = searchParams.get('checkout_id');
  if (fromUrl) return fromUrl;

  try {
    return (
      window.sessionStorage.getItem('bagg:active-checkout-id') ||
      window.localStorage.getItem('bagg:last-checkout-id')
    );
  } catch {
    return null;
  }
}

function getPlanName(plan: string | null): string {
  if (plan === 'creator_pro') return 'Creator Pro';
  if (plan === 'professional') return 'Professional';
  return 'Bagg subscription';
}

function getReturnPath(): string {
  try {
    const value = window.localStorage.getItem('bagg:checkout:return-next');

    if (
      value &&
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !value.includes('\\')
    ) {
      return value;
    }
  } catch {
    // Fall through to dashboard.
  }

  return '/dashboard';
}

export function CheckoutOutcome({ variant }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkout, setCheckout] = useState<CheckoutStatus | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheckout = useCallback(
    async (id: string, reconcile: boolean) => {
      setError(null);
      setChecking(reconcile);

      try {
        let response = await fetch(
          `${API_BASE}/billing/checkouts/${encodeURIComponent(id)}`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );

        if (response.status === 401) {
          router.replace(
            `/login?${new URLSearchParams({
              next: `/billing/checkout/${variant}?checkout_id=${encodeURIComponent(id)}`,
            }).toString()}`,
          );
          return;
        }

        const data: unknown = await response.json().catch(() => null);

        if (!response.ok || !data || typeof data !== 'object') {
          const detail =
            data && typeof data === 'object' && 'detail' in data
              ? String((data as { detail?: unknown }).detail ?? '')
              : '';

          throw new Error(detail || 'We could not retrieve this checkout.');
        }

        let current = data as CheckoutStatus;

        if (reconcile && current.status === 'pending') {
          try {
            response = await fetch(
              `${API_BASE}/billing/checkouts/${encodeURIComponent(id)}/reconcile`,
              {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store',
              },
            );

            const reconciled: unknown = await response
              .json()
              .catch(() => null);

            if (response.ok && reconciled && typeof reconciled === 'object') {
              current = reconciled as CheckoutStatus;
            } else if (response.status === 401) {
              router.replace(
                `/login?${new URLSearchParams({
                  next: `/billing/checkout/pending?checkout_id=${encodeURIComponent(id)}`,
                }).toString()}`,
              );
              return;
            } else {
              // A provider timeout is not evidence of payment failure.
              setError(
                'We could not reach the payment provider just now. Your payment status has not been changed.',
              );
            }
          } catch {
            setError(
              'We could not reach the payment provider just now. Your payment status has not been changed.',
            );
          }
        }

        setCheckout(current);

        // Put the checkout ID in the URL so refreshes can recover the state.
        if (!searchParams.has('checkout_id')) {
          router.replace(
            `/billing/checkout/${variant}?checkout_id=${encodeURIComponent(id)}`,
          );
        }

        if (current.status === 'succeeded' && variant !== 'success') {
          router.replace(
            `/billing/checkout/success?checkout_id=${encodeURIComponent(id)}`,
          );
          return;
        }

        if (current.status === 'failed' && variant !== 'failed') {
          router.replace(
            `/billing/checkout/failed?checkout_id=${encodeURIComponent(id)}`,
          );
          return;
        }

        if (
          current.status === 'pending' &&
          variant !== 'pending'
        ) {
          router.replace(
            `/billing/checkout/pending?checkout_id=${encodeURIComponent(id)}`,
          );
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'We could not retrieve your checkout.',
        );
      } finally {
        setLoading(false);
        setChecking(false);
      }
    },
    [router, searchParams, variant],
  );

  useEffect(() => {
    const id = getCheckoutId(searchParams);
    setCheckoutId(id);

    if (!id) {
      setLoading(false);
      setError(
        'We could not identify the checkout returned by the payment provider. Your subscription has not been assumed to be active.',
      );
      return;
    }

    void loadCheckout(id, variant === 'pending');
  }, [loadCheckout, searchParams, variant]);

  const checkAgain = () => {
    if (!checkoutId) return;
    void loadCheckout(checkoutId, true);
  };

  const continueToWorkspace = () => {
    router.replace(getReturnPath());
  };

  const retryPayment = () => {
    if (!checkout?.plan || !checkout.billing_interval) {
      router.push('/onboarding/plan');
      return;
    }

    try {
      window.localStorage.removeItem(
        `bagg:checkout:idempotency:${checkout.plan}:${checkout.billing_interval}`,
      );
    } catch {
      // A new key will be generated by checkout if storage is unavailable.
    }

    const params = new URLSearchParams({
      plan: checkout.plan,
      billing_interval: checkout.billing_interval,
      retry: '1',
    });

    router.push(`/billing/checkout?${params.toString()}`);
  };

  const planName = getPlanName(checkout?.plan ?? null);

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

      <main className="mx-auto flex w-full max-w-xl px-5 pb-16 pt-8">
        <section className="w-full border-brut border-ink bg-surface p-6 shadow-brut sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2
                className="h-8 w-8 animate-spin text-text-muted"
                aria-hidden="true"
              />
              <p className="mt-4 font-extrabold text-ink">
                Checking your payment…
              </p>
              <p className="mt-2 text-body text-text-soft">
                We are retrieving the authoritative checkout status.
              </p>
            </div>
          ) : (
            <>
              {variant === 'pending' && (
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center border-brut border-ink bg-mango text-ink">
                    <Clock3 className="h-7 w-7" aria-hidden="true" />
                  </span>

                  <p className="mt-5 text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    Payment processing
                  </p>

                  <h1 className="mt-2 text-title-l font-extrabold text-ink">
                    We&apos;re checking your payment.
                  </h1>

                  <p className="mt-3 text-body text-text-soft">
                    Your payment provider has returned you to Bagg. We are
                    checking the transaction. You can safely return to your
                    workspace while reconciliation continues.
                  </p>

                  {checkout && (
                    <div className="mt-6 border-brut-thin border-ink bg-cream p-4 text-left">
                      <p className="font-extrabold text-ink">{planName}</p>
                      <p className="mt-1 text-body text-text-soft">
                        {checkout.billing_interval} ·{' '}
                        {formatMoney(
                          checkout.amount_minor,
                          checkout.currency,
                        )}
                      </p>
                      <p className="mt-2 break-all text-caption text-text-muted">
                        Reference: {checkout.reference}
                      </p>
                      <p className="mt-2 text-caption font-bold text-status-warning-fg">
                        Status: payment not yet confirmed
                      </p>
                    </div>
                  )}
                </div>
              )}

              {variant === 'success' && checkout?.status === 'succeeded' && (
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center border-brut border-ink bg-status-paid-bg text-status-paid-fg">
                    <CheckCircle2
                      className="h-7 w-7"
                      aria-hidden="true"
                    />
                  </span>

                  <p className="mt-5 text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    Payment confirmed
                  </p>

                  <h1 className="mt-2 text-title-l font-extrabold text-ink">
                    Your plan is active.
                  </h1>

                  <p className="mt-3 text-body text-text-soft">
                    Bagg has verified your payment and updated your workspace
                    subscription.
                  </p>

                  <div className="mt-6 border-brut-thin border-ink bg-cream p-4 text-left">
                    <p className="font-extrabold text-ink">{planName}</p>
                    <p className="mt-1 text-body text-text-soft">
                      {checkout.billing_interval} ·{' '}
                      {formatMoney(
                        checkout.amount_minor,
                        checkout.currency,
                      )}
                    </p>
                    {checkout.paid_at && (
                      <p className="mt-2 text-caption text-text-muted">
                        Paid {new Date(checkout.paid_at).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-2 text-caption font-bold text-status-paid-fg">
                      Verified by Bagg
                    </p>
                  </div>
                </div>
              )}

              {variant === 'failed' && checkout?.status === 'failed' && (
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center border-brut border-ink bg-status-danger-bg text-status-danger-fg">
                    <XCircle className="h-7 w-7" aria-hidden="true" />
                  </span>

                  <p className="mt-5 text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    Payment not completed
                  </p>

                  <h1 className="mt-2 text-title-l font-extrabold text-ink">
                    We couldn&apos;t confirm this payment.
                  </h1>

                  <p className="mt-3 text-body text-text-soft">
                    Your workspace remains on its existing plan. You can retry
                    this payment or continue using Free.
                  </p>

                  <div className="mt-6 border-brut-thin border-ink bg-cream p-4 text-left">
                    <p className="font-extrabold text-ink">{planName}</p>
                    <p className="mt-1 text-body text-text-soft">
                      {checkout.billing_interval} ·{' '}
                      {formatMoney(
                        checkout.amount_minor,
                        checkout.currency,
                      )}
                    </p>
                    <p className="mt-2 break-all text-caption text-text-muted">
                      Reference: {checkout.reference}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="warning" className="mt-5">
                  {error}
                </Alert>
              )}

              {!error &&
                variant === 'success' &&
                checkout?.status !== 'succeeded' && (
                  <Alert variant="warning" className="mt-5">
                    This checkout has not been verified as successful. Paid
                    access has not been confirmed.
                  </Alert>
                )}

              {!error &&
                variant === 'failed' &&
                checkout?.status !== 'failed' && (
                  <Alert variant="warning" className="mt-5">
                    This checkout has not been confirmed as failed. Check its
                    current status before retrying.
                  </Alert>
                )}

              {variant === 'pending' && (
                <div className="mt-7 space-y-3">
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    disabled={checking || !checkoutId}
                    onClick={checkAgain}
                  >
                    {checking ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Checking with Paystack…
                      </>
                    ) : (
                      <>
                        <RefreshCw
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        Check payment status
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="outline"
                    onClick={continueToWorkspace}
                  >
                    Return to workspace
                  </Button>
                </div>
              )}

              {variant === 'success' &&
                checkout?.status === 'succeeded' && (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    className="mt-7"
                    onClick={continueToWorkspace}
                  >
                    Continue to Bagg
                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </Button>
                )}

              {variant === 'failed' && checkout?.status === 'failed' && (
                <div className="mt-7 space-y-3">
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    onClick={retryPayment}
                  >
                    Retry payment
                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </Button>

                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="outline"
                    onClick={continueToWorkspace}
                  >
                    Continue with Free
                  </Button>
                </div>
              )}

              {!checkoutId && (
                <div className="mt-7">
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => router.replace('/onboarding/plan')}
                  >
                    Return to plan selection
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}