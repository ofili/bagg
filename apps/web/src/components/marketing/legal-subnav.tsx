
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

const legalLinks = [
    { label: 'Terms', href: '/legal/terms', number: '01' },
    { label: 'Privacy', href: '/legal/privacy', number: '02' },
    { label: 'Cookies', href: '/legal/cookies', number: '03' },
];

export function LegalSubnav() {
    const pathname = usePathname();

    return (
        <nav aria-label="Legal documents" className="space-y-2">
            {legalLinks.map((link) => {
                const active = pathname === link.href;

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={[
                            'group flex min-h-12 items-center justify-between gap-3 border-brut px-3 py-2 transition-colors',
                            active
                                ? 'border-ink bg-sun text-on-sun shadow-brut'
                                : 'border-transparent bg-surface text-text-soft hover:border-ink hover:bg-peach',
                        ].join(' ')}
                    >
            <span className="flex items-center gap-3">
              <span className="text-caption font-bold tabular-nums opacity-60">
                {link.number}
              </span>
              <span className="text-body font-extrabold">{link.label}</span>
            </span>

                        <ArrowUpRight
                            className={[
                                'h-4 w-4 transition-transform',
                                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                            ].join(' ')}
                            aria-hidden="true"
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
