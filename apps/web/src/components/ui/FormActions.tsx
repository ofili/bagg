
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormActionsProps {
  children: ReactNode;
  align?: 'start' | 'end' | 'between';
  className?: string;
  divider?: boolean;
}

const alignment = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
};

export function FormActions({
  children,
  align = 'end',
  className,
  divider = true,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 sm:flex-row sm:items-center',
        alignment[align],
        divider && 'border-t border-line-subtle pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
