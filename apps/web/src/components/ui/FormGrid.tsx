import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

/** Consistent form layout: one column on mobile, more from sm upward. */
export function FormGrid({
  columns = 2,
  className,
  ...props
}: FormGridProps) {
  return (
    <div
      className={cn('grid gap-4', COLUMNS[columns], className)}
      {...props}
    />
  );
}
