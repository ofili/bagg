
'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { DateField } from './DateField';

export interface DateRangeFieldProps {
  label: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  startId?: string;
  endId?: string;
}

export function DateRangeField({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = 'From',
  endLabel = 'To',
  hint,
  error,
  required = false,
  optional = false,
  disabled = false,
  className,
  startId,
  endId,
}: DateRangeFieldProps) {
  const generatedId = useId();
  const groupId = `${generatedId}-range`;
  const hintId = `${groupId}-hint`;
  const errorId = `${groupId}-error`;

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cn('min-w-0 space-y-1.5', className)}
    >
      <legend className="text-label font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
        {optional && !required && (
          <span className="ml-1 text-caption font-normal text-text-muted">
            (optional)
          </span>
        )}
      </legend>

      {hint && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          id={startId}
          label={startLabel}
          value={startValue}
          onChange={(event) => onStartChange(event.target.value)}
          max={endValue || undefined}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? errorId : undefined}
        />

        <DateField
          id={endId}
          label={endLabel}
          value={endValue}
          onChange={(event) => onEndChange(event.target.value)}
          min={startValue || undefined}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? errorId : undefined}
        />
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
