
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IconContext,
  PlusIcon,
  GearIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';

import { BagMark, Wordmark } from '@/components/brand';
import { BottomNav } from '@/components/mobile/BottomNav';
import { ClientOnly } from '@/components/mobile/ClientOnly';
import { NAV_ITEMS } from '@/components/mobile/navItems';
import { UserMenu } from '@/components/navigation/UserMenu';
import { SessionGuard } from '@/components/navigation/SessionGuard';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { BreadcrumbProvider } from '@/components/navigation/BreadcrumbContext';
import { ThemeSwitcher } from '@/components/navigation/ThemeSwitcher';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';
const SHOW_DEV_BADGE = process.env.NODE_ENV !== 'production';
const SIDEBAR_STORAGE_KEY = 'bagg-sidebar-collapsed';

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavigation({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="min-h-0 flex-1 px-3 lg:px-4"
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
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3',
                  'rounded-btn border-brut-thin px-3 text-body',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
                    : 'border-transparent font-medium text-text hover:bg-surface-tint',
                )}
              >
                <Icon
                  aria-hidden
                  className="h-[18px] w-[18px] shrink-0"
                />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
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
  collapsed,
  onToggle,
}: {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const settingsActive = isRouteActive(pathname, '/settings');

  return (
    <aside
      id="app-sidebar"
      aria-label="Application sidebar"
      className={cn(
        'hidden shrink-0 flex-col sm:flex',
        'border-r-2 border-solid border-ink bg-surface',
        'transition-[width] duration-150 ease-out',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Sidebar brand and collapse control */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b-2',
          'border-solid border-ink',
          collapsed
            ? 'justify-between px-2'
            : 'justify-between px-5',
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Bagg home"
          title="Bagg home"
          className="flex min-w-0 items-center"
        >
          {collapsed ? (
            <BagMark size={32} />
          ) : (
            <Wordmark />
          )}
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center',
            'rounded-btn border-brut-thin border-ink',
            'bg-surface text-ink shadow-brut-sm',
            'transition-[transform,box-shadow] duration-75',
            'hover:bg-surface-tint',
            'active:translate-x-[2px] active:translate-y-[2px]',
            'active:shadow-none',
          )}
        >
          {collapsed ? (
            <CaretRightIcon aria-hidden className="h-4 w-4" />
          ) : (
            <CaretLeftIcon aria-hidden className="h-4 w-4" />
          )}
        </button>
      </div>

      <SessionGuard />

      {/* New invoice */}
      <div className="p-3 lg:p-4">
        <Link
          href="/invoices/new"
          aria-label="New invoice"
          title={collapsed ? 'New invoice' : undefined}
          className={cn(
            buttonStyles({ variant: 'accent', fullWidth: true }),
            collapsed && 'gap-0 px-0',
          )}
        >
          <PlusIcon aria-hidden className="h-4 w-4 shrink-0" />

          {!collapsed && (
            <span>New invoice</span>
          )}
        </Link>
      </div>

      <SidebarNavigation
        pathname={pathname}
        collapsed={collapsed}
      />

      {/* Settings */}
      <div
        className={cn(
          'mx-3 mb-3 mt-3 border-t-brut border-ink pt-3',
          !collapsed && 'lg:mx-4',
        )}
      >
        <Link
          href="/settings"
          aria-current={settingsActive ? 'page' : undefined}
          aria-label="Settings"
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex min-h-11 items-center gap-3',
            'rounded-btn border-brut-thin px-3 text-body',
            collapsed && 'justify-center px-0',
            settingsActive
              ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
              : 'border-transparent font-medium text-text hover:bg-surface-tint',
          )}
        >
          <GearIcon
            aria-hidden
            className="h-[18px] w-[18px] shrink-0"
          />

          {!collapsed && (
            <span>Settings</span>
          )}
        </Link>

        {SHOW_DEV_BADGE && !collapsed && (
          <div className="mt-3 flex justify-end">
            <span className="rounded-small border border-ink bg-sun px-2 py-0.5 text-caption font-extrabold text-on-sun">
              dev
            </span>
          </div>
        )}
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
        'border-b-2 border-solid border-ink bg-surface px-8 sm:flex',
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore the user's sidebar preference.
  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true',
      );
    } catch {
      // Continue with the expanded sidebar if storage is unavailable.
    }
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;

    setSidebarCollapsed(next);

    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(next),
      );
    } catch {
      // The sidebar remains usable if persistence is unavailable.
    }
  }

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
        <Sidebar
          pathname={pathname}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

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
