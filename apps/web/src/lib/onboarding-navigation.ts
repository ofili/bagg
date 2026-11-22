export type OnboardingContinuation = {
  next: string | null;
  plan: 'creator_pro' | 'professional' | null;
  billingInterval: 'monthly' | 'annual' | null;
};

type SearchParamsReader = {
  get(name: string): string | null;
};

const VALID_PLANS = new Set(['creator_pro', 'professional']);
const VALID_INTERVALS = new Set(['monthly', 'annual']);

export function getSafeNextPath(value: string | null): string | null {
  if (!value) return null;

  let candidate = value;

  // Support legacy links that encoded the path twice.
  if (candidate.startsWith('%2F') || candidate.startsWith('%2f')) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      return null;
    }
  }

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, 'https://bagg.invalid');

    if (parsed.origin !== 'https://bagg.invalid') return null;

    // Do not allow continuation targets that create redirect loops.
    if (
      parsed.pathname === '/login' ||
      parsed.pathname === '/signup' ||
      parsed.pathname === '/onboarding' ||
      parsed.pathname.startsWith('/onboarding/')
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function readOnboardingContinuation(
  params: SearchParamsReader,
): OnboardingContinuation {
  const rawPlan = params.get('plan');
  const rawInterval = params.get('billing_interval');

  const plan =
    rawPlan && VALID_PLANS.has(rawPlan)
      ? (rawPlan as OnboardingContinuation['plan'])
      : null;

  const billingInterval =
    rawInterval && VALID_INTERVALS.has(rawInterval)
      ? (rawInterval as OnboardingContinuation['billingInterval'])
      : null;

  return {
    next: getSafeNextPath(params.get('next')),
    plan,
    billingInterval,
  };
}

export function buildContinuationQuery(
  continuation: OnboardingContinuation,
): string {
  const params = new URLSearchParams();

  if (continuation.next) {
    params.set('next', continuation.next);
  }

  if (continuation.plan) {
    params.set('plan', continuation.plan);
  }

  if (continuation.billingInterval) {
    params.set('billing_interval', continuation.billingInterval);
  }

  return params.toString();
}

export function getPostAuthDestination(
  onboardingCompleted: boolean,
  continuation: OnboardingContinuation,
): string {
  const query = buildContinuationQuery(continuation);

  if (!onboardingCompleted) {
    return query ? `/onboarding?${query}` : '/onboarding';
  }

  // ONB-05 will implement this destination.
  if (continuation.plan) {
    return `/onboarding/plan${query ? `?${query}` : ''}`;
  }

  return continuation.next ?? '/dashboard';
}


export function getPostSetupDestination(
  continuation: OnboardingContinuation,
): string {
  const query = buildContinuationQuery(continuation);

  // A paid plan selection is an explicit purchase intention.
  // Preserve it and continue to the plan/checkout experience.
  if (continuation.plan) {
    return `/onboarding/plan${query ? `?${query}` : ''}`;
  }

  // No paid-plan intent: complete onboarding and enter the workspace.
  return continuation.next ?? '/dashboard';
}
