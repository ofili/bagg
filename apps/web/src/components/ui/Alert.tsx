
import type { ReactNode } from 'react';
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export type AlertVariant =
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<AlertVariant, string> = {
  success: 'border-leaf bg-leaf/10 text-text',
  info: 'border-line bg-surface-tint text-text',
  warning: 'border-sun bg-sun/10 text-text',
  error: 'border-danger bg-danger/10 text-text',
};

const ICONS = {
  success: CheckCircleIcon,
  info: InfoIcon,
  warning: WarningIcon,
  error: WarningCircleIcon,
};

export function Alert({
  variant = 'info',
  title,
  children,
  action,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const Icon = ICONS[variant];
  const role = variant === 'error' || variant === 'warning'
    ? 'alert'
    : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-card border p-3',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        weight="fill"
        className="mt-0.5 h-5 w-5 shrink-0"
      />

      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-bold">
            {title}
          </p>
        )}

        <div className={cn(
          'text-body',
          title && 'mt-1',
        )}>
          {children}
        </div>

        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>

      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-tint hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <XIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
