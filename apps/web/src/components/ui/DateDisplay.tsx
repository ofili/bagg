
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface DateDisplayProps {
  value?: string | null;
  emptyLabel?: string;
  className?: string;
  dateTime?: string;
}

export function DateDisplay({
  value,
  emptyLabel = '—',
  className,
  dateTime,
}: DateDisplayProps) {
  const formatted = formatDate(value);

  if (!formatted) {
    return <span className={cn('text-text-muted', className)}>{emptyLabel}</span>;
  }

  return (
    <time
      dateTime={dateTime ?? value ?? undefined}
      className={cn('tabular-nums', className)}
    >
      {formatted}
    </time>
  );
}
