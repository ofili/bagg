'use client';

/*
 * Phone tab bar: Home, Invoices, [+ create], Clients, Me.
 *
 * - "Invoices" stays active on /invoices, /quotes and /receipts. Those three
 *   share the DocTabs switcher at the top of each list page.
 * - "+" opens a bottom sheet to create an invoice, quotes or client.
 * - "Me" opens the account sheet (profile, workspace settings, plan, log out).
 *   It needs components/navigation/UserMenu.tsx from the profile work.
 * - The overdue badge reads /api/invoices/metrics and adds up the counts of
 *   every currency. It is a count, not a sum of money.
 *
 * NAV_ITEMS in navItems.ts is untouched: the tablet rail and the desktop
 * sidebar still use it.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    AddressBook,
    ArrowsClockwise,
    House,
    Plus,
    Receipt,
    Scroll,
    User,
    UserPlus,
    Users,
} from '@phosphor-icons/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MenuBody, useMe } from '@/components/navigation/UserMenu';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

type Tab = { label: string; href: string; match: string[]; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> };

const LEFT: Tab[] = [
    { label: 'Home', href: '/dashboard', match: ['/dashboard'], icon: House },
    { label: 'Invoices', href: '/invoices', match: ['/invoices', '/quotes', '/receipts', '/recurring-invoices'], icon: Receipt },
];
const RIGHT: Tab[] = [{ label: 'Clients', href: '/clients', match: ['/clients'], icon: Users }];

const isOn = (pathname: string, match: string[]) =>
    match.some((m) => pathname === m || pathname.startsWith(m + '/'));

function useOverdueCount(pathname: string) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let live = true;
        fetch(`${API_BASE}/invoices/metrics`, { credentials: 'include', cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : []))
            .then((rows: { overdue_count?: number }[]) => {
                if (live) setCount(rows.reduce((n, r) => n + (r.overdue_count ?? 0), 0));
            })
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [pathname]);
    return count;
}

function TabLink({ tab, active, badge }: { tab: Tab; active: boolean; badge?: number }) {
    const Icon = tab.icon;
    return (
        <li className="flex-1">
            <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption"
            >
        <span
            className={cn(
                'relative flex h-7 w-14 items-center justify-center rounded-full',
                active ? 'bg-sun text-ink' : 'text-text-soft',
            )}
        >
          <Icon aria-hidden className="h-[22px] w-[22px]" />
            {badge ? (
                <span className="absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[11px] font-extrabold leading-none text-white">
              <span className="sr-only">{badge} overdue </span>
              <span aria-hidden>{badge > 9 ? '9+' : badge}</span>
            </span>
            ) : null}
        </span>
                <span className={active ? 'font-extrabold text-ink' : 'font-medium text-text-soft'}>{tab.label}</span>
            </Link>
        </li>
    );
}

const CREATE_ITEMS = [
    { label: 'New invoice', href: '/invoices/new', icon: Receipt },
    { label: 'New recurring schedule', href: '/recurring-invoices/new', icon: ArrowsClockwise },
    { label: 'New quotes', href: '/quotes/new', icon: Scroll },
    { label: 'Add client', href: '/clients/new', icon: UserPlus },
    { label: 'Add contact', href: '/clients/contacts/new', icon: AddressBook },
] as const;

export function BottomNav({ className = '' }: { className?: string }) {
    const pathname = usePathname();
    const overdue = useOverdueCount(pathname);
    const me = useMe();
    const [createOpen, setCreateOpen] = useState(false);
    const [meOpen, setMeOpen] = useState(false);

    // Close any open sheet when the route changes.
    useEffect(() => {
        setCreateOpen(false);
        setMeOpen(false);
    }, [pathname]);

    // Create flows and detail pages (/invoices/new, /invoices/123, ...) are full screen and own the bottom
    // of the screen, so the tab bar hides there. The list pages keep it.
    if (/^\/(invoices|quotes|receipts|clients|recurring-invoices)\/[^/]+/.test(pathname)) return null;

    return (
        <>
            <nav
                className={cn('fixed inset-x-0 bottom-0 z-30 border-t-brut border-ink bg-surface', className)}
                aria-label="Main navigation"
            >
                <ul className="safe-bottom mx-auto flex max-w-md items-start px-2 pt-2">
                    {LEFT.map((t) => (
                        <TabLink
                            key={t.href}
                            tab={t}
                            active={isOn(pathname, t.match)}
                            badge={t.href === '/invoices' ? overdue : undefined}
                        />
                    ))}

                    <li className="flex w-20 justify-center">
                        <button
                            type="button"
                            aria-label="Create"
                            aria-haspopup="dialog"
                            onClick={() => setCreateOpen(true)}
                            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-brut border-ink bg-mango text-on-mango shadow-brut-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                            <Plus aria-hidden className="h-7 w-7" />
                        </button>
                    </li>

                    {RIGHT.map((t) => (
                        <TabLink key={t.href} tab={t} active={isOn(pathname, t.match)} />
                    ))}

                    <li className="flex-1">
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => setMeOpen(true)}
                            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-caption"
                        >
              <span className="flex h-7 w-14 items-center justify-center rounded-full text-text-soft">
                <User aria-hidden className="h-[22px] w-[22px]" />
              </span>
                            <span className="font-medium text-text-soft">Me</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent title="Create">
                    <div className="space-y-1 p-4 pb-8">
                        <h2 className="px-2 pb-2 text-title">create</h2>
                        {CREATE_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setCreateOpen(false)}
                                    className="flex min-h-14 items-center gap-3 rounded-row px-2 text-body-l font-extrabold hover:bg-surface-tint"
                                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-btn border-brut-thin border-ink bg-sun">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={meOpen} onOpenChange={setMeOpen}>
                <SheetContent title="Account">
                    <div className="p-4 pb-8">
                        <MenuBody me={me} onNavigate={() => setMeOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
