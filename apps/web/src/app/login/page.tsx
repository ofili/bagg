'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import { BagCharacter, CoinLogo, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'we could not send the code. Try again.');

      if (data.dev_code) {
        setDevCode(data.dev_code);
        setCode(data.dev_code);
      }
      setStep('code');
    } catch (err) {
      setError(errorMessage(err, 'we could not send the code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'that code is not valid. Check it and try again.');

      router.push('/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'that code is not valid. Check it and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="bagg home" className="inline-flex items-center gap-2">
          <CoinLogo size={32} />
          <Wordmark />
        </Link>
        <Link href="/i/token_demo_sample_ngn" className="text-label font-bold text-link hover:underline">
          See a client invoice
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:py-16">
        <section className="hidden md:block">
          <BagCharacter size={104} className="mb-6" />
          <h1 className="text-display text-ink">welcome back.</h1>
          <p className="mt-4 max-w-md text-body-l text-ink-soft">
            Your invoices, clients and payments are where you left them. Sign in and pick up the
            thread.
          </p>
          <p className="mt-8 text-caption text-ink-muted">No passwords. No stored card numbers.</p>
        </section>

        <section className="rounded-card border border-line-subtle bg-surface p-6 sm:p-8">
          <h2 className="text-title text-ink">
            {step === 'email' ? 'sign in or create a workspace' : 'check your inbox'}
          </h2>
          <p className="mt-2 text-body text-ink-soft">
            {step === 'email'
              ? 'We send a one-time code. No password to remember.'
              : `We sent a 6-digit code to ${email}.`}
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="mt-6 space-y-5">
              <div>
                <label htmlFor="login-email" className="text-label font-bold text-ink-soft">
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
                    className="min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2.5 pr-10 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20"
                  />
                  <Mail
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className={buttonStyles({ className: 'w-full' })}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    Continue with email <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="mt-6 space-y-5">
              <div>
                <label htmlFor="login-code" className="text-label font-bold text-ink-soft">
                  6-digit code
                </label>
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1.5 min-h-12 w-full rounded-input border border-line bg-surface px-3 py-2.5 text-center font-mono text-title tracking-[0.3em] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20"
                />
              </div>

              {devCode && (
                <div className="flex items-center justify-between gap-3 rounded-input bg-peach-chip px-3 py-2 text-caption text-ink-soft">
                  <span>
                    Dev code: <strong className="font-mono text-ink">{devCode}</strong>
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 font-extrabold text-ink-soft">
                    auto-filled
                  </span>
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonStyles({ className: 'w-full' })}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  'Enter workspace'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setCode('');
                  setDevCode(null);
                }}
                className="inline-flex w-full items-center justify-center gap-1 text-label font-bold text-link hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Use a different email
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-line-subtle pt-4 text-caption text-ink-muted">
            By signing in, you agree to bagg&apos;s terms of service and privacy policy.
          </p>
        </section>
      </main>
    </div>
  );
}
