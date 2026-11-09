'use client';

/*
 * Avatar menu for the app header.
 * Desktop: popover under the avatar. Phone: bottom sheet.
 *
 * I haven't seen how the app fetches data or the exact exports of
 * '@/components/ui/sheet', so two things may need a small tweak:
 *   - the fetch helpers below call /auth/me and /auth/logout directly
 *   - Sheet props follow how HeaderMenu.tsx already uses them
 * Classes follow the existing brutalist utilities.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

type Me = {
    user: { email: string; full_name?: string | null; avatar_url?: string | null };
    workspace: { business_name?: string | null };
};

const API = '/api';

export function initialsOf(name?: string | null, email?: string | null) {
    const n = (name ?? '').trim();
    if (n) {
        const parts = n.split(/\s+/);
        return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }
    return (email ?? '?')[0].toUpperCase();
}

/** Initials on a mango circle until a photo exists. */
export function Avatar({
                           name,
                           email,
                           src,
                           size = 36,
                       }: {
    name?: string | null;
    email?: string | null;
    src?: string | null;
    size?: number;
}) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt="" width={size} height={size} className="rounded-full border-brut object-cover" />;
    }
    return (
        <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center rounded-full border-brut bg-mango font-extrabold text-on-mango"
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
      {initialsOf(name, email)}
    </span>
    );
}

export function useMe() {
    const [me, setMe] = useState<Me | null>(null);
    useEffect(() => {
        let live = true;
        fetch(`${API}/auth/me`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => live && setMe(d))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);
    return me;
}

const itemClass =
    'flex w-full items-center rounded-row px-3 py-3 text-left text-body font-semibold text-ink hover:bg-surface-tint focus-visible:outline-none focus-visible:bg-surface-tint';

export function MenuBody({ me, onNavigate }: { me: Me | null; onNavigate?: () => void }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function logout() {
        setBusy(true);
        try {
            await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        } finally {
            router.replace('/login');
            router.refresh();
        }
    }

    const name = me?.user.full_name || me?.workspace.business_name || me?.user.email;

    return (
        <div className="flex flex-col gap-1" role="menu">
            <div className="flex items-center gap-3 border-b-2 border-ink px-3 pb-3 pt-1">
                <Avatar name={me?.user.full_name} email={me?.user.email} src={me?.user.avatar_url} size={44} />
                <div className="min-w-0">
                    <p className="truncate font-extrabold text-ink">{name ?? 'Your account'}</p>
                    <p className="truncate text-body text-text-muted">{me?.user.email}</p>
                </div>
            </div>
            <Link href="/profile" role="menuitem" className={itemClass} onClick={onNavigate}>
                Profile
            </Link>
            <Link href="/settings" role="menuitem" className={itemClass} onClick={onNavigate}>
                Workspace settings
            </Link>
            <Link href="/settings#plan" role="menuitem" className={itemClass} onClick={onNavigate}>
                Plan and billing
            </Link>
            {/* TODO: add "Help and feedback" once there is a support link. */}
            <div className="my-1 border-t-2 border-ink" />
            <button type="button" role="menuitem" className={cn(itemClass, 'text-danger')} onClick={logout} disabled={busy}>
                {busy ? 'Logging out…' : 'Log out'}
            </button>
        </div>
    );
}

export function UserMenu() {
    const me = useMe();
    const [open, setOpen] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);

    // Desktop popover: close on outside click and Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const trigger = (
        <Avatar name={me?.user.full_name} email={me?.user.email} src={me?.user.avatar_url} />
    );

    return (
        <>
            {/* Phone: bottom sheet */}
            <div className="sm:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <button type="button" aria-label="Account menu" className="rounded-full">
                            {trigger}
                        </button>
                    </SheetTrigger>
                    <SheetContent title="Account">
                        <SheetClose asChild>
                            <div>
                                <MenuBody me={me} />
                            </div>
                        </SheetClose>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop: popover */}
            <div ref={wrap} className="relative hidden sm:block">
                <button
                    type="button"
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                    className="rounded-full"
                >
                    {trigger}
                </button>
                {open ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-card border-brut bg-surface p-2 shadow-brut-sm">
                        <MenuBody me={me} onNavigate={() => setOpen(false)} />
                    </div>
                ) : null}
            </div>
        </>
    );
}
