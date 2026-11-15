'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field, inputStyles } from './Input';

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

/**
 * Native date input with the shared control chrome.
 *
 * The browser picker stays available through the trailing button, and the
 * native indicator is hidden so the field matches every other control.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(
    {
      id,
      label,
      hint,
      error,
      optional,
      className,
      required,
      ...props
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    function openPicker() {
      const input = inputRef.current;
      if (!input) return;

      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
          return;
        } catch {
          // Some browsers block showPicker outside a user gesture.
        }
      }

      input.focus();
      input.click();
    }

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
          <div className="relative">
            <input
              ref={inputRef}
              type="date"
              required={required}
              className={cn(
                inputStyles,
                'pr-11',
                '[&::-webkit-calendar-picker-indicator]:hidden',
                className,
              )}
              {...props}
              {...a11y}
            />

            <button
              type="button"
              onClick={openPicker}
              aria-label={`Open ${label.toLocaleLowerCase()} calendar`}
              className={cn(
                'absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2',
                'items-center justify-center rounded-small text-text-soft',
                'hover:bg-surface-tint hover:text-text',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              )}
            >
              <CalendarDays aria-hidden className="h-4 w-4" />
            </button>
          </div>
        )}
      </Field>
    );
  },
);
