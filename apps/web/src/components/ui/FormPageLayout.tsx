import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormPageLayoutProps {
  children: ReactNode;
  /** Sticky summary/actions rail on desktop. */
  aside: ReactNode;
  className?: string;
}

/**
 * Two-column document-builder shell: the form column on the left, a sticky
 * summary rail on the right. Collapses to one column below lg.
 */
export function FormPageLayout({
  children,
  aside,
  className,
}: FormPageLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start',
        className,
      )}
    >
      <div className="min-w-0 space-y-5">{children}</div>

      <aside className="space-y-4 lg:sticky lg:top-6">{aside}</aside>
    </div>
  );
}
