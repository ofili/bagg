'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import {
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  FileDown,
  Plus,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string | null;
  currency: string;
  total_minor: number;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'viewed' | 'payment_claimed' | 'paid' | 'cancelled';
  share_token?: string | null;
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = statusFilter
        ? `${API_BASE}/invoices?status=${statusFilter}`
        : `${API_BASE}/invoices`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/i/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Paid</span>;
      case 'payment_claimed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Claimed</span>;
      case 'viewed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Viewed</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Sent</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500">
            Create, track, and manage client invoices with automated numbering and minor-unit math.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold text-neutral-600">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === '' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          All Invoices
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'draft' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setStatusFilter('sent')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'sent' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Sent / Unpaid
        </button>
        <button
          onClick={() => setStatusFilter('payment_claimed')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'payment_claimed' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Payment Claimed
        </button>
        <button
          onClick={() => setStatusFilter('paid')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'paid' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
          }`}
        >
          Paid
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-semibold text-neutral-800 text-base">No invoices found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {statusFilter
              ? `No invoices currently in "${statusFilter}" status.`
              : 'Create your first invoice in under 60 seconds. Bagg auto-assigns sequential numbering.'}
          </p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create New Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b text-neutral-500 font-medium text-xs">
                <tr>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition">
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-800">
                      {inv.client_name || 'Client'}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
                      {inv.issue_date}
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
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {inv.share_token && (
                        <>
                          <button
                            onClick={() => handleCopyLink(inv.share_token!, inv.id)}
                            title="Copy Share Link"
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

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

                          <Link
                            href={`/i/${inv.share_token}`}
                            target="_blank"
                            title="View Public Client Receipt"
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 transition inline-flex items-center"
                          >
                            <Share2 className="w-4 h-4" />
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
