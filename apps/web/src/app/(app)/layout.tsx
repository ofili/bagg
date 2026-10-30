'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Plus, Settings } from 'lucide-react';
import { BagCharacter, Wordmark } from '@/components/brand';
import { BottomNav } from '@/components/mobile/BottomNav';
import { ClientOnly } from '@/components/mobile/ClientOnly';
import { HeaderMenu } from '@/components/mobile/HeaderMenu';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NAV_ITEMS } from '@/components/mobile/navItems';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

import { BreadcrumbProvider } from '@/components/navigation/BreadcrumbContext';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';

const SHOW_DEV_BADGE = process.env.NODE_ENV !== 'production';

const API_BASE = '/api';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const apiBase =
          '/api';

        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401 && !cancelled) {
          const returnTo = pathname.startsWith('/')
            ? pathname
            : '/dashboard';

          router.replace(
            `/login?next=${encodeURIComponent(returnTo)}`,
          );
        }
      } catch {
        // Network failures are not authentication failures.
        // Do not redirect to login merely because the API is unreachable.
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/workspaces/current`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load workspace');
        return res.json();
      })
      .then((workspace) => {
        if (!cancelled) {
          setBusinessName(workspace.business_name?.trim() || '');
        }
      })
      .catch(() => {
        // Leave the layout usable if workspace data cannot be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh bg-cream">
      {/* Tablet: icon rail. Desktop: labelled sidebar. Phone: bottom tab bar (below). */}
      <aside className="hidden w-[72px] shrink-0 flex-col border-r-brut border-ink bg-surface sm:flex lg:w-64">
        <div className="flex h-16 items-center justify-center border-b-brut border-ink px-3 lg:justify-between lg:px-5">
          <Link href="/dashboard" aria-label="bagg home" className="flex items-center">
            <BagCharacter size={32} className="lg:hidden" decorative />
            <Wordmark className="hidden lg:inline-flex" />
          </Link>
          {SHOW_DEV_BADGE && (
            <span className="hidden rounded-small border border-ink bg-sun px-2 py-0.5 text-caption font-extrabold text-[#4A3200] lg:inline">
              dev
            </span>
          )}
        </div>

        <div className="p-3 lg:p-4">
          <Link
            href="/invoices/new"
            aria-label="New invoice"
            className={cn(buttonStyles({ variant: 'accent', fullWidth: true }), 'px-0 lg:px-5')}
          >
            <Plus aria-hidden className="h-4 w-4" />
            <span className="hidden lg:inline">New invoice</span>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-3 lg:px-4">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    className={cn(
                      'flex min-h-11 items-center justify-center gap-3 rounded-btn border-brut-thin px-3 text-body lg:justify-start',
                      isActive
                        ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
                        : 'border-transparent font-medium text-text hover:bg-surface-tint',
                    )}
                  >
                    <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mx-3 mb-3 mt-3 border-t-brut border-ink pt-3 lg:mx-4">
        <Link
          href="/settings"
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          aria-label="Settings"
          title="Settings"
          className={cn(
            'flex min-h-11 items-center justify-center gap-3 rounded-btn border-brut-thin px-3 text-body lg:justify-start',
            pathname.startsWith('/settings')
              ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
              : 'border-transparent font-medium text-text hover:bg-surface-tint',
          )}
        >
          <Settings aria-hidden className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:inline">Settings</span>
        </Link>
      </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Tablet and desktop header. Settings opens from the avatar. */}
        <header className="hidden h-16 shrink-0 items-center justify-between border-b-brut border-ink bg-surface px-8 sm:flex">
          <p
            className="truncate text-sm font-extrabold text-ink"
            title={businessName || undefined}
          >
            {businessName || 'Your business'}
          </p>

          <ClientOnly>
            <NotificationCenter />
          </ClientOnly>
        </header>

        {/* Phone header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b-brut border-ink bg-surface px-4 sm:hidden">
          <Link href="/dashboard" aria-label="bagg home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ClientOnly>
              <NotificationCenter />
              <HeaderMenu />
            </ClientOnly>
          </div>
        </header>

        {/* Pages own their padding. The bottom padding keeps content clear of the fixed tab bar on phones. */}
        <BreadcrumbProvider>
          <AppBreadcrumbs />

          {/* Pages own their padding. The bottom padding keeps content clear of the fixed tab bar on phones. */}
          <div className="w-full pb-24 sm:pb-0">{children}</div>
        </BreadcrumbProvider>

        <ClientOnly>
          <BottomNav className="sm:hidden" />
        </ClientOnly>
      </main>
    </div>
  );
}
