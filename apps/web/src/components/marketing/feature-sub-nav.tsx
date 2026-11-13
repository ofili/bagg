
import Link from 'next/link';

const featurePages = [
    { href: '/features', label: 'Overview' },
    { href: '/features/invoicing', label: 'Invoicing' },
    { href: '/features/quotes', label: 'Quotes' },
    { href: '/features/payments', label: 'Payments' },
    { href: '/features/receipts', label: 'Receipts' },
] as const;

type FeatureSubnavProps = {
    currentPath: (typeof featurePages)[number]['href'];
};

export function FeatureSubnav({ currentPath }: FeatureSubnavProps) {
    return (
        <nav
            aria-label="Feature pages"
            className="border-y-2 border-ink bg-cream"
        >
            <div className="mx-auto max-w-[75rem] px-4 py-3 sm:px-6 lg:px-8">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {featurePages.map((page) => {
                        const isActive = page.href === currentPath;

                        return (
                            <Link
                                key={page.href}
                                href={page.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={[
                                    'inline-flex min-h-11 shrink-0 items-center justify-center',
                                    'rounded-full border-brut border-ink px-4',
                                    'text-label font-extrabold transition-[background-color,box-shadow,transform]',
                                    'focus-visible:outline-none focus-visible:ring-2',
                                    'focus-visible:ring-ink focus-visible:ring-offset-2',
                                    isActive
                                        ? 'bg-mango text-on-mango shadow-brut'
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

type FeaturePageLinkProps = {
    href: string;
    eyebrow: string;
    title: string;
    copy: string;
    linkLabel: string;
};

export function FeaturePageLink({
                                    href,
                                    eyebrow,
                                    title,
                                    copy,
                                    linkLabel,
                                }: FeaturePageLinkProps) {
    return (
        <div className="mx-auto max-w-[75rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <Link
                href={href}
                className={[
                    'group grid gap-4 border-brut border-ink bg-mango p-6',
                    'shadow-brut transition-transform hover:-translate-y-1',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-ink focus-visible:ring-offset-4',
                    'sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-8',
                ].join(' ')}
            >
                <div>
                    <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                        {eyebrow}
                    </p>
                    <h2 className="mt-2 text-title-l text-on-mango">{title}</h2>
                    <p className="mt-2 max-w-2xl text-body-l text-on-mango">
                        {copy}
                    </p>
                </div>

                <span className="inline-flex min-h-11 items-center justify-center rounded-btn border-brut border-ink bg-surface px-5 text-label font-extrabold text-ink transition-colors group-hover:bg-surface-tint">
          {linkLabel} <span aria-hidden="true" className="ml-2">→</span>
        </span>
            </Link>
        </div>
    );
}
