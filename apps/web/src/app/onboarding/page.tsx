'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { BagCharacter, BagMark, Wordmark } from '@/components/brand';
import {
  Alert,
  BaggSelect,
  Button,
  FormGrid,
  TextArea,
  TextField,
} from '@/components/ui';

import {
  getPostSetupDestination,
  readOnboardingContinuation,
} from '@/lib/onboarding-navigation';

const API_BASE = '/api';

type BusinessProfile = {
  business_name: string;
  country: string;
  default_currency: string;
  address: string | null;
};

type OnboardingProgressResponse = {
  status: 'not_started' | 'in_progress' | 'completed';
  schema_version: number;
  current_step: string | null;
  completed_steps: string[];
  skipped_steps: string[];
  required_steps_remaining: string[];
  onboarding_completed: boolean;
  business_profile: BusinessProfile;
  next_action: {
    type: string;
    href: string;
  } | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
};

function getApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (
          item &&
          typeof item === 'object' &&
          'msg' in item &&
          typeof item.msg === 'string'
        ) {
          return item.msg;
        }

        return null;
      })
      .filter(Boolean);

    if (messages.length) return messages.join(' ');
  }

  return fallback;
}

async function readJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Unexpected response from the server. Please try again.');
  }

  if (!response.ok) {
    throw new Error(
      getApiError(data, 'Something went wrong. Please try again.'),
    );
  }

  return data as T;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const continuation = useMemo(
    () => readOnboardingContinuation(searchParams),
    [searchParams],
  );

  const [businessName, setBusinessName] = useState('');
  const [country, setCountry] = useState('NG');
  const [currency, setCurrency] = useState('NGN');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const response = await fetch(`${API_BASE}/onboarding`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        const progress =
          await readJson<OnboardingProgressResponse>(response);

        if (cancelled) return;

        if (progress.onboarding_completed) {
          router.replace(getPostSetupDestination(continuation));
          return;
        }

        const profile = progress.business_profile;

        setBusinessName(
          profile?.business_name === 'My Business'
            ? ''
            : profile?.business_name || '',
        );

        setCountry(profile?.country || 'NG');
        setCurrency(profile?.default_currency || 'NGN');
        setAddress(profile?.address || '');
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'We could not load your workspace. Please try again.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [router, continuation]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanName = businessName.trim();

    if (!cleanName) {
      setError('Enter the business name you want on your documents.');
      return;
    }

    if (cleanName.length > 200) {
      setError('Business name must be 200 characters or fewer.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/onboarding/business-profile`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_name: cleanName,
            country,
            default_currency: currency,
            address: address.trim() || null,
          }),
        },
      );

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      const result =
        await readJson<OnboardingProgressResponse>(response);

      if (result.onboarding_completed !== true) {
        throw new Error(
          'Your business setup was not confirmed. Please try again.',
        );
      }

      router.replace(getPostSetupDestination(continuation));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not save your details. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
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

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-10">
        {loading ? (
          <div
            role="status"
            className="flex w-full justify-center py-16"
          >
            <Loader2
              className="h-7 w-7 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading workspace</span>
          </div>
        ) : (
          <section className="w-full border-brut border-ink bg-surface p-6 sm:p-9">
            <BagCharacter size={64} className="mb-5" />

            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              First, the basics
            </p>

            <h1 className="mt-2 text-display text-text">
              Set up your business.
            </h1>

            <p className="mt-3 text-body-l text-text-soft">
              Your business name appears on invoices, quotes and receipts.
              You can change these details later in Settings.
            </p>

            {error && (
              <Alert variant="error" className="mt-5">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <TextField
                id="business-name"
                name="business_name"
                label="Business name"
                required
                autoFocus
                autoComplete="organization"
                maxLength={200}
                placeholder="e.g. Ada Studio or Acme Limited"
                hint="Use your trading name or registered business name."
                value={businessName}
                onChange={(event) =>
                  setBusinessName(event.target.value)
                }
              />

              <FormGrid>
                <BaggSelect
                  label="Country"
                  value={country}
                  onChange={(next) => {
                    setCountry(next);

                    const defaults: Record<string, string> = {
                      NG: 'NGN',
                      GH: 'GHS',
                      KE: 'KES',
                      ZA: 'ZAR',
                      GB: 'GBP',
                      US: 'USD',
                    };

                    if (defaults[next]) {
                      setCurrency(defaults[next]);
                    }
                  }}
                  options={[
                    { value: 'NG', label: 'Nigeria' },
                    { value: 'GH', label: 'Ghana' },
                    { value: 'KE', label: 'Kenya' },
                    { value: 'ZA', label: 'South Africa' },
                    { value: 'GB', label: 'United Kingdom' },
                    { value: 'US', label: 'United States' },
                  ]}
                />

                <BaggSelect
                  label="Default currency"
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { value: 'NGN', label: 'NGN · Nigerian naira' },
                    { value: 'USD', label: 'USD · US dollar' },
                    { value: 'GBP', label: 'GBP · British pound' },
                    { value: 'EUR', label: 'EUR · Euro' },
                    { value: 'GHS', label: 'GHS · Ghanaian cedi' },
                    { value: 'KES', label: 'KES · Kenyan shilling' },
                    { value: 'ZAR', label: 'ZAR · South African rand' },
                  ]}
                />
              </FormGrid>

              <TextArea
                id="address"
                name="address"
                label="Business address"
                optional
                autoComplete="street-address"
                rows={3}
                maxLength={500}
                placeholder="Address to display on your documents"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={saving || loading}
              >
                {saving ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Saving your business…
                  </>
                ) : (
                  <>
                    Continue to Bagg
                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Button>

              <p className="text-center text-caption text-text-muted">
                You can update these details in Settings at any time.
              </p>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}