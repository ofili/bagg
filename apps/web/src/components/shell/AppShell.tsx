
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { BottomNav } from '@/components/mobile/BottomNav';
import { ClientOnly } from '@/components/mobile/ClientOnly';
import { SessionGuard } from '@/components/navigation/SessionGuard';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { BreadcrumbProvider } from '@/components/navigation/BreadcrumbContext';

import { Sidebar } from './Sidebar';
import { HeaderBar, MobileHeader } from './HeaderBar';

const API_BASE = '/api';
const SIDEBAR_STORAGE_KEY = 'bagg-sidebar-collapsed';


export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true',
      );
    } catch {
      // Use the expanded state when browser storage is unavailable.
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          String(next),
        );
      } catch {
        // Keep the in-memory preference.
      }

      return next;
    });
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
    // <IconContext.Provider value={{ weight: 'bold' }}>
      <div className="flex min-h-dvh bg-cream">
        <SessionGuard />

        <Sidebar
          pathname={pathname}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <HeaderBar businessName={businessName} />
          <MobileHeader />

          <BreadcrumbProvider>
            <AppBreadcrumbs />

            <div className="min-h-0 w-full flex-1 pb-24 sm:pb-0">
              {children}
            </div>
          </BreadcrumbProvider>

          <ClientOnly>
            <BottomNav className="sm:hidden" />
          </ClientOnly>
        </main>
      </div>
  );
}
