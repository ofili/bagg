'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Coins, Loader2, Sparkles, Zap } from 'lucide-react';

import { Alert, Button, Dialog } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentTier?: string;
  returnPath?: string;
  initialInterval?: 'monthly' | 'annual';
  defaultTab?: 'plans' | 'credits';
}

type BillingInterval = 'monthly' | 'annual';

const API_BASE = '/api';

interface PlanDefinition {
  code: 'creator_pro' | 'professional';
  name: string;
  tagline: string;
  badge?: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
}

const PLANS: PlanDefinition[] = [
  {
    code: 'creator_pro',
    name: 'Creator Pro',
    tagline: 'For freelancers and creators who send invoices regularly.',
    priceMonthly: 3500,
    priceAnnual: 35000,
    features: [
      'Unlimited invoice & quote sends (no 3/mo cap)',
      'Recurring invoice generation & automated schedules',
      'Quote withdrawal & management',
      'Unlimited clients & payment tracking',
      'Shareable document links & instant PDF downloads',
    ],
  },
  {
    code: 'professional',
    name: 'Professional',
    tagline: 'For established independents, studios, and growing businesses.',
    badge: 'Most Popular',
    priceMonthly: 8500,
    priceAnnual: 85000,
    features: [
      'Everything in Creator Pro',
      'Eligible invoice recall & version history',
      'Advanced reporting & automated reminder rules',
      'Retainers & milestone payment schedules',
      'Up to 25 active engagements',
      'Up to 3 team members',
    ],
  },
];

export function UpgradeModal({
  open,
  onClose,
  currentTier = 'free',
  returnPath,
  initialInterval = 'annual',
}: UpgradeModalProps) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  const effectiveReturnPath =
    returnPath || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  const handleSelectPlan = (planCode: 'creator_pro' | 'professional') => {
    const params = new URLSearchParams({
      plan: planCode,
      billing_interval: interval,
      next: effectiveReturnPath,
    });

    onClose();
    router.push(`/billing/checkout?${params.toString()}`);
  };

  const handleBuyCredits = async () => {
    try {
      setBuyingCredits(true);
      setCreditError(null);

      const callbackUrl = `${window.location.origin}/billing/checkout/pending`;

      const response = await fetch(`${API_BASE}/billing/credits/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pack: '200_credits',
          currency: 'NGN',
          callback_url: callbackUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { detail?: string }).detail ||
            'We could not start the credit purchase. Please try again.',
        );
      }

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error('Payment gateway did not provide a checkout link.');
      }

      try {
        window.sessionStorage.setItem('bagg:active-checkout-id', data.checkout_id);
        window.localStorage.setItem('bagg:last-checkout-id', data.checkout_id);
        window.localStorage.setItem('bagg:checkout:return-next', effectiveReturnPath);
      } catch {
        // Continue if storage is restricted
      }

      window.location.assign(data.authorization_url);
    } catch (err) {
      setCreditError(
        err instanceof Error ? err.message : 'Could not initialize credit purchase.',
      );
      setBuyingCredits(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose your plan"
      description="Select the right plan for your business, or buy send credits on demand."
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {/* INTERVAL SELECTOR */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div
            className="inline-flex border-brut border-ink bg-surface-sunken p-1"
            role="group"
            aria-label="Billing interval"
          >
            <button
              type="button"
              onClick={() => setInterval('annual')}
              className={cn(
                'px-4 py-1.5 text-caption font-extrabold transition-colors',
                interval === 'annual'
                  ? 'border-brut-thin border-ink bg-surface text-ink shadow-brut-sm'
                  : 'text-text-muted hover:text-ink',
              )}
            >
              Annual billing
              <span className="ml-2 border border-ink bg-sun px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                Save ~17%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={cn(
                'px-4 py-1.5 text-caption font-extrabold transition-colors',
                interval === 'monthly'
                  ? 'border-brut-thin border-ink bg-surface text-ink shadow-brut-sm'
                  : 'text-text-muted hover:text-ink',
              )}
            >
              Monthly billing
            </button>
          </div>

          <p className="text-caption text-text-muted">
            All prices in NGN. Cancel or switch anytime.
          </p>
        </div>

        {/* PLAN CARDS */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.code;
            const price =
              interval === 'annual' ? plan.priceAnnual : plan.priceMonthly;
            const periodLabel = interval === 'annual' ? '/year' : '/month';

            return (
              <div
                key={plan.code}
                className={cn(
                  'relative flex flex-col justify-between border-brut border-ink p-5',
                  plan.badge
                    ? 'bg-surface shadow-brut-sm'
                    : 'bg-surface-sunken',
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-4 border-brut-thin border-ink bg-sun px-2.5 py-0.5 text-caption font-extrabold text-ink shadow-brut-sm">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-mango" aria-hidden="true" />
                    <h3 className="text-heading font-extrabold text-ink">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="mt-1 text-caption text-text-soft">
                    {plan.tagline}
                  </p>

                  <div className="mt-4 border-t border-line-subtle pt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-ink">
                        ₦{price.toLocaleString('en-NG')}
                      </span>
                      <span className="text-caption font-bold text-text-muted">
                        {periodLabel}
                      </span>
                    </div>
                    {interval === 'annual' && (
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        Equivalent to ₦{Math.round(price / 12).toLocaleString('en-NG')}/month
                      </p>
                    )}
                  </div>

                  <ul className="mt-5 space-y-2.5 border-t border-line-subtle pt-4 text-caption text-text">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mango"
                          aria-hidden="true"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <Button
                    type="button"
                    fullWidth
                    variant={plan.badge ? 'primary' : 'outline'}
                    disabled={isCurrent}
                    onClick={() => handleSelectPlan(plan.code)}
                  >
                    {isCurrent ? (
                      'Current Plan'
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Choose {plan.name}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* CREDIT PACK ALTERNATIVE */}
        <div className="border-brut border-ink bg-surface-tint p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut-thin border-ink bg-surface text-ink">
                <Coins className="h-5 w-5 text-mango" aria-hidden="true" />
              </span>
              <div>
                <p className="text-body font-extrabold text-ink">
                  Just need more document sends?
                </p>
                <p className="text-caption text-text-soft">
                  Buy a pack of 200 document send credits for ₦2,000 without a monthly subscription. Credits never expire.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={buyingCredits}
              onClick={handleBuyCredits}
              className="shrink-0"
            >
              {buyingCredits && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Buy 200 credits · ₦2,000
            </Button>
          </div>

          {creditError && (
            <Alert variant="error" className="mt-3">
              {creditError}
            </Alert>
          )}
        </div>
      </div>
    </Dialog>
  );
}
