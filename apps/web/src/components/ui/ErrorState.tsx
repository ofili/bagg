
import type { ReactNode } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  action?: ReactNode;
  details?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete this request. Please try again.',
  retryLabel = 'Try again',
  onRetry,
  action,
  details,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 py-5' : 'gap-3 rounded-card border border-line-subtle bg-surface p-6 sm:p-8',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
        <WarningCircleIcon
          aria-hidden="true"
          weight="fill"
          className="h-6 w-6"
        />
      </span>

      <div className="max-w-lg space-y-1">
        <h2 className="text-heading font-bold text-text">
          {title}
        </h2>

        {description && (
          <p className="text-body text-text-soft">
            {description}
          </p>
        )}
      </div>

      {details && (
        <div className="max-w-full text-left text-caption text-text-muted">
          {details}
        </div>
      )}

      {(action || onRetry) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-ink bg-ink px-4 py-2 text-body font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
