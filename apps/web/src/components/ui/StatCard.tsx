
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  trend?: {
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
  zone?: 'expressive' | 'calm';
}

const TREND_STYLES = {
  up: 'text-status-paid-fg',
  down: 'text-danger',
  neutral: 'text-text-muted',
};

export function StatCard({
  label,
  value,
  description,
  icon,
  trend,
  className,
  zone = 'calm',
}: StatCardProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        'min-w-0 rounded-card bg-surface p-4',
        zone === 'expressive'
          ? 'border-brut border-ink shadow-brut-sm'
          : 'border border-line-subtle',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-caption font-semibold text-text-muted">
          {label}
        </p>
        {icon && (
          <span
            aria-hidden="true"
            className="shrink-0 text-text-muted [&>svg]:h-5 [&>svg]:w-5"
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 min-w-0 break-words text-title-l font-extrabold tabular-nums text-text">
        {value}
      </div>

      {(description || trend) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trend && (
            <span className={cn('text-caption font-bold', TREND_STYLES[trend.direction])}>
              {trend.label}
            </span>
          )}
          {description && (
            <span className="text-caption text-text-muted">
              {description}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
