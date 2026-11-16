import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StickyFormActionsProps {
  children: ReactNode;
  /** page sits on the page background; panel sits inside a FormSection. */
  tone?: 'page' | 'panel';
  className?: string;
}

/**
 * Keeps the primary action reachable on long forms without covering content.
 * Put a FormActions inside it.
 */
export function StickyFormActions({
  children,
  tone = 'page',
  className,
}: StickyFormActionsProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 border-t border-line-subtle py-3 backdrop-blur',
        tone === 'page' ? 'bg-cream/95' : 'bg-surface/95',
        className,
      )}
    >
      {children}
    </div>
  );
}
