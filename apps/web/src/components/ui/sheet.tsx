
'use client';

import * as React from 'react';
import * as DrawerPrimitive from 'vaul';

import { cn } from '@/lib/cn';

const Sheet = DrawerPrimitive.Drawer.Root;
const SheetTrigger = DrawerPrimitive.Drawer.Trigger;
const SheetClose = DrawerPrimitive.Drawer.Close;

type SheetProps = React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Drawer.Root
>;

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Drawer.Content
> & {
  /** Screen-reader title. Show a visible heading inside the sheet as well. */
  title?: string;
};

type SheetCloseProps = React.ComponentPropsWithoutRef<
  typeof DrawerPrimitive.Drawer.Close
>;

export interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface SheetBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface SheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet for mobile interactions.
 *
 * Use Dialog for centred modal interactions. Sheet is intended
 * for mobile-first actions, filters, menus and compact workflows.
 */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Drawer.Content>,
  SheetContentProps
>(function SheetContent(
  { className, children, title = 'Menu', ...props },
  ref,
) {
  return (
    <DrawerPrimitive.Drawer.Portal>
      <DrawerPrimitive.Drawer.Overlay
        className={cn(
          'fixed inset-0 z-40 bg-black/60',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out',
          'data-[state=open]:animate-in data-[state=open]:fade-in',
        )}
      />

      <DrawerPrimitive.Drawer.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex',
          'max-h-[90dvh] w-full max-w-md flex-col overflow-hidden',
          'rounded-t-sheet border-x-brut border-t-brut border-ink',
          'bg-surface text-text outline-none',
          'pb-[env(safe-area-inset-bottom)]',
          className,
        )}
        {...props}
      >
        <DrawerPrimitive.Drawer.Title className="sr-only">
          {title}
        </DrawerPrimitive.Drawer.Title>

        <div
          aria-hidden
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line"
        />

        {children}
      </DrawerPrimitive.Drawer.Content>
    </DrawerPrimitive.Drawer.Portal>
  );
});

function SheetHeader({
  children,
  className,
}: SheetHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 space-y-1 px-5 pb-4 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SheetBody({
  children,
  className,
}: SheetBodyProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SheetFooter({
  children,
  className,
}: SheetFooterProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-3',
        'border-t border-line-subtle px-5 py-4',
        'sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetBody,
  SheetFooter,
};

export type {
  SheetProps,
  SheetContentProps,
  SheetCloseProps,
};
