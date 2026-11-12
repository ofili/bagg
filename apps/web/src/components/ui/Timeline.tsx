
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TimelineTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  date?: string;
  dateTime?: string;
  icon?: ReactNode;
  tone?: TimelineTone;
  trailing?: ReactNode;
  metadata?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  showConnector?: boolean;
}

const MARKER_STYLES: Record<TimelineTone, string> = {
  default: 'bg-ink text-surface',
  success: 'bg-leaf text-ink',
  warning: 'bg-sun text-ink',
  danger: 'bg-danger text-white',
  muted: 'bg-surface-tint text-text-muted',
};

export function Timeline({
  items,
  emptyMessage = 'No activity has been recorded yet.',
  ariaLabel = 'Activity timeline',
  className,
  compact = false,
  showConnector = true,
}: TimelineProps) {
  if (items.length === 0) {
    return (
      <p className={cn('text-body text-text-soft', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ol
      aria-label={ariaLabel}
      className={cn('space-y-0', className)}
    >
      {items.map((item, index) => {
        const tone = item.tone ?? 'default';
        const isLast = index === items.length - 1;

        return (
          <li
            key={item.id}
            className="relative flex gap-3"
          >
            <div className="flex shrink-0 flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                  MARKER_STYLES[tone],
                  !item.icon && 'h-3 w-3 mt-2.5',
                )}
              >
                {item.icon}
              </span>

              {showConnector && !isLast && (
                <span
                  aria-hidden="true"
                  className="min-h-5 w-px flex-1 bg-line"
                />
              )}
            </div>

            <div
              className={cn(
                'min-w-0 flex-1',
                !compact && 'pb-5',
                compact && 'pb-3',
                isLast && 'pb-0',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0 font-semibold text-text">
                  {item.title}
                </div>

                {item.trailing && (
                  <div className="shrink-0">
                    {item.trailing}
                  </div>
                )}
              </div>

              {item.date && (
                <time
                  dateTime={item.dateTime}
                  className="mt-0.5 block text-caption text-text-muted"
                >
                  {item.date}
                </time>
              )}

              {item.description && (
                <div className="mt-1 text-body text-text-soft">
                  {item.description}
                </div>
              )}

              {item.metadata && (
                <div className="mt-2 text-caption text-text-muted">
                  {item.metadata}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
