'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import {
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PublicReceiptData {
  id: string;
  receipt_number: string;
  invoice_number: string;
  currency: string;
  amount_paid_minor: number;
  balance_remaining_minor: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
  payer_name?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  verification_code: string;
  notes?: string | null;
  business_name: string;
  business_logo_url?: string | null;
  business_brand_color?: string | null;
  client_name?: string | null;
  show_badge: boolean;
}

export default function PublicReceiptPage() {
  const params = useParams();
  const token = params?.token as string;

  const [receipt, setReceipt] = useState<PublicReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/receipts/share/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Receipt not found or link has expired.');
          } else {
            const errData = await res.json().catch(() => ({}));
            setError(errData.detail || 'Unable to load receipt details.');
          }
          return;
        }
        const data: PublicReceiptData = await res.json();
        setReceipt(data);
      } catch {
        setError('Network error while loading receipt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleCopyCode = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(receipt.verification_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-neutral-400 text-sm">Loading official receipt...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Receipt Unavailable</h1>
          <p className="text-neutral-400 text-sm mb-6">{error || 'Receipt could not be found.'}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg transition"
          >
            Visit Bagg Home
          </Link>
        </div>
      </div>
    );
  }

  const brandColor = receipt.business_brand_color || '#10B981';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Verified Status Banner */}
        {receipt.is_verified && (
          <div className="bg-emerald-950/80 border border-emerald-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">Payment Verified & Confirmed</p>
                <p className="text-xs text-emerald-400">
                  This is an official immutable payment receipt issued on{' '}
                  {receipt.verified_at ? new Date(receipt.verified_at).toLocaleDateString() : new Date(receipt.payment_date).toLocaleDateString()}.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full whitespace-nowrap">
              ✓ Verified
            </span>
          </div>
        )}

        {/* Main Receipt Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-neutral-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">{receipt.business_name}</h2>
              </div>
              <div className="text-xs text-neutral-400">
                Official Payment Receipt
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Paid by: <span className="text-neutral-200 font-semibold">{receipt.payer_name || receipt.client_name || 'Client'}</span>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Receipt</div>
              <div className="text-2xl font-black text-white">{receipt.receipt_number}</div>
              <div className="flex items-center sm:justify-end gap-3 mt-1.5 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Invoice: {receipt.invoice_number}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(receipt.payment_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details Grid */}
          <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Payment Method</div>
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                {receipt.payment_method.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Reference / Session ID</div>
              <div className="text-sm text-white font-mono">{receipt.reference || 'N/A'}</div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Remaining Invoice Balance</div>
              <div className="text-sm font-mono font-semibold">
                {receipt.balance_remaining_minor === 0 ? (
                  <span className="text-emerald-400">Fully Settled</span>
                ) : (
                  <span className="text-amber-400">{formatMoney(receipt.balance_remaining_minor, receipt.currency)} outstanding</span>
                )}
              </div>
            </div>

            {receipt.notes && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Notes</div>
                <div className="text-sm text-neutral-300">{receipt.notes}</div>
              </div>
            )}
          </div>

          {/* Amount & Verification Stamp Box */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-8 text-center">
            <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-2">
              Amount Received & Verified
            </div>
            <div className="text-4xl font-black text-emerald-400 font-mono mb-4">
              {formatMoney(receipt.amount_paid_minor, receipt.currency)}
            </div>

            {/* Digital Verification Stamp */}
            <div className="inline-flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 border-2 border-emerald-500/60 text-emerald-300 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg" style={{ transform: 'rotate(-2deg)' }}>
                <CheckCircle2 className="w-4 h-4" />
                PAID & VERIFIED
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition mt-1"
              >
                <span className="font-mono">{receipt.verification_code}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="mt-6 pt-4 border-t border-neutral-800 text-center text-[11px] text-neutral-500">
            This document constitutes valid legal proof of payment issued via Bagg. Verification code can be
            used to confirm authenticity.
          </div>
        </div>

        {/* Bagg Viral Footer (Free Tier) */}
        {receipt.show_badge && (
          <div className="text-center pt-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Powered by <strong>Bagg</strong> — Instant Receipts for African Freelancers</span>
              <ArrowRight className="w-3 h-3 text-neutral-600" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
