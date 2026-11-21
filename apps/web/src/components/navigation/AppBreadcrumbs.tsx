'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { useCurrentBreadcrumb } from './BreadcrumbContext';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

const ROOT_LABELS: Record<string, string> = {
  dashboard: 'Home',
  invoices: 'Invoices',
  quotes: 'Quotes',
  receipts: 'Receipts',
  clients: 'Clients',
  'recurring-invoices': 'Recurring invoices',
  settings: 'Settings',
  profile: 'Profile',
  'control-plane': 'Control plane',
};

const DETAIL_FALLBACKS: Record<string, string> = {
  invoices: 'Invoice details',
  quotes: 'Quote details',
  receipts: 'Receipt details',
  clients: 'Client details',
  'recurring-invoices': 'Schedule details',
};

const CREATE_LABELS: Record<string, string> = {
  invoices: 'New invoice',
  quotes: 'New quote',
  clients: 'New client',
  'recurring-invoices': 'New recurring schedule',
};

const NESTED_LABELS: Record<string, string> = {
  contacts: 'Contacts',
  payments: 'Payment settings',
  business: 'Business settings',
  billing: 'Billing',
  security: 'Security',
  analytics: 'Analytics',
};

function fallbackLabel(segment: string): string {
  return (
    NESTED_LABELS[segment] ??
    segment
      .split('-')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(' ')
  );
}

function buildBreadcrumbs(
  pathname: string,
  currentLabel: string | null,
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'dashboard') {
    return [];
  }

  const [root, ...rest] = segments;
  const rootLabel = ROOT_LABELS[root] ?? fallbackLabel(root);

  const items: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/dashboard',
    },
    {
      label: rootLabel,
      href: rest.length > 0 ? `/${root}` : undefined,
    },
  ];

  if (rest.length === 0) {
    return items;
  }

  /*
   * Contact routes:
   *
   * /clients/contacts
   * /clients/contacts/new
   * /clients/contacts/:contactId/edit
   */
  if (root === 'clients' && rest[0] === 'contacts') {
    const remaining = rest.slice(1);

    items.push({
      label: 'Contacts',
      href: remaining.length > 0
        ? '/clients/contacts'
        : undefined,
    });

    if (remaining.length === 0) {
      return items;
    }

    if (remaining[0] === 'new') {
      items.push({
        label: 'Add contact',
      });

      return items;
    }

    if (remaining[1] === 'edit') {
      items.push({
        label: currentLabel
          ? `Edit ${currentLabel}`
          : 'Edit contact',
      });

      return items;
    }

    items.push({
      label: 'Contact details',
    });

    return items;
  }

  /*
   * Create routes:
   *
   * /invoices/new
   * /quotes/new
   * /clients/new
   * /recurring-invoices/new
   */
  if (rest[0] === 'new') {
    items.push({
      label: CREATE_LABELS[root] ?? `New ${rootLabel.toLowerCase()}`,
    });

    return items;
  }

  /*
   * Nested settings and control-plane routes.
   */
  if (root === 'settings' || root === 'control-plane') {
    items.push({
      label: fallbackLabel(rest[0]),
      href: rest.length > 1 ? `/${root}/${rest[0]}` : undefined,
    });

    for (const segment of rest.slice(1)) {
      items.push({
        label: fallbackLabel(segment),
      });
    }

    return items;
  }

  /*
   * Standard record detail routes.
   *
   * The current label comes from the detail page through
   * BreadcrumbContext. It must be a document number or
   * meaningful record name, never a database ID.
   */
  items.push({
    label:
      currentLabel ||
      DETAIL_FALLBACKS[root] ||
      'Details',
  });

  return items;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const { currentLabel } = useCurrentBreadcrumb();

  const items = buildBreadcrumbs(pathname, currentLabel);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="px-4 pt-4 sm:px-8 sm:pt-5"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-caption text-text-muted">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0"
                />
              )}

              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="truncate underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className={
                    isCurrent
                      ? 'max-w-full truncate font-bold text-ink'
                      : 'truncate'
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}