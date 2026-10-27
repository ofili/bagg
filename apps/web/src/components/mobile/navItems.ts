import { FileCheck, FileText, LayoutDashboard, Users } from 'lucide-react';

/** Single source for the phone tab bar, the tablet icon rail and the desktop sidebar. */
export const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Quotes', href: '/quotes', icon: FileCheck },
  { label: 'Clients', href: '/clients', icon: Users },
] as const;
