
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
}

export function Skeleton({
  variant = 'rectangular',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-surface-tint',
        variant === 'text' && 'h-4 rounded-small',
        variant === 'rectangular' && 'rounded-card',
        variant === 'circular' && 'rounded-full',
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-2', className)}
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }
        />
      ))}
    </div>
  );
}
