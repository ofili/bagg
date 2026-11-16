import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SummaryRailProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * The money/action rail beside a document form. Square panel, 2px ink rule,
 * a body for totals and a separated action block.
 */
export function SummaryRail({
  title = 'Summary',
  description,
  children,
  actions,
  className,
}: SummaryRailProps) {
  return (
    <section
      aria-label={title}
      className={cn('border-brut border-ink bg-surface', className)}
    >
      <div className="border-b border-line-subtle px-4 py-3">
        <h2 className="text-heading font-extrabold text-text">{title}</h2>

        {description && (
          <p className="mt-0.5 text-caption text-text-muted">{description}</p>
        )}
      </div>

      <div className="space-y-3 p-4">{children}</div>

      {actions && (
        <div className="space-y-2 border-t border-line-subtle p-4">
          {actions}
        </div>
      )}
    </section>
  );
}
