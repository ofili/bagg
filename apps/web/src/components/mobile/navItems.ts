import {
  FileCheck,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Users,
} from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Quotes', href: '/quotes', icon: FileCheck },
  { label: 'Receipts', href: '/receipts', icon: ReceiptText },
  { label: 'Clients', href: '/clients', icon: Users },
] as const;