import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { CheckoutOutcome } from '@/components/billing/CheckoutOutcome';

export default function CheckoutPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-7 w-7 animate-spin text-text-muted"
            aria-label="Checking payment"
          />
        </div>
      }
    >
      <CheckoutOutcome variant="pending" />
    </Suspense>
  );
}