﻿﻿
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BagCharacter, CoinLogo, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';
import { BaggSelect } from '@/components/ui';

const API_BASE =
  '/api';

const inputClass =
  'min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2.5 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass =
  'mb-1.5 block text-label font-bold text-ink-soft';

export default function OnboardingPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [country, setCountry] = useState('NG');
  const [currency, setCurrency] = useState('NGN');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
        });

        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        if (!res.ok) {
          throw new Error('We could not load your workspace. Please try again.');
        }

        const data = await res.json();
        const workspace = data.workspace;

        if (cancelled) return;

        if (workspace?.onboarding_completed === true) {
          router.replace('/dashboard');
          return;
        }

        setBusinessName(
          workspace?.business_name === 'My Business'
            ? ''
            : workspace?.business_name || '',
        );
        setCountry(workspace?.country || 'NG');
        setCurrency(workspace?.default_currency || 'NGN');
        setAddress(workspace?.address || '');
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'We could not load your workspace.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanName = businessName.trim();

    if (!cleanName) {
      setError('Enter the business name you want on your documents.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/workspaces/current/complete-onboarding`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name: cleanName,
            country,
            default_currency: currency,
            address: address.trim() || null,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace('/login');
        return;
      }

      if (!res.ok) {
        throw new Error(
          data.detail || 'We could not save your details. Please try again.',
        );
      }

      if (data.onboarding_completed !== true) {
        throw new Error('Setup was not confirmed. Please try again.');
      }

      router.replace('/dashboard');
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
          className="inline-flex items-center gap-2"
        >
          <CoinLogo size={32} />
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-10">
        {loading ? (
          <div role="status" className="flex w-full justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading workspace</span>
          </div>
        ) : (
          <section className="w-full rounded-card border border-line-subtle bg-surface p-6 sm:p-9">
            <BagCharacter size={64} className="mb-5" />

            <p className="text-caption font-extrabold uppercase tracking-wide text-ink-muted">
              First, the basics
            </p>

            <h1 className="mt-2 text-display text-ink">
              Set up your business.
            </h1>

            <p className="mt-3 text-body-l text-ink-soft">
              Your business name appears on invoices, quotes and receipts.
              You can change these details later in Settings.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="business-name" className={labelClass}>
                  Business name *
                </label>
                <input
                  id="business-name"
                  name="business_name"
                  type="text"
                  required
                  autoFocus
                  autoComplete="organization"
                  maxLength={200}
                  placeholder="e.g. Ada Studio or Acme Limited"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-caption text-ink-muted">
                  Use your trading name or registered business name.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <BaggSelect
                  label="Country"
                  className="w-full"
                  value={country}
                  onChange={(next) => {
                    setCountry(next);
                    const defaults: Record<string, string> = {
                      NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', GB: 'GBP', US: 'USD',
                    };
                    if (defaults[next]) setCurrency(defaults[next]);
                  }}
                  options={[
                    { value: 'NG', label: 'Nigeria' },
                    { value: 'GH', label: 'Ghana' },
                    { value: 'KE', label: 'Kenya' },
                    { value: 'ZA', label: 'South Africa' },
                    { value: 'GB', label: 'United Kingdom' },
                    { value: 'US', label: 'United States' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />

                <BaggSelect
                  label="Default currency"
                  className="w-full"
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
              </div>

              <div>
                <label htmlFor="address" className={labelClass}>
                  Business address (optional)
                </label>
                <textarea
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  rows={3}
                  maxLength={500}
                  placeholder="Address to display on your documents"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
  type="submit"
  disabled={saving || loading}
  className={`${buttonStyles()} w-full`}
>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving your business…
                  </>
                ) : (
                  <>
                    Continue to Bagg
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>

              <p className="text-center text-caption text-ink-muted">
                You can update these details in Settings at any time.
              </p>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
