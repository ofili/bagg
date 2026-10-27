'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Always visible. */
  label: string;
  /** One line, when the effect is not obvious. */
  hint?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 py-2.5">
        <span id={id} className="block text-body font-medium text-text">
          {label}
        </span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-caption text-text-muted">
            {hint}
          </span>
        )}
      </div>
      {/* 44 by 44 hit area around a 40 by 24 track */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
      >
        <span
          className={cn(
            'relative block h-6 w-10 rounded-full border-brut-thin border-ink transition-colors duration-100',
            checked ? 'bg-mango' : 'bg-surface-tint',
          )}
        >
          <span
            className={cn(
              'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-brut-thin border-ink bg-surface transition-[left] duration-100',
              checked ? 'left-[18px]' : 'left-[3px]',
            )}
          />
        </span>
      </button>
    </div>
  );
}
