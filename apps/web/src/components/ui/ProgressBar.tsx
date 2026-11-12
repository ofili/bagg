
import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
  valueLabel?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

const TONE_STYLES = {
  default: 'bg-ink',
  success: 'bg-leaf',
  warning: 'bg-sun',
  danger: 'bg-danger',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  valueLabel,
  tone = 'default',
  size = 'md',
  className,
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;

  const percentage = Math.round((safeValue / safeMax) * 100);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption font-semibold text-text">
          {label}
        </span>

        {showValue && (
          <span className="shrink-0 text-caption tabular-nums text-text-muted">
            {valueLabel ?? `${percentage}%`}
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={valueLabel}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-tint',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200',
            'motion-reduce:transition-none',
            TONE_STYLES[tone],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
