
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  metadata?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  metadata,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4',
        'sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
            {eyebrow}
          </p>
        )}

        <h1 className="text-title-l font-extrabold tracking-tight text-ink">
          {title}
        </h1>

        {description && (
          <p className="max-w-2xl text-body text-text-soft">
            {description}
          </p>
        )}

        {metadata && (
          <div className="pt-1">
            {metadata}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
