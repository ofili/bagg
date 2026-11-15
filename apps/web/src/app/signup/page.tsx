import { redirect } from 'next/navigation';

type SignupSearchParams = {
  next?: string | string[];
  plan?: string | string[];
  billing_interval?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SignupSearchParams>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();

  params.set('intent', 'signup');

  const next = firstValue(query.next);
  const plan = firstValue(query.plan);
  const billingInterval = firstValue(query.billing_interval);

  if (next) params.set('next', next);
  if (plan) params.set('plan', plan);
  if (billingInterval) {
    params.set('billing_interval', billingInterval);
  }

  redirect(`/login?${params.toString()}`);
}