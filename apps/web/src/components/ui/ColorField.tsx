'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { inputStyles } from './Input';

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Colour picker plus an editable hex value. The text input is the labelled
 * control; the swatch is an additional, explicitly labelled picker.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
  error,
  optional = false,
  required = false,
  disabled = false,
  className,
  id: suppliedId,
}: ColorFieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const validHex = HEX_PATTERN.test(value);

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label htmlFor={id} className="block text-label font-medium text-text">
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
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={validHex ? value : '#FF7A1A'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          disabled={disabled}
          className={cn(
            'h-11 w-14 shrink-0 cursor-pointer rounded-input',
            'border-brut-thin border-ink bg-surface p-1',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />

        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          required={required}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-errormessage={error ? errorId : undefined}
          className={cn(inputStyles, 'max-w-40 font-mono uppercase')}
        />

        {hint && !error && (
          <p id={hintId} className="text-caption text-text-muted">
            {hint}
          </p>
        )}
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
    </div>
  );
}
