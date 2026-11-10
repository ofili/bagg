'use client';

/*
 * Sign in or create a workspace (one flow, email + 6-digit code).
 *
 * What changed from the current page:
 *  - phone layout: content starts near the top, not vertically centred, so the
 *    keyboard never covers the button
 *  - the code submits itself when the sixth digit arrives (also from SMS/email autofill)
 *  - "Send a new code" with a 30 second wait
 *  - "You were signed out" notice when the app sent you here (?expired=1)
 *  - the page you were on is kept through onboarding (?next= is passed along)
 *  - tolerates the old double-encoded ?next= value
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react';

import { BagCharacter, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';

const API_BASE = '/api';
const RESEND_SECONDS = 30;

type AuthResponse = {
  detail?: string;
  message?: string;
  workspace?: { business_name?: string | null; onboarding_completed?: boolean };
};

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

async function readApiResponse(res: Response): Promise<AuthResponse> {
  const data: unknown = await res.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Unexpected response from the server. Please try again.');
  }
  return data as AuthResponse;
}

function getSafeNextPath(next: string | null): string | null {
  if (!next) return null;
  let candidate = next;
  // Old links carried the path encoded twice ("%2Finvoices"). Decode it once.
  if (candidate.startsWith('%2F') || candidate.startsWith('%2f')) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      return null;
    }
  }
  // Allow only local absolute paths.
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\') || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return null;
  }
  try {
    const parsed = new URL(candidate, 'https://bagg.invalid');
    if (parsed.origin !== 'https://bagg.invalid') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

const fieldClass =
    'min-h-14 w-full rounded-input border-brut border-ink bg-surface px-4 py-3 text-body-l text-ink outline-none placeholder:text-ink-muted focus:shadow-brut-sm disabled:opacity-60';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.has('expired');
  const safeNext = getSafeNextPath(searchParams.get('next'));

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const sendCode = useCallback(async (address: string) => {
    const res = await fetch(`${API_BASE}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address }),
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || 'We could not send the code. Try again.');
    if ((data as any).code) {
      setCode((data as any).code);
    }
  }, []);

  const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    setError(null);
    try {
      await sendCode(normalized);
      setEmail(normalized);
      setCode('');
      setCooldown(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err, 'We could not send the code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await sendCode(email.trim().toLowerCase());
      setCode('');
      setCooldown(RESEND_SECONDS);
      codeRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err, 'We could not send a new code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value: string) => {
    if (loading || value.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: value }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || 'That code is not valid. Check it and try again.');

      // New workspaces finish setup first. The page they asked for travels along.
      if (data.workspace?.onboarding_completed !== true) {
        router.replace(safeNext ? `/onboarding?next=${encodeURIComponent(safeNext)}` : '/onboarding');
        return;
      }
      router.replace(safeNext ?? '/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'That code is not valid. Check it and try again.'));
      setCode('');
      codeRef.current?.focus();
      setLoading(false);
    }
  };

  const handleVerifyCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void verify(code.trim());
  };

  return (
      <div className="flex min-h-dvh flex-col bg-cream">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Bagg home" className="inline-flex min-h-11 items-center gap-2">
            <BagCharacter size={32} decorative />
            <Wordmark />
          </Link>
          <Link href="/i/token_demo_sample_ngn" className="inline-flex min-h-11 items-center text-label font-bold text-link hover:underline">
            See a client invoice
          </Link>
        </header>

        <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-8 px-5 pb-10 pt-2 md:grid-cols-[1fr_420px] md:content-center md:items-center md:py-16">
          <section className="hidden md:block">
            <BagCharacter size={104} className="mb-6" />
            <h1 className="text-display text-ink">welcome back.</h1>
            <p className="mt-4 max-w-md text-body-l text-ink-soft">
              Your invoices, clients and payments are where you left them. Sign in and pick up the thread.
            </p>
            <p className="mt-8 text-caption text-ink-muted">No passwords. No stored card numbers.</p>
          </section>

          <section className="space-y-5 md:rounded-card md:border md:border-line-subtle md:bg-surface md:p-8">
            <div className="flex items-center gap-3 md:hidden">
              <BagCharacter size={64} mood={step === 'code' ? 'thinking' : 'happy'} decorative />
            </div>

            <div>
              <h1 className="text-title-l text-ink md:text-title">
                {step === 'email' ? 'sign in or create a workspace' : 'check your email'}
              </h1>
              <p className="mt-2 text-body text-ink-soft">
                {step === 'email' ? (
                    'We send a one-time code. No password to remember.'
                ) : (
                    <>
                      We sent a 6-digit code to <span className="break-all font-bold text-ink">{email}</span>. It can take a minute. Check spam if it
                      has not arrived.
                    </>
                )}
              </p>
            </div>

            {expired && step === 'email' && (
                <div role="status" className="flex items-start gap-2 rounded-input bg-sun px-3 py-3 text-body text-[#4A3200]">
                  <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>You were signed out. Sign in to carry on where you left off.</span>
                </div>
            )}

            {error && (
                <div role="alert" className="rounded-input bg-pill-late/40 px-3 py-3 text-body text-late-text">
                  {error}
                </div>
            )}

            {step === 'email' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="text-label font-bold text-ink-soft">
                      email address
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        inputMode="email"
                        required
                        autoFocus
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className={`mt-1.5 ${fieldClass}`}
                    />
                  </div>
                  <button type="submit" disabled={loading} className={`${buttonStyles({ size: 'lg' })} w-full`}>
                    {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending code...
                        </>
                    ) : (
                        <>
                          Continue with email <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                    )}
                  </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label htmlFor="login-code" className="text-label font-bold text-ink-soft">
                      6-digit code
                    </label>
                    <input
                        ref={codeRef}
                        id="login-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        placeholder="000000"
                        value={code}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setCode(next);
                          if (next.length === 6) void verify(next);
                        }}
                        disabled={loading}
                        className={`mt-1.5 ${fieldClass} text-center font-mono text-title tracking-[0.4em]`}
                    />
                  </div>
                  <button type="submit" disabled={loading || code.trim().length !== 6} className={`${buttonStyles({ size: 'lg' })} w-full`}>
                    {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking...
                        </>
                    ) : (
                        'Enter workspace'
                    )}
                  </button>

                  <div className="flex flex-col items-center gap-1">
                    <button
                        type="button"
                        disabled={loading || cooldown > 0}
                        onClick={handleResend}
                        className="inline-flex min-h-11 items-center text-label font-bold text-link hover:underline disabled:text-ink-muted disabled:no-underline"
                    >
                      {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setStep('email');
                          setError(null);
                          setCode('');
                        }}
                        className="inline-flex min-h-11 items-center gap-1 text-label font-bold text-link hover:underline disabled:opacity-60"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Use a different email
                    </button>
                  </div>
                </form>
            )}

            <p className="border-t border-line-subtle pt-4 text-caption text-ink-muted">
              By signing in, you agree to Bagg&apos;s terms of service and privacy policy.
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
              <Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-label="Loading sign-in" />
            </div>
          }
      >
        <LoginPageContent />
      </Suspense>
  );
}
