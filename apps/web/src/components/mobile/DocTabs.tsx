'use client';

/*
 * Phone-only switcher for the three document lists, since the tab bar has one
 * "Invoices" tab for all of them. Put <DocTabs /> directly under the page
 * header on invoices/NewQuoteDesktop.tsx, quotes/NewQuoteDesktop.tsx and receipts/NewQuoteDesktop.tsx.
 * Tablet and desktop keep the sidebar, so it hides from the sm breakpoint up.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const TABS = [
    { label: 'Invoices', href: '/invoices' },
    { label: 'Quotes', href: '/quotes' },
    { label: 'Receipts', href: '/receipts' },
] as const;

export function DocTabs({ className = '' }: { className?: string }) {
    const pathname = usePathname();
    return (
        <nav aria-label="Documents" className={cn('flex gap-2 sm:hidden', className)}>
            {TABS.map((t) => {
                const active = pathname === t.href || pathname.startsWith(t.href + '/');
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 flex-1 items-center justify-center rounded-full border-brut-thin border-ink text-body',
                            active ? 'bg-sun font-extrabold text-ink' : 'bg-surface font-medium text-text-soft',
                        )}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </nav>
    );
}
