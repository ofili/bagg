
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { AuthFlow } from '@/components/auth/AuthFlow';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-6 w-6 animate-spin text-text-muted"
            aria-label="Loading sign-in"
          />
        </div>
      }
    >
      <AuthFlow mode="login" />
    </Suspense>
  );
}
