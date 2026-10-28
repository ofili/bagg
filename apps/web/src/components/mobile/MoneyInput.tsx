'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

interface MoneyInputProps {
  id?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** ISO code such as NGN. Shows the matching symbol (₦ $ £ €) in front of the amount. */
  currency?: string;
  /** Explicit symbol; wins over `currency`. */
  currencySymbol?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
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

export function MoneyInput({
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
  disabled = false,
  autoComplete = 'off',
}: MoneyInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const symbol = currencySymbol ?? (currency ? SYMBOLS[currency] ?? currency : '');
  const note = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-body font-medium text-text">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex min-h-11 items-stretch overflow-hidden rounded-input border-brut-thin bg-surface',
          'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-mango',
          error ? 'border-danger' : 'border-ink',
          disabled && 'opacity-50',
        )}
      >
        {symbol && (
          <span
            aria-hidden
            className="flex items-center border-r border-ink bg-surface-tint px-3 text-body font-extrabold"
          >
            {symbol}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete={autoComplete}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className="tabular min-w-0 flex-1 bg-transparent px-3 text-body-l text-text outline-none placeholder:text-text-muted"
        />
      </div>
      {note && (
        <p
          id={noteId}
          role={error ? 'alert' : undefined}
          className={cn('text-caption', error ? 'text-danger dark:text-[#FFB3A8]' : 'text-text-muted')}
        >
          {note}
        </p>
      )}
    </div>
  );
}
