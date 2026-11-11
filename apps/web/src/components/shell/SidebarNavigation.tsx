
import Link from 'next/link';
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
      </ul>
    </nav>
  );
}
