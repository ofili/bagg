'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import {
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  FileDown,
  Plus
} from 'lucide-react';

interface DemoInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  currency: 'NGN' | 'USD';
  total_minor: number;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'viewed' | 'payment_claimed' | 'paid';
  share_token: string;
}

export default function InvoicesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const invoices: DemoInvoice[] = [
    {
      id: 'inv_1',
      invoice_number: 'INV-0001',
      client_name: 'Lagos Tech Ventures',
      currency: 'NGN',
      total_minor: 40850000,
      issue_date: '2026-10-15',
      due_date: '2026-10-29',
      status: 'sent',
      share_token: 'token_demo_sample_ngn',
    },
    {
      id: 'inv_2',
      invoice_number: 'INV-0002',
      client_name: 'Acme Global Inc.',
      currency: 'USD',
      total_minor: 112500,
      issue_date: '2026-10-18',
      due_date: '2026-11-01',
      status: 'payment_claimed',
      share_token: 'token_demo_sample_usd',
    },
  ];

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/i/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: DemoInvoice['status']) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Paid</span>;
      case 'payment_claimed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Payment Claimed</span>;
      case 'viewed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Viewed</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">Sent</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500">Create, send, track and follow up on client invoices.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b text-neutral-500 font-medium">
              <tr>
                <th className="py-3 px-4">Number</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3.5 px-4 font-semibold text-neutral-900">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-700">
                    {inv.client_name}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-500">
                    {inv.due_date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900">
                    {formatMoney(inv.total_minor, inv.currency)}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(inv.share_token, inv.id)}
                      title="Copy Share Link"
                      className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                    >
                      {copiedId === inv.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* WhatsApp Click-to-Share */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hi, here is your invoice ${inv.invoice_number} for ${formatMoney(
                          inv.total_minor,
                          inv.currency
                        )}: ${typeof window !== 'undefined' ? window.location.origin : ''}/i/${inv.share_token}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Share to WhatsApp"
                      className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition inline-flex items-center"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    {/* View as Client */}
                    <Link
                      href={`/i/${inv.share_token}`}
                      target="_blank"
                      title="Preview Client Page"
                      className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                    >
                      <Share2 className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
