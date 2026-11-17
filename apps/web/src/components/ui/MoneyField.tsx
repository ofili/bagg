'use client';

import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Field } from './Input';

export interface MoneyFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'inputMode'
  > {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** ISO code such as NGN. Shows the matching symbol (₦ $ £ €) in front of the amount. */
  currency?: string;
  /** Explicit symbol; wins over `currency`. */
  currencySymbol?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

const SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
};

/**
 * Money input with the shared control contract and a currency prefix.
 * Amounts stay as text so partial values such as "4500." survive editing.
 */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  placeholder = '0.00',
  currency,
  currencySymbol,
  hint,
  error,
  required = false,
  optional = false,
  disabled = false,
  autoComplete = 'off',
  className,
  ...props
}: MoneyFieldProps) {
  const symbol =
    currencySymbol ?? (currency ? SYMBOLS[currency] ?? currency : '');

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
    >
      {(a11y) => (
        <div
          className={cn(
            'flex min-h-11 items-stretch overflow-hidden rounded-input',
            'border-brut-thin bg-surface',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink',
            error ? 'border-danger' : 'border-ink',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          {symbol && (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center border-r border-ink bg-surface-tint px-3 text-body font-extrabold text-text"
            >
              {symbol}
            </span>
          )}

          <input
            type="text"
            inputMode="decimal"
            autoComplete={autoComplete}
            value={value ?? ''}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={cn(
              'tabular min-w-0 flex-1 bg-transparent px-3',
              'text-body-l text-text outline-none',
              'placeholder:text-text-muted',
              'disabled:cursor-not-allowed',
            )}
            {...props}
            {...a11y}
          />
        </div>
      )}
    </Field>
  );
}
