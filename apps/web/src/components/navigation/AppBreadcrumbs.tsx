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
  contacts: 'Contacts',
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
  if (segments.length < 2 || !DETAIL_SECTIONS.has(section)) {
    return null;
  }

  // Handle /clients/contacts/... specially
  if (section === 'clients' && recordSegment === 'contacts') {
    // If just /clients/contacts, it's a top-level directory page, no breadcrumb needed
    if (segments.length === 2) {
      return null;
    }

    // /clients/contacts/new
    if (segments[2] === 'new') {
      return (
        <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-8 sm:pt-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
            <li className="flex min-w-0 items-center gap-1.5">
              <Link href="/clients" className="truncate underline-offset-4 hover:text-ink hover:underline">
                Clients
              </Link>
            </li>
            <li className="flex min-w-0 items-center gap-1.5">
              <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <Link href="/clients/contacts" className="truncate underline-offset-4 hover:text-ink hover:underline">
                Contacts
              </Link>
            </li>
            <li className="flex min-w-0 items-center gap-1.5">
              <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span aria-current="page" className="max-w-full truncate font-bold text-ink">
                Add contact
              </span>
            </li>
          </ol>
        </nav>
      );
    }

    // /clients/contacts/[contactId]/edit
    const leafLabel = currentLabel ? `Edit ${currentLabel}` : 'Edit contact';

    return (
      <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-8 sm:pt-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          <li className="flex min-w-0 items-center gap-1.5">
            <Link href="/clients" className="truncate underline-offset-4 hover:text-ink hover:underline">
              Clients
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <Link href="/clients/contacts" className="truncate underline-offset-4 hover:text-ink hover:underline">
              Contacts
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span aria-current="page" className="max-w-full truncate font-bold text-ink">
              {leafLabel}
            </span>
          </li>
        </ol>
      </nav>
    );
  }

  // Standard 2-segment record detail pages: /invoices/:id, /quotes/:id, /receipts/:id, /clients/:id
  if (recordSegment === 'new') {
    return null;
  }

  const rootLabel = fallbackLabel(section);
  const detailLabel = currentLabel || fallbackLabel(section.slice(0, -1));

  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-8 sm:pt-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        <li className="flex min-w-0 items-center gap-1.5">
          <Link href={`/${section}`} className="truncate underline-offset-4 hover:text-ink hover:underline">
            {rootLabel}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span aria-current="page" className="max-w-full truncate font-bold text-ink">
            {detailLabel}
          </span>
        </li>
      </ol>
    </nav>
  );
}
