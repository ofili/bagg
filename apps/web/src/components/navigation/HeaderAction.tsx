import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type HeaderActionProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function HeaderAction({
  children,
  className,
  type = 'button',
  ...props
}: HeaderActionProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center',
        'rounded-btn border-brut border-ink bg-surface text-ink',
        'transition-colors hover:bg-surface-tint',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-mango focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}