import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StaticFieldProps {
  label: string;
  value: ReactNode;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * A read-only value that should not look editable. Use it for relationships
 * and account identifiers instead of a disabled input.
 */
export function StaticField({
  label,
  value,
  hint,
  action,
  icon,
  className,
}: StaticFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <span className="mb-1.5 block text-label font-medium text-text">
        {label}
      </span>

      <div className="flex min-h-11 items-center justify-between gap-3 rounded-input border-brut-thin border-ink bg-surface-sunken px-3">
        <span className="flex min-w-0 items-center gap-2 text-body-l text-text">
          {icon && (
            <span className="shrink-0 text-text-muted" aria-hidden="true">
              {icon}
            </span>
          )}

          <span className="truncate">{value}</span>
        </span>

        {action && <span className="shrink-0">{action}</span>}
      </div>

      {hint && <p className="mt-1.5 text-caption text-text-muted">{hint}</p>}
    </div>
  );
}
