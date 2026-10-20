'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Users,
  CreditCard,
  Settings,
  LayoutDashboard,
  ExternalLink,
  Plus,
  FileCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Quotes', href: '/quotes', icon: FileCheck },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b justify-between">
          <Link href="/dashboard" className="text-xl font-black tracking-tight">
            bagg<span className="text-emerald-500">.</span>
          </Link>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
            DEV
          </span>
        </div>

        <div className="p-4">
          <Link
            href="/invoices"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Client Demo Link */}
        <div className="p-4 border-t">
          <Link
            href="/i/token_demo_sample_ngn"
            target="_blank"
            className="flex items-center justify-between text-xs font-medium text-neutral-500 hover:text-neutral-900 p-2 rounded-md hover:bg-neutral-50 transition"
          >
            <span>Preview Client View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              SB
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">Studio Bagg Creative</div>
              <div className="text-xs text-neutral-500">freelancer@example.com</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-full border">
            <span>Free Tier: <strong>40 credits remaining</strong></span>
          </div>
        </header>
        <div className="p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
