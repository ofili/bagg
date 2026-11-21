
import type { ReactNode } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { buttonStyles } from './button';

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
        compact
          ? 'gap-2 py-5'
          : 'gap-3 border-brut border-ink bg-surface p-6 sm:p-8',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full',
          'bg-danger/10 text-danger',
        )}
      >
        <WarningCircleIcon
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
              className={cn(
                buttonStyles({
                  variant: 'ink',
                  zone: 'calm',
                }),
                'px-4',
              )}
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
