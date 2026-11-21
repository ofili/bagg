
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
        'bg-surface-tint',
        'animate-pulse motion-reduce:animate-none',
        variant === 'text' && 'h-4 rounded-small',
        variant === 'rectangular' && 'rounded-none',
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
  const safeLines = Math.max(0, Math.floor(lines));

  return (
    <div
      className={cn('space-y-2', className)}
      aria-hidden="true"
    >
      {Array.from({ length: safeLines }, (_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={
            index === safeLines - 1 ? 'w-2/3' : 'w-full'
          }
        />
      ))}
    </div>
  );
}
