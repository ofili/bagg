
'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';

import { BagCharacter, CoinLogo, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type WorkspaceResponse = {
  business_name?: string | null;
  onboarding_completed?: boolean;
};

type AuthResponse = {
  detail?: string;
  dev_code?: string;
  workspace?: WorkspaceResponse;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

async function readApiResponse(res: Response): Promise<AuthResponse> {
  const data: unknown = await res.json().catch(() => null);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      'Unexpected response from the server. Please try again.',
    );
  }

  return data as AuthResponse;
}

function getSafeNextPath(next: string | null): string | null {
  if (!next) return null;

  // Allow only local absolute paths.
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return null;
  }

  try {
    const parsed = new URL(next, 'https://bagg.invalid');

    if (parsed.origin !== 'https://bagg.invalid') {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const data = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(
          data.detail || 'We could not send the code. Try again.',
        );
      }

      setEmail(normalizedEmail);

      if (data.dev_code) {
        setDevCode(data.dev_code);
        setCode(data.dev_code);
      } else {
        setDevCode(null);
        setCode('');
      }

      setStep('code');
    } catch (err) {
      setError(
        errorMessage(err, 'We could not send the code. Try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedCode = code.trim();

    if (!normalizedCode) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: normalizedCode,
        }),
      });

      const data = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(
          data.detail ||
            'That code is not valid. Check it and try again.',
        );
      }

      // Onboarding must be completed before entering the app.
      const onboardingCompleted =
        data.workspace?.onboarding_completed === true;

      if (!onboardingCompleted) {
        router.replace('/onboarding');
        return;
      }

      // Restore the original destination only after onboarding.
      const safeNext = getSafeNextPath(searchParams.get('next'));

      router.replace(safeNext ?? '/dashboard');
    } catch (err) {
      setError(
        errorMessage(
          err,
          'That code is not valid. Check it and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link
          href="/"
          aria-label="Bagg home"
          className="inline-flex items-center gap-2"
        >
          <CoinLogo size={32} />
          <Wordmark />
        </Link>

        <Link
          href="/i/token_demo_sample_ngn"
          className="text-label font-bold text-link hover:underline"
        >
          See a client invoice
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:py-16">
        <section className="hidden md:block">
          <BagCharacter size={104} className="mb-6" />

          <h1 className="text-display text-ink">welcome back.</h1>

          <p className="mt-4 max-w-md text-body-l text-ink-soft">
            Your invoices, clients and payments are where you left them.
            Sign in and pick up the thread.
          </p>

          <p className="mt-8 text-caption text-ink-muted">
            No passwords. No stored card numbers.
          </p>
        </section>

        <section className="rounded-card border border-line-subtle bg-surface p-6 sm:p-8">
          <h2 className="text-title text-ink">
            {step === 'email'
              ? 'sign in or create a workspace'
              : 'check your inbox'}
          </h2>

          <p className="mt-2 text-body text-ink-soft">
            {step === 'email' ? (
              'We send a one-time code. No password to remember.'
            ) : (
              <>
                We sent a 6-digit code to{' '}
                <span className="break-all">{email}</span>.
              </>
            )}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text"
            >
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form
              onSubmit={handleSendCode}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="text-label font-bold text-ink-soft"
                >
                  email address
                </label>

                <div className="relative mt-1.5">
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2.5 pr-10 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20 disabled:opacity-60"
                  />

                  <Mail
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <button
  type="submit"
  disabled={loading}
  className={`${buttonStyles()} w-full`}
>
                {loading ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Sending code...
                  </>
                ) : (
                  <>
                    Continue with email
                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleVerifyCode}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="login-code"
                  className="text-label font-bold text-ink-soft"
                >
                  6-digit code
                </label>

                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={loading}
                  className="mt-1.5 min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2.5 text-center font-mono text-title tracking-[0.3em] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20 disabled:opacity-60"
                />
              </div>

              {devCode && (
                <div className="flex items-center justify-between gap-3 rounded-input bg-peach-chip px-3 py-2 text-caption text-ink-soft">
                  <span>
                    Dev code:{' '}
                    <strong className="font-mono text-ink">
                      {devCode}
                    </strong>
                  </span>

                  <span className="rounded-full bg-surface px-2 py-0.5 font-extrabold text-ink-soft">
                    auto-filled
                  </span>
                </div>
              )}

              <button
  type="submit"
  disabled={loading || code.trim().length !== 6}
  className={`${buttonStyles()} w-full`}
>
                
                {loading ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Verifying...
                  </>
                ) : (
                  'Enter workspace'
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setCode('');
                  setDevCode(null);
                }}
                className="inline-flex w-full items-center justify-center gap-1 text-label font-bold text-link hover:underline disabled:opacity-60"
              >
                <ArrowLeft
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Use a different email
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-line-subtle pt-4 text-caption text-ink-muted">
            By signing in, you agree to Bagg&apos;s terms of service and
            privacy policy.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <Loader2
            className="h-6 w-6 animate-spin text-ink-muted"
            aria-label="Loading sign-in"
          />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
