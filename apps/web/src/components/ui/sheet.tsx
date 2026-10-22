'use client';

import * as DrawerPrimitive from 'vaul';

import { cn } from '@/lib/utils';

const Sheet = DrawerPrimitive.Drawer.Root;
const SheetTrigger = DrawerPrimitive.Drawer.Trigger;
const SheetContent = DrawerPrimitive.Drawer.Content;
const SheetClose = DrawerPrimitive.Drawer.Close;

type SheetProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Root>;
type SheetContentProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Content>;
type SheetCloseProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Drawer.Close>;

export { Sheet, SheetTrigger, SheetContent, SheetClose };

export type { SheetProps, SheetContentProps, SheetCloseProps };
