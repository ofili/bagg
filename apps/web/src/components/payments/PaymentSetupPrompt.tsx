
'use client';

import Link from 'next/link';
import { Check, CreditCard, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import { Button, Card, buttonStyles } from '@/components/ui';
import type { ValidationState } from '@/hooks/useInvoiceDraft';

interface PaymentSetupPromptProps {
  currency: string;
  validation: ValidationState;
  onRetry: () => void;
}

export function PaymentSetupPrompt({
  currency,
  validation,
  onRetry,
}: PaymentSetupPromptProps) {
  if (validation.status === 'loading') {
    return (
      <div className="flex min-h-11 items-center gap-2 text-caption text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking {currency} payment instructions…
      </div>
    );
  }

  if (validation.status === 'ready' && validation.has_profile) {
    return (
      <p className="flex min-h-11 items-center gap-2 text-body text-text-soft">
        <Check className="h-4 w-4 text-leaf" aria-hidden="true" />
        {currency} payment instructions are ready.
      </p>
    );
  }

  const isError = validation.status === 'error';

  return (
    <Card zone="calm" tone="sun" className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-heading">
            {isError
              ? `Could not check ${currency} payment details`
              : `Add ${currency} payment instructions`}
          </h2>

          <p className="mt-1 text-body text-text-soft">
            {isError
              ? 'We could not confirm whether you have a usable default payment profile. You can retry or review your payment settings.'
              : `Your client will need to know where to pay. Add a bank account, payment link or mobile money details for ${currency}.`}
          </p>

          {!isError && (
            <p className="mt-2 text-caption text-text-muted">
              You can do this now or later. It does not prevent you from saving
              or issuing this invoice.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/settings/payments"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({
                variant: 'outline',
                zone: 'calm',
              })}
            >
              {isError ? 'Review payment settings' : 'Set up payment details'}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            {isError && (
              <Button
                type="button"
                variant="link"
                onClick={onRetry}
                className="min-h-10 px-1"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry check
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
