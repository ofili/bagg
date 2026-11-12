
import { cn } from '@/lib/cn';

export interface DocumentNumberProps {
  value?: string | null;
  prefix?: string;
  className?: string;
}

export function DocumentNumber({
  value,
  prefix,
  className,
}: DocumentNumberProps) {
  const displayValue = value?.trim();

  if (!displayValue) {
    return <span className={cn('text-text-muted', className)}>—</span>;
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      {prefix && <span className="text-text-muted">{prefix}</span>}
      <span className="font-mono font-semibold tabular-nums">
        {displayValue}
      </span>
    </span>
  );
}
