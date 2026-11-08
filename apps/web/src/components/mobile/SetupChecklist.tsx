'use client';

/*
 * First-run checklist for Home. It answers "what do I do now?" right after setup, and goes
 * away by itself once the basics are done (or when dismissed).
 *
 *   1 business details    done after onboarding
 *   2 payment details     for the workspace's default currency (nothing can be paid without it)
 *   3 first client
 *   4 first invoice       any invoice exists
 *   5 send it             any invoice has left draft/issued (sent, viewed, claimed, paid ...)
 *
 * Everything is read from endpoints the app already has, so nothing is stored here except
 * a local "dismissed" flag.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';
const DISMISS_KEY = 'bagg_setup_dismissed';

interface Step {
    key: string;
    label: string;
    hint: string;
    href: string;
    done: boolean;
}

export function SetupChecklist() {
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [dismissed, setDismissed] = useState(true); // assume hidden until we know

    useEffect(() => {
        try {
            setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
        } catch {
            setDismissed(false);
        }
    }, []);

    useEffect(() => {
        if (dismissed) return;
        let live = true;
        (async () => {
            try {
                const opts = { credentials: 'include' as const, cache: 'no-store' as const };
                const [meRes, clientsRes, metricsRes] = await Promise.all([
                    fetch(`${API_BASE}/auth/me`, opts),
                    fetch(`${API_BASE}/clients`, opts),
                    fetch(`${API_BASE}/invoices/metrics`, opts),
                ]);
                if (!meRes.ok || !clientsRes.ok || !metricsRes.ok) return;
                const me = await meRes.json();
                const clients: unknown[] = await clientsRes.json();
                const metrics: {
                    invoices_count: number;
                    sent_count: number;
                    viewed_count: number;
                    claimed_count: number;
                    partially_paid_count: number;
                    paid_count: number;
                    overdue_count: number;
                }[] = await metricsRes.json();

                const currency: string = me.workspace?.default_currency || 'NGN';
                const profileRes = await fetch(`${API_BASE}/payments/profiles/validate/${currency}`, opts);
                const profile = profileRes.ok ? await profileRes.json() : { has_profile: true };

                const created = metrics.reduce((n, m) => n + m.invoices_count, 0);
                const sent = metrics.reduce(
                    (n, m) => n + m.sent_count + m.viewed_count + m.claimed_count + m.partially_paid_count + m.paid_count + m.overdue_count,
                    0,
                );

                if (!live) return;
                setSteps([
                    { key: 'business', label: 'Set up your business', hint: 'Done', href: '/settings', done: true },
                    { key: 'payment', label: `Add ${currency} payment details`, hint: 'So clients know where to pay you', href: '/settings', done: !!profile.has_profile },
                    { key: 'client', label: 'Add your first client', hint: 'Takes about a minute', href: '/clients/new', done: clients.length > 0 },
                    { key: 'invoice', label: 'Create your first invoice', hint: 'Four quick steps', href: '/invoices/new', done: created > 0 },
                    { key: 'send', label: 'Send it to your client', hint: 'On WhatsApp or email', href: '/invoices', done: sent > 0 },
                ]);
            } catch {
                // Quietly show nothing if any call fails. This card is a nudge, never a blocker.
            }
        })();
        return () => {
            live = false;
        };
    }, [dismissed]);

    if (dismissed || !steps) return null;

    const doneCount = steps.filter((s) => s.done).length;
    if (doneCount === steps.length) {
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* ignore */
        }
        return null;
    }
    const nextKey = steps.find((s) => !s.done)?.key;

    return (
        <section aria-label="Getting started" className="space-y-3 rounded-card border-brut border-ink bg-surface p-4 shadow-brut-sm">
            <div className="flex items-center gap-3">
                <BagCharacter size={48} mood="excited" decorative />
                <div className="flex-1">
                    <h2 className="text-heading">get set up</h2>
                    <p className="text-caption text-text-soft">
                        {doneCount} of {steps.length} done
                    </p>
                </div>
            </div>
            <div
                role="progressbar"
                aria-label="Setup progress"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
                className="h-2.5 overflow-hidden rounded-full border-brut-thin border-ink bg-cream"
            >
                <div className="h-full bg-mango" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>

            <ol className="divide-y divide-line-subtle">
                {steps.map((s) => (
                    <li key={s.key}>
                        <Link
                            href={s.href}
                            aria-label={s.done ? `${s.label}, done` : s.label}
                            className="flex min-h-14 items-center gap-3 py-2"
                        >
              <span
                  aria-hidden
                  className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink',
                      s.done ? 'bg-leaf' : s.key === nextKey ? 'bg-sun' : 'bg-surface',
                  )}
              >
                {s.done && <Check className="h-4 w-4" />}
              </span>
                            <span className="min-w-0 flex-1">
                <span className={cn('block font-extrabold', s.done && 'text-text-soft line-through')}>{s.label}</span>
                                {!s.done && <span className="block text-caption text-text-soft">{s.hint}</span>}
              </span>
                        </Link>
                    </li>
                ))}
            </ol>

            <div className="flex items-center justify-between gap-3">
                {nextKey && (
                    <Link href={steps.find((s) => s.key === nextKey)!.href} className={buttonStyles({ zone: 'calm' })}>
                        Do this next
                    </Link>
                )}
                <button
                    type="button"
                    onClick={() => {
                        try {
                            window.localStorage.setItem(DISMISS_KEY, '1');
                        } catch {
                            /* ignore */
                        }
                        setDismissed(true);
                    }}
                    className="inline-flex min-h-11 items-center text-body font-bold text-text-soft underline underline-offset-4"
                >
                    Hide for now
                </button>
            </div>
        </section>
    );
}
