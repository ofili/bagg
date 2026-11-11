'use client';

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
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
 * Centred modal for desktop and mobile.
 *
 * Uses the native dialog element for modal focus management,
 * Escape handling and focus restoration.
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
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  function closeDialog() {
    const element = ref.current;

    if (element?.open) {
      element.close();
    } else {
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // The native dialog receives backdrop clicks on its own surface.
        if (event.target === ref.current) {
          closeDialog();
        }
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'w-[calc(100%-2rem)] max-w-[480px]',
        'rounded-card border-brut border-ink',
        'bg-surface p-0 text-text shadow-brut-lg outline-none',
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-title">
              {title}
            </h2>

            {description && (
              <p
                id={descriptionId}
                className="text-body text-text-soft"
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close dialog"
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center',
                'rounded-btn border border-line-subtle bg-surface',
                'text-text-muted hover:border-ink hover:text-ink',
                'focus-visible:outline-2 focus-visible:outline-offset-2',
                'focus-visible:outline-ink',
              )}
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
