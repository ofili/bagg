
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { AuthFlow } from '@/components/auth/AuthFlow';

function SignupPageContent() {
  const searchParams = useSearchParams();

  // AuthFlow reads the same continuation parameters. This component exists
  // separately so signup remains a first-class route rather than a login alias.
  void searchParams;

  return <AuthFlow mode="signup" />;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-6 w-6 animate-spin text-text-muted"
            aria-label="Loading signup"
          />
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
