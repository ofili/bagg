'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './navItems';

export function BottomNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn('fixed inset-x-0 bottom-0 z-30 border-t-brut border-ink bg-surface', className)}
      aria-label="Main navigation"
    >
      <ul className="safe-bottom mx-auto flex max-w-md items-stretch justify-between gap-1 px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-btn border-brut-thin px-2 text-caption',
                  isActive
                    ? 'border-ink bg-mango font-extrabold text-on-mango'
                    : 'border-transparent font-medium text-text-soft',
                )}
              >
                <Icon aria-hidden className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
