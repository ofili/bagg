'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

/**
 * Centred modal for desktop and mobile (max 480px).
 * Built on native <dialog>, which traps focus, closes on Escape, and returns focus on close.
 * Put the safe action on the left and the committing action on the right.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: DialogProps) {
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
        'w-[calc(100%-2rem)] max-w-[480px] rounded-card border-brut border-ink bg-surface p-0 text-text shadow-brut-lg outline-none',
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-title">{title}</h2>
            {description && <p className="text-body text-text-soft">{description}</p>}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border border-line-subtle bg-surface text-text-muted hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-mango"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
