'use client';

/*
 * Personal profile. Business details stay on /settings.
 * Email is read-only for now: changing it needs a confirmation code sent
 * to the new address, which is a separate piece of work.
 *
 * Match the field and button classes to the ones used in settings/NewQuoteDesktop.tsx
 * if they differ from the ones below.
 */
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/navigation/UserMenu';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const labelClass = 'block text-body font-bold text-ink mb-1.5';
const inputClass =
    'w-full rounded-input border-brut bg-surface px-3 py-3 text-body text-ink focus-visible:outline-none focus-visible:shadow-brut-sm disabled:bg-surface-tint disabled:text-text-muted';

type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'error';

export default function ProfilePage() {
    const [status, setStatus] = useState<Status>('loading');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API}/users/me`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => {
                setEmail(d.user.email);
                setFullName(d.user.full_name ?? '');
                setPhone(d.user.phone ?? '');
                setStatus('ready');
            })
            .catch(() => {
                setError('We could not load your profile. Refresh and try again.');
                setStatus('error');
            });
    }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setStatus('saving');
        setError(null);
        try {
            const r = await fetch(`${API}/users/me`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, phone }),
            });
            if (!r.ok) throw new Error();
            setStatus('saved');
        } catch {
            setError('We could not save your changes. Try again.');
            setStatus('error');
        }
    }

    const disabled = status === 'loading' || status === 'saving';

    return (
        <div className="mx-auto w-full max-w-xl px-4 py-8">
            <h1 className="text-title-l text-ink">Profile</h1>
            <p className="mt-1 text-body text-text-muted">
                Your personal details. Your business details are in Workspace settings.
            </p>

            <div className="mt-6 flex items-center gap-4">
                <Avatar name={fullName} email={email} size={72} />
                <p className="text-body text-text-muted">Photo uploads are coming soon. Your initials show until then.</p>
            </div>

            <form onSubmit={save} className="mt-6 flex flex-col gap-5 rounded-card border-brut bg-surface p-5 shadow-brut-sm">
                <div>
                    <label htmlFor="full_name" className={labelClass}>
                        Full name
                    </label>
                    <input
                        id="full_name"
                        className={inputClass}
                        value={fullName}
                        maxLength={120}
                        autoComplete="name"
                        disabled={disabled}
                        onChange={(e) => {
                            setFullName(e.target.value);
                            if (status === 'saved') setStatus('ready');
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="email" className={labelClass}>
                        Email
                    </label>
                    <input id="email" className={inputClass} value={email} disabled readOnly />
                    <p className="mt-1 text-body text-text-muted">You sign in with a code sent to this email.</p>
                </div>
                <div>
                    <label htmlFor="phone" className={labelClass}>
                        Phone
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        className={inputClass}
                        value={phone}
                        maxLength={32}
                        autoComplete="tel"
                        disabled={disabled}
                        onChange={(e) => {
                            setPhone(e.target.value);
                            if (status === 'saved') setStatus('ready');
                        }}
                    />
                </div>

                {error ? (
                    <p role="alert" className="text-body font-semibold text-danger">
                        {error}
                    </p>
                ) : null}
                {status === 'saved' ? (
                    <p role="status" className="text-body font-semibold text-ink">
                        Saved.
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={disabled}
                    className="self-start rounded-btn border-brut bg-mango px-5 py-3 font-extrabold text-on-mango shadow-brut-sm disabled:opacity-60"
                >
                    {status === 'saving' ? 'Saving…' : 'Save changes'}
                </button>
            </form>
        </div>
    );
}
