'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Quotes', href: '/quotes', icon: FileCheck },
  { label: 'Clients', href: '/clients', icon: Users },
] as const;

export function BottomNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-md ${className}`}
      aria-label="Main navigation"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 safe-bottom">
        <div className="flex items-center justify-between gap-1 rounded-2xl bg-neutral-100 p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />
                <span className={isActive ? 'font-semibold' : 'font-normal'}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
