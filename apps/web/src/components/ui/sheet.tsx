'use client';

import * as React from 'react';
import * as DrawerPrimitive from 'vaul';

import { cn } from '@/lib/cn';

const Sheet = DrawerPrimitive.Drawer.Root;
const SheetTrigger = DrawerPrimitive.Drawer.Trigger;
const SheetClose = DrawerPrimitive.Drawer.Close;

type SheetProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Root>;
type SheetContentProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Content> & {
  /** Screen-reader title. Show a visible heading inside the sheet as well. */
  title?: string;
};
type SheetCloseProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Close>;

/**
 * Bottom sheet for phones (desktop uses <Dialog>). Renders in a portal with a dimmed overlay,
 * fixed to the bottom, with the neo-brutalist outline and a drag handle.
 */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Drawer.Content>,
  SheetContentProps
>(function SheetContent({ className, children, title = 'Menu', ...props }, ref) {
  return (
    <DrawerPrimitive.Drawer.Portal>
      <DrawerPrimitive.Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
      <DrawerPrimitive.Drawer.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-md flex-col outline-none',
          'rounded-t-sheet border-x-brut border-t-brut border-ink bg-surface text-text',
          className,
        )}
        {...props}
      >
        <DrawerPrimitive.Drawer.Title className="sr-only">{title}</DrawerPrimitive.Drawer.Title>
        <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" />
        {children}
      </DrawerPrimitive.Drawer.Content>
    </DrawerPrimitive.Drawer.Portal>
  );
});

function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-line-subtle py-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export { Sheet, SheetTrigger, SheetContent, SheetClose, SheetFooter };

export type { SheetProps, SheetContentProps, SheetCloseProps };
