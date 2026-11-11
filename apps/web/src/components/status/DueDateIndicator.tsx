
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';

export interface DueDateIndicatorProps {
  dueDate?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  compact?: boolean;
  className?: string;
}

export function DueDateIndicator({
  dueDate,
  isOverdue = false,
  daysOverdue = 0,
  compact = false,
  className,
}: DueDateIndicatorProps) {
  if (!dueDate) return null;

  const label = isOverdue
    ? daysOverdue > 0
      ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`
      : 'Overdue'
    : `Due ${formatDate(dueDate)}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'text-caption',
        isOverdue
          ? 'font-extrabold text-danger dark:text-[#FFB3A8]'
          : 'text-text-muted',
        compact && 'whitespace-nowrap',
        className,
      )}
    >
      {isOverdue && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-danger"
        />
      )}

      <span>{label}</span>
    </span>
  );
}
