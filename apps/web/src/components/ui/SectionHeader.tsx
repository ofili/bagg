
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-heading font-extrabold text-ink">
          {title}
        </h2>

        {description && (
          <p className="text-body text-text-muted">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
