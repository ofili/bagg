
import Link from 'next/link';

const audiencePages = [
    { href: '/creatives', label: 'All creatives' },
    { href: '/freelancers', label: 'Freelancers' },
    { href: '/consultants', label: 'Consultants' },
    { href: '/studios', label: 'Creative studios' },
] as const;

type AudiencePath = (typeof audiencePages)[number]['href'];

export function AudienceSubnav({
                                   currentPath,
                               }: {
    currentPath: AudiencePath;
}) {
    return (
        <nav aria-label="Audience pages" className="border-y-2 border-ink bg-cream">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {audiencePages.map((page) => {
                        const active = page.href === currentPath;

                        return (
                            <Link
                                key={page.href}
                                href={page.href}
                                aria-current={active ? 'page' : undefined}
                                className={[
                                    'inline-flex min-h-10 shrink-0 items-center border-2 border-ink px-4',
                                    'text-label font-extrabold transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2',
                                    'focus-visible:ring-ink focus-visible:ring-offset-2',
                                    active
                                        ? 'bg-mango text-ink shadow-brut'
                                        : 'bg-surface text-text-soft hover:bg-surface-tint',
                                ].join(' ')}
                            >
                                {page.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
