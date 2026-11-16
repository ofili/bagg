'use client';

import Link from 'next/link';
import {
  CaretLeftIcon,
  CaretRightIcon,
  GearIcon,
  PlusIcon,
} from '@phosphor-icons/react/ssr';

import { BagMark, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SidebarNavigation } from './SidebarNavigation';

const SHOW_DEV_BADGE = process.env.NODE_ENV !== 'production';

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface SidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  pathname,
  collapsed,
  onToggle,
}: SidebarProps) {
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
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b-2',
          'border-solid border-ink',
          collapsed ? 'justify-center px-2' : 'justify-between px-5',
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            aria-expanded={false}
            aria-controls="app-sidebar"
            title="Expand sidebar"
            className={cn(
              'group relative flex h-10 w-10 shrink-0 items-center justify-center',
              'rounded-btn border-brut-thin border-ink',
              'bg-surface text-ink shadow-brut-sm',
              'transition-[transform,box-shadow,background-color] duration-100',
              'hover:bg-surface-tint hover:shadow-brut',
              'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            )}
          >
            {/* Default state: Bagg logo */}
            <span className="flex items-center justify-center transition-all duration-150 group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0">
              <BagMark size={28} />
            </span>

            {/* Hover / focus state: Expand icon */}
            <span className="absolute inset-0 flex items-center justify-center scale-75 opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
              <CaretRightIcon aria-hidden weight="bold" className="h-5 w-5 text-ink" />
            </span>
          </button>
        ) : (
          <>
            <Link
              href="/dashboard"
              aria-label="Bagg home"
              title="Bagg home"
              className="flex min-w-0 items-center"
            >
              <Wordmark />
            </Link>

            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              aria-controls="app-sidebar"
              title="Collapse sidebar"
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
              <CaretLeftIcon aria-hidden weight="bold" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

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
          <PlusIcon aria-hidden weight="bold" className="h-4 w-4 shrink-0" />

          {!collapsed && <span>New invoice</span>}
        </Link>
      </div>

      <SidebarNavigation
        pathname={pathname}
        collapsed={collapsed}
      />

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
            weight="bold"
            className="h-[18px] w-[18px] shrink-0"
          />

          {!collapsed && <span>Settings</span>}
        </Link>

        {SHOW_DEV_BADGE && !collapsed && (
          <div className="mt-3 flex justify-end">
            <span className="rounded-small border-brut-thin border-ink bg-sun px-2 py-0.5 text-caption font-extrabold text-on-sun">
              dev
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
