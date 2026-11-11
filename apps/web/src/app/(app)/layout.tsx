
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconContext, Plus, Gear } from '@phosphor-icons/react';

import { Wordmark } from '@/components/brand';
import { BottomNav } from '@/components/mobile/BottomNav';
import { ClientOnly } from '@/components/mobile/ClientOnly';
import { NAV_ITEMS } from '@/components/mobile/navItems';
import { UserMenu } from '@/components/navigation/UserMenu';
import { SessionGuard } from '@/components/navigation/SessionGuard';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import {
  BreadcrumbProvider} from '@/components/navigation/BreadcrumbContext';
import { ThemeSwitcher } from '@/components/navigation/ThemeSwitcher';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';
const SHOW_DEV_BADGE = process.env.NODE_ENV !== 'production';

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex-1 px-3 lg:px-4"
    >
      <ul className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-3',
                  'rounded-btn border-brut-thin px-3 text-body',
                  'lg:justify-start',
                  active
                    ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
                    : 'border-transparent font-medium text-text hover:bg-surface-tint',
                )}
              >
                <Icon
                  aria-hidden
                  className="h-[18px] w-[18px] shrink-0"
                />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Sidebar({
  pathname,
}: {
  pathname: string;
}) {
  const settingsActive = isRouteActive(pathname, '/settings');

  return (
    <aside
      aria-label="Application sidebar"
      className={cn(
        'hidden w-[72px] shrink-0 flex-col',
        'border-r-brut border-ink bg-surface',
        'sm:flex lg:w-64',
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center justify-center',
          'border-b-brut border-ink px-3',
          'lg:justify-between lg:px-5',
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Bagg home"
          className="flex min-w-0 items-center"
        >
          <Wordmark />
        </Link>

        {SHOW_DEV_BADGE && (
          <span className="hidden rounded-small border border-ink bg-sun px-2 py-0.5 text-caption font-extrabold text-[#4A3200] lg:inline">
            dev
          </span>
        )}
      </div>

      <SessionGuard />

      <div className="p-3 lg:p-4">
        <Link
          href="/invoices/new"
          aria-label="New invoice"
          title="New invoice"
          className={cn(
            buttonStyles({ variant: 'accent', fullWidth: true }),
            'px-0 lg:px-5',
          )}
        >
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">New invoice</span>
        </Link>
      </div>

      <SidebarNavigation pathname={pathname} />

      <div className="mx-3 mb-3 mt-3 border-t-brut border-ink pt-3 lg:mx-4">
        <Link
          href="/settings"
          aria-current={settingsActive ? 'page' : undefined}
          aria-label="Settings"
          title="Settings"
          className={cn(
            'flex min-h-11 items-center justify-center gap-3',
            'rounded-btn border-brut-thin px-3 text-body',
            'lg:justify-start',
            settingsActive
              ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
              : 'border-transparent font-medium text-text hover:bg-surface-tint',
          )}
        >
          <Gear
            aria-hidden
            className="h-[18px] w-[18px] shrink-0"
          />
          <span className="hidden lg:inline">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

function DesktopHeader({
  businessName,
}: {
  businessName: string;
}) {
  return (
    <header
      className={cn(
        'hidden h-16 shrink-0 items-center justify-between',
        'border-b-brut border-ink bg-surface px-8 sm:flex',
      )}
    >
      <p
        className="truncate text-sm font-extrabold text-ink"
        title={businessName || undefined}
      >
        {businessName || 'Your business'}
      </p>

      <div className="flex items-center gap-3">
        <ClientOnly>
          <ThemeSwitcher />
          <NotificationCenter />
          <UserMenu />
        </ClientOnly>
      </div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between',
        'border-b-brut border-ink bg-surface px-4 sm:hidden',
      )}
    >
      <Link href="/dashboard" aria-label="Bagg home">
        <Wordmark />
      </Link>

      <div className="flex items-center gap-2">
        <ClientOnly>
          <ThemeSwitcher />
          <NotificationCenter />
          <UserMenu />
        </ClientOnly>
      </div>
    </header>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
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
        // A network failure is not proof of an expired session.
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const response = await fetch(
          `${API_BASE}/workspaces/current`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Could not load workspace');
        }

        const workspace = await response.json();

        if (!cancelled) {
          setBusinessName(
            workspace.business_name?.trim() || '',
          );
        }
      } catch {
        // Keep the application shell usable if this request fails.
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <IconContext.Provider value={{ weight: 'bold' }}>
      <div className="flex min-h-dvh bg-cream">
        <Sidebar pathname={pathname} />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <DesktopHeader businessName={businessName} />
          <MobileHeader />

          <BreadcrumbProvider>
            <AppBreadcrumbs />

            {/*
              Page-container contract:
              - Individual pages own horizontal and vertical content spacing.
              - The shell owns only bottom-nav clearance on mobile.
              - Detail/create routes may suppress the bottom navigation.
            */}
            <div className="min-h-0 w-full flex-1 pb-24 sm:pb-0">
              {children}
            </div>
          </BreadcrumbProvider>

          <ClientOnly>
            <BottomNav className="sm:hidden" />
          </ClientOnly>
        </main>
      </div>
    </IconContext.Provider>
  );
}