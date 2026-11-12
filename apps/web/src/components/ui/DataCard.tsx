
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DataCardProps {
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'article' | 'div';
}

export function DataCard({
  title,
  description,
  metadata,
  leading,
  trailing,
  footer,
  children,
  className,
  onClick,
  as = 'article',
}: DataCardProps) {
  const content = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        {leading && (
          <div className="shrink-0" aria-hidden="true">
            {leading}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="min-w-0 font-extrabold text-text">
              {title}
            </div>
            {metadata}
          </div>

          {description && (
            <div className="text-caption text-text-muted">
              {description}
            </div>
          )}
        </div>

        {trailing && (
          <div className="shrink-0 text-right">
            {trailing}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-3 border-t border-line-subtle pt-3">
          {children}
        </div>
      )}

      {footer && (
        <div className="mt-3 border-t border-line-subtle pt-3">
          {footer}
        </div>
      )}
    </>
  );

  const classes = cn(
    'min-w-0 rounded-card border border-line-subtle bg-surface p-4',
    onClick && [
      'cursor-pointer text-left',
      'hover:bg-surface-tint',
      'focus-visible:outline-2 focus-visible:outline-offset-2',
    ],
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('block w-full', classes)}
      >
        {content}
      </button>
    );
  }

  const Element = as;

  return (
    <Element className={classes}>
      {content}
    </Element>
  );
}
