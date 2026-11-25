import {
  ArrowsClockwise,
  Briefcase,
  CheckSquareOffset,
  House,
  Receipt,
  Scroll,
  Users,
} from '@phosphor-icons/react';

export const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: House },
  { label: 'Engagements', href: '/engagements', icon: Briefcase },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Quotes', href: '/quotes', icon: Scroll },
  { label: 'Receipts', href: '/receipts', icon: CheckSquareOffset },
  { label: 'Recurring', href: '/recurring-invoices', icon: ArrowsClockwise },
  { label: 'Clients', href: '/clients', icon: Users },
] as const;