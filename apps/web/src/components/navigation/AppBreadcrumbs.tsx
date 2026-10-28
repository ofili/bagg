
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useCurrentBreadcrumb } from './BreadcrumbContext';

const LABELS: Record<string, string> = {
  invoices: 'Invoices',
  quotes: 'Quotes',
  receipts: 'Receipts',
  clients: 'Clients',
  settings: 'Settings',
  profile: 'Profile',
  business: 'Business',
  billing: 'Billing',
  payments: 'Payments',
  security: 'Security',
};

const DETAIL_SECTIONS = new Set([
  'invoices',
  'quotes',
  'receipts',
  'clients',
]);

function fallbackLabel(segment: string) {
  return (
    LABELS[segment] ??
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const { currentLabel } = useCurrentBreadcrumb();

  const segments = pathname.split('/').filter(Boolean);
  const section = segments[0];
  const recordSegment = segments[1];

  // Breadcrumbs are only needed on record detail pages and their subpages.
  if (
    segments.length < 2 ||
    !DETAIL_SECTIONS.has(section) ||
    recordSegment === 'new'
  ) {
    return null;
  }

  const items = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isCurrent = index === segments.length - 1;
    const parent = segments[index - 1];

    let label: string;

    if (index === 0) {
      label = fallbackLabel(segment);
    } else if (index === 1) {
      // Never display the internal ID from the URL.
      label = isCurrent
        ? currentLabel || fallbackLabel(section.slice(0, -1))
        : fallbackLabel(section);
    } else if (isCurrent && currentLabel) {
      label = currentLabel;
    } else if (parent === 'invoices') {
      label = 'Invoice';
    } else if (parent === 'quotes') {
      label = 'Quote';
    } else if (parent === 'receipts') {
      label = 'Receipt';
    } else if (parent === 'clients') {
      label = 'Client';
    } else {
      label = fallbackLabel(segment);
    }

    return { href, label, isCurrent };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="px-4 pt-4 sm:px-8 sm:pt-5"
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        {items.map((item, index) => (
          <li
            key={item.href}
            className="flex min-w-0 items-center gap-1.5"
          >
            {index > 0 && (
              <ChevronRight
                aria-hidden
                className="h-3.5 w-3.5 shrink-0"
              />
            )}

            {item.isCurrent ? (
              <span
                aria-current="page"
                className="max-w-full truncate font-bold text-ink"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="truncate underline-offset-4 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
