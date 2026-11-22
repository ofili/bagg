
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { BagCharacter, BagMark, Wordmark } from '@/components/brand';
import {
  Alert,
  Button,
  EmailField,
  OtpField,
  StepIndicator,
  TextField,
  buttonStyles,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  getPostAuthDestination,
  readOnboardingContinuation,
} from '@/lib/onboarding-navigation';
import {
  captureFirstTouchAttribution,
  readFirstTouchAttribution,
} from '@/lib/acquisition-attribution';

const API_BASE = '/api';
const RESEND_SECONDS = 30;

type AuthMode = 'signup' | 'login';

type AuthResponse = {
  detail?: string;
  message?: string;
  code?: string;
  workspace?: {
    business_name?: string | null;
    onboarding_completed?: boolean;
  };
};

type Props = {
  mode: AuthMode;
};

async function readApiResponse(
  response: Response,
): Promise<AuthResponse> {
  const data: unknown = await response.json().catch(() => null);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Unexpected response from the server. Please try again.');
  }

  return data as AuthResponse;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function AuthFlow({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignup = mode === 'signup';
  const expired = searchParams.has('expired');
  const continuation = readOnboardingContinuation(searchParams);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    captureFirstTouchAttribution();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(
      () => setCooldown((current) => current - 1),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') {
      codeRef.current?.focus();
    }
  }, [step]);

  const sendCode = useCallback(async (address: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address }),
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(
        data.detail || 'We could not send the code. Please try again.',
      );
    }

    return data.code ?? '';
  }, []);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    if (!normalizedEmail) return;

    if (isSignup && !normalizedName) {
      setError('Enter your full name to create your account.');
      return;
    }

    if (isSignup && normalizedName.length > 120) {
      setError('Your name must be 120 characters or fewer.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const developmentCode = await sendCode(normalizedEmail);

      setEmail(normalizedEmail);
      setCode(developmentCode);
      setCooldown(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err, 'We could not send the code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const developmentCode = await sendCode(email);

      setCode(developmentCode);
      setCooldown(RESEND_SECONDS);
      codeRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err, 'We could not send a new code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function verify(value: string) {
    if (loading || value.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          code: value,
          intent: mode,
          ...(isSignup ? { full_name: fullName.trim() } : {}),
          attribution: readFirstTouchAttribution(),
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || 'That code is not valid. Check it and try again.',
        );
      }

      const destination = getPostAuthDestination(
        data.workspace?.onboarding_completed === true,
        continuation,
      );

      router.replace(destination);
    } catch (err) {
      setError(
        errorMessage(
          err,
          'That code is not valid. Check it and try again.',
        ),
      );
      setCode('');
      codeRef.current?.focus();
      setLoading(false);
    }
  }

  function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify(code.trim());
  }

  const heading = step === 'code'
    ? 'check your email'
    : isSignup
      ? 'create your Bagg account'
      : 'welcome back';

  return (
    <div className="flex min-h-dvh flex-col bg-cream" data-theme="light">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          aria-label="Bagg home"
          className="inline-flex min-h-11 items-center gap-2"
        >
          <BagMark size={32} />
          <Wordmark />
        </Link>

        <Link
          href="/i/token_demo_sample_ngn"
          className="inline-flex min-h-11 items-center text-label font-bold text-link hover:underline"
        >
          See a client invoice
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-8 px-5 pb-10 pt-2 md:grid-cols-[1fr_420px] md:content-center md:items-center md:py-16">
        <section className="hidden md:block">
          <BagCharacter size={104} className="mb-6" />
          <h1 className="text-display text-text">
            {isSignup ? 'less admin. more creating.' : 'welcome back.'}
          </h1>
          <p className="mt-4 max-w-md text-body-l text-text-soft">
            {isSignup
              ? 'Create invoices, share payment links and keep track of what clients owe you.'
              : 'Your invoices, clients and payments are where you left them. Sign in and pick up the thread.'}
          </p>
          <p className="mt-8 text-caption text-text-muted">
            No passwords. No stored card numbers.
          </p>
        </section>

        <section className="space-y-5 md:border-brut md:border-ink md:bg-surface md:p-8">
          <StepIndicator
            steps={[
              { id: 'details', label: isSignup ? 'Your details' : 'Email' },
              { id: 'code', label: 'Verify' },
            ]}
            current={step}
            label={isSignup ? 'Signup progress' : 'Sign-in progress'}
          />

          <div className="flex items-center gap-3 md:hidden">
            <BagCharacter
              size={64}
              mood={step === 'code' ? 'thinking' : 'happy'}
              decorative
            />
          </div>

          <div>
            <h1 className="text-title-l text-text md:text-title">
              {heading}
            </h1>

            <p className="mt-2 text-body text-text-soft">
              {step === 'details'
                ? isSignup
                  ? 'Start with your name and email. You can add your business details next.'
                  : 'We send a one-time code. No password to remember.'
                : (
                  <>
                    We sent a 6-digit code to{' '}
                    <span className="break-all font-bold text-text">{email}</span>.
                    It can take a minute. Check spam if it has not arrived.
                  </>
                )}
            </p>
          </div>

          {expired && step === 'details' && (
            <Alert variant="warning">
              You were signed out. Sign in to carry on where you left off.
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {step === 'details' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              {isSignup && (
                <TextField
                  id="signup-full-name"
                  label="Your full name"
                  required
                  autoComplete="name"
                  placeholder="e.g. Alex Okafor"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={loading}
                />
              )}

              <EmailField
                id={isSignup ? 'signup-email' : 'login-email'}
                label="Email address"
                required
                autoFocus={!isSignup}
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />

              <Button type="submit" size="lg" fullWidth disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Sending code…
                  </>
                ) : (
                  <>
                    {isSignup ? 'Create account' : 'Continue with email'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <OtpField
                ref={codeRef}
                id={isSignup ? 'signup-code' : 'login-code'}
                label="6-digit code"
                placeholder="000000"
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (next.length === 6) void verify(next);
                }}
                disabled={loading}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={loading || code.trim().length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Checking…
                  </>
                ) : (
                  isSignup ? 'Verify and continue' : 'Enter workspace'
                )}
              </Button>

              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={loading || cooldown > 0}
                  onClick={handleResend}
                  className={cn(
                    buttonStyles({ variant: 'link' }),
                    'disabled:text-text-muted disabled:no-underline',
                  )}
                >
                  {cooldown > 0
                    ? `Send a new code in ${cooldown}s`
                    : 'Send a new code'}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setStep('details');
                    setError(null);
                    setCode('');
                  }}
                  className={buttonStyles({ variant: 'link' })}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Use a different email
                </button>
              </div>
            </form>
          )}

          <div className="border-t border-line-subtle pt-4 text-center text-caption text-text-muted">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <Link
                  href={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                  className="font-bold text-link hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Bagg?{' '}
                <Link
                  href={`/signup${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                  className="font-bold text-link hover:underline"
                >
                  Create an account
                </Link>
              </>
            )}
            <p className="mt-3">
              By continuing, you agree to Bagg&apos;s terms of service and privacy policy.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
