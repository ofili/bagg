'use client';

import Link from 'next/link';
import {
  ArrowsClockwise,
  Receipt,
  Scroll,
  UserPlus,
} from '@phosphor-icons/react';
import { SectionHeader, buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';

const QUICK_ACTIONS = [
  { label: 'New invoice', href: '/invoices/new', icon: Receipt },
  { label: 'New quote', href: '/quotes/new', icon: Scroll },
  { label: 'Add client', href: '/clients/new', icon: UserPlus },
  { label: 'New schedule', href: '/recurring-invoices/new', icon: ArrowsClockwise },
] as const;

export function QuickActions({ className }: { className?: string }) {
  return (
    <section
      aria-label="Quick actions"
      className={cn(
        'hidden border-brut border-ink bg-surface p-4 sm:block sm:p-5',
        className,
      )}
    >
      <SectionHeader
        title="Quick actions"
        description="Start the things you do most."
      />

      <nav
        aria-label="Quick actions"
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                buttonStyles({ variant: 'outline', zone: 'calm' }),
                'min-h-12 justify-center gap-2 px-2 text-body font-bold',
              )}
            >
              <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
              {action.label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
