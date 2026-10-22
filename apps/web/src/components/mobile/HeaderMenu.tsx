'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const MENU_ITEMS = [
  { label: 'Settings', href: '/settings', icon: null },
  { label: 'Preview Client View', href: '/i/token_demo_sample_ngn', external: true },
];

export function HeaderMenu({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={`md:hidden ${className}`}>
      <Sheet>
        <SheetTrigger asChild>
          <button className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition">
            <MoreHorizontal className="w-5 h-5" />
            <span className="sr-only">More options</span>
          </button>
        </SheetTrigger>
        <SheetContent
          className="rounded-2xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-900">More</span>
          </div>
          <div className="px-4 py-2 space-y-1">
            {MENU_ITEMS.map((item, i) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Comp = item.external ? 'a' : Link;
              return (
                <Comp
                  key={i}
                  {...(item.external
                    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                    : { href: item.href })}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                  {item.external && (
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  )}
                </Comp>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
