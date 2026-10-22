'use client';

import { cn } from '@/lib/utils';

interface MoneyInputProps {
  id?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  currencySymbol?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  placeholder = '0.00',
  currencySymbol = '',
  error,
  required = false,
  disabled = false,
  autoComplete = 'off',
}: MoneyInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-neutral-600 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {currencySymbol && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
            {currencySymbol}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete={autoComplete}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            'w-full min-h-[48px] pl-8 pr-3 py-2 text-sm font-mono text-neutral-900 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            disabled && 'bg-neutral-100 text-neutral-400 cursor-not-allowed',
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
