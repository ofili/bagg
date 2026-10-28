'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Lowercase, per the brand voice. */
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Centred modal for desktop (max 440px). On phones use <Sheet> (bottom sheet).
 * Built on the native <dialog>, which traps focus, closes on Escape and returns focus on close.
 * Put the safe action on the left and the committing action on the right.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      aria-label={title}
      className={cn(
        'w-[calc(100%-2rem)] max-w-[440px] rounded-card border-brut border-ink bg-surface p-0 text-text shadow-brut-lg',
        'backdrop:bg-black/60',
        className,
      )}
    >
      <div className="space-y-4 p-5">
        <h2 className="text-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
