'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, MoreHorizontal, Settings } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  { label: 'Settings', href: '/settings', external: false },
  { label: 'Preview client view', href: '/i/token_demo_sample_ngn', external: true },
] as const;

export function HeaderMenu({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={className}>
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex h-11 w-11 items-center justify-center rounded-btn border-brut-thin border-ink bg-surface text-text">
            <MoreHorizontal aria-hidden className="h-5 w-5" />
            <span className="sr-only">More options</span>
          </button>
        </SheetTrigger>
        <SheetContent title="More">
          <div className="space-y-1 p-4">
            <h2 className="px-2 pb-2 text-title">more</h2>
            {MENU_ITEMS.map((item) => {
              const isActive = !item.external && (pathname === item.href || pathname.startsWith(item.href + '/'));
              const itemClass = cn(
                'flex min-h-11 items-center gap-3 rounded-row px-3 text-body-l',
                isActive ? 'bg-peach font-extrabold' : 'font-medium hover:bg-surface-tint',
              );
              return (
                <SheetClose asChild key={item.href}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={itemClass}>
                      {item.label}
                      <ExternalLink aria-hidden className="ml-auto h-4 w-4 text-text-muted" />
                    </a>
                  ) : (
                    <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={itemClass}>
                      <Settings aria-hidden className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )}
                </SheetClose>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
