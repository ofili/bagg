'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { marketingNav } from '@/content/marketing';
import { cn } from '@/lib/cn';

export function MarketingHeader() {
    const pathname = usePathname() ?? '/';
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

    const navLinkClass = (href: string) =>
        cn(
            'inline-flex min-h-11 items-center rounded-full px-3 text-label font-bold transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            isActive(href)
                ? 'bg-peach-chip text-ink'
                : 'text-text-soft hover:bg-surface-tint hover:text-ink',
        );

    return (
        <header className="sticky top-0 z-40 border-b border-line-subtle bg-cream/95 backdrop-blur">
            <Container>
                <div className="flex h-16 items-center justify-between gap-4">
                    <Link
                        href="/"
                        aria-label="Bagg home"
                        className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                        onClick={() => setOpen(false)}
                    >
                        <Wordmark />
                    </Link>

                    <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
                        {marketingNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                className={navLinkClass(item.href)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/login"
                            className="hidden min-h-11 items-center rounded-full px-3 text-label font-bold text-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:inline-flex"
                        >
                            Log in
                        </Link>

                        <Link href="/signup" className={`${buttonStyles()} hidden sm:inline-flex`}>
                            Start free
                        </Link>

                        <button
                            type="button"
                            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
                            aria-expanded={open}
                            aria-controls="mobile-menu"
                            onClick={() => setOpen((value) => !value)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden"
                        >
                            {open ? (
                                <X className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Menu className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </Container>

            {open && (
                <div
                    id="mobile-menu"
                    className="absolute inset-x-0 top-full border-b border-line-subtle bg-cream px-4 pb-5 pt-2 shadow-menu lg:hidden"
                >
                    <nav aria-label="Mobile navigation" className="mx-auto flex max-w-[75rem] flex-col gap-1">
                        {marketingNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    'flex min-h-12 items-center rounded-row px-3 text-body font-bold',
                                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                                    isActive(item.href)
                                        ? 'bg-peach-chip text-ink'
                                        : 'text-text-soft hover:bg-surface-tint hover:text-ink',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="mt-3 grid gap-2 border-t border-line-subtle pt-3">
                            <Link
                                href="/login"
                                onClick={() => setOpen(false)}
                                className={`${buttonStyles({ variant: 'outline' })} w-full`}
                            >
                                Log in
                            </Link>
                            <Link
                                href="/signup"
                                onClick={() => setOpen(false)}
                                className={`${buttonStyles()} w-full`}
                            >
                                Start free
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
