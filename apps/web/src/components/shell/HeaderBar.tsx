import Link from 'next/link';

import { Wordmark } from '@/components/brand';
import { ClientOnly } from '@/components/mobile/ClientOnly';
import { UserMenu } from '@/components/navigation/UserMenu';
import { ThemeSwitcher } from '@/components/navigation/ThemeSwitcher';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { cn } from '@/lib/cn';

export function HeaderBar({
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

export function MobileHeader() {
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
