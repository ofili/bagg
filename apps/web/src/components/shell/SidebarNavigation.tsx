
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/lib/cn';
import { NAV_ITEMS } from '@/components/mobile/navItems';

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavigation({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  const [isControlPlaneAdmin, setIsControlPlaneAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkControlPlaneAccess() {
      try {
        const response = await fetch('/api/control-plane/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!cancelled) {
          setIsControlPlaneAdmin(response.ok);
        }
      } catch {
        if (!cancelled) {
          setIsControlPlaneAdmin(false);
        }
      }
    }

    void checkControlPlaneAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className="min-h-0 flex-1 overflow-y-auto px-3 lg:px-4"
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

        {isControlPlaneAdmin && (
          <li>
            <Link
              href="/control-plane/analytics"
              aria-current={
                isRouteActive(pathname, '/control-plane')
                  ? 'page'
                  : undefined
              }
              aria-label="Control plane"
              title={collapsed ? 'Control plane' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3',
                'rounded-btn border-brut-thin px-3 text-body',
                collapsed && 'justify-center px-0',
                isRouteActive(pathname, '/control-plane')
                  ? 'border-ink bg-mango font-extrabold text-on-mango shadow-brut-sm'
                  : 'border-transparent font-medium text-text hover:bg-surface-tint',
              )}
            >
              <ShieldCheckIcon
                aria-hidden
                weight="bold"
                className="h-[18px] w-[18px] shrink-0"
              />

              {!collapsed && (
                <span className="truncate">Control plane</span>
              )}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
