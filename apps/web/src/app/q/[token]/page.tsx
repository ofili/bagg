'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Share2,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LineItem {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

interface PublicQuoteData {
  id: string;
  quote_number: string;
  currency: string;
  status: string;
  effective_status?: string | null;
  is_expired: boolean;
  issue_date: string;
  expires_at: string;
  items: LineItem[];
  subtotal_minor: number;
  discount_minor: number;
  tax_rate_percent: number;
  tax_minor: number;
  total_minor: number;
  wht_rate_percent: number;
  wht_minor: number;
  net_payable_minor: number;
  deposit_percentage?: number | null;
  deposit_amount_minor?: number | null;
  notes?: string | null;
  business_name: string;
  business_logo_url?: string | null;
  business_brand_color?: string | null;
  client_name?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  accepted_by_name?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  show_badge: boolean;
}

export default function PublicQuotePage() {
  const params = useParams();
  const token = params?.token as string;

  const [quote, setQuote] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accept Bottom Sheet State
  const [showAcceptSheet, setShowAcceptSheet] = useState(false);
  const [acceptName, setAcceptName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Decline Bottom Sheet State
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const fetchQuote = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/quotes/share/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Quote not found or link has expired.');
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.detail || 'Unable to load quote details.');
        }
        return;
      }
      const data: PublicQuoteData = await res.json();
      setQuote(data);
    } catch {
      setError('Network error while loading quote. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [token]);

  const handleAcceptQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptName.trim()) {
      setAcceptError('Please enter your full name to accept this quote.');
      return;
    }
    try {
      setAccepting(true);
      setAcceptError(null);
      const res = await fetch(`${API_BASE}/quotes/share/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_by_name: acceptName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAcceptError(err.detail || 'Failed to accept quote.');
        return;
      }
      const updated = await res.json();
      setQuote(updated);
      setShowAcceptSheet(false);
    } catch {
      setAcceptError('Network error while submitting acceptance.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDeclining(true);
      setDeclineError(null);
      const res = await fetch(`${API_BASE}/quotes/share/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeclineError(err.detail || 'Failed to decline quote.');
        return;
      }
      const updated = await res.json();
      setQuote(updated);
      setShowDeclineSheet(false);
    } catch {
      setDeclineError('Network error while declining quote.');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-neutral-400 text-sm">Loading official quote…</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Quote Unavailable</h1>
          <p className="text-neutral-400 text-sm mb-6">
            {error || 'Quote could not be found.'}
          </p>
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

  const displayStatus = quote.user_facing_status || quote.status;
  const isAccepted = quote.status === 'accepted';
  const isDeclined = quote.status === 'declined';
  const isConverted = quote.status === 'converted';
  const isExpired = quote.is_expired || displayStatus === 'expired';
  const canRespond = !isAccepted && !isDeclined && !isConverted && !isExpired;

  const brandColor = quote.business_brand_color || '#10B981';

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappText = encodeURIComponent(
    `Hi, I’d like to discuss quote ${quote.quote_number}: ${shareUrl}/q/${token}`
  );

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-8">
      {/* Top Status Banner */}
      {isAccepted && (
        <div className="bg-emerald-950/80 border border-emerald-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-200">Quote Accepted</p>
              <p className="text-xs text-emerald-400">
                Accepted by <strong>{quote.accepted_by_name}</strong> on{' '}
                {quote.accepted_at ? new Date(quote.accepted_at).toLocaleDateString() : ''}.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
            Accepted
          </span>
        </div>
      )}

      {isDeclined && (
        <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-200">Quote Declined</p>
              <p className="text-xs text-rose-400">
                {quote.decline_reason ? `Feedback: "${quote.decline_reason}"` : 'Declined by client.'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full">
            Declined
          </span>
        </div>
      )}

      {isConverted && (
        <div className="bg-purple-950/60 border border-purple-800/60 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-200">Converted to Invoice</p>
              <p className="text-xs text-purple-400">
                This quote was approved and converted into an official invoice.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full">
            {quote.invoice_number || 'Converted'}
          </span>
        </div>
      )}

      {isExpired && !isAccepted && (
        <div className="bg-amber-950/60 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200">Quote Has Expired</p>
              <p className="text-xs text-amber-400">
                This offer lapsed on {new Date(quote.expires_at).toLocaleDateString()}. Please
                request an updated quote.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full">
            Expired
          </span>
        </div>
      )}

      {/* Main Quote Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-neutral-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">{quote.business_name}</h2>
          </div>
          <div className="flex items-baseline gap-1 w-full sm:w-auto">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Estimate / Quote
            </span>
            <div className="text-2xl font-black text-white">{quote.quote_number}</div>
            <StatusPill status={displayStatus} />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400 w-full sm:w-auto">
            <span>Issued: {new Date(quote.issue_date).toLocaleDateString()}</span>
            <span className="mx-1">•</span>
            <span className={isExpired ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
              Valid until: {new Date(quote.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
          <span>Prepared for:</span>
          <span className="text-neutral-200 font-semibold">{quote.client_name || 'Valued Client'}</span>
        </div>

        {/* Line Items (mobile-first stacked cards) */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Project Scope & Deliverables
          </h3>
          {quote.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800/50 bg-neutral-800/30 p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{item.description}</div>
                <div className="text-[11px] text-neutral-500">
                  {item.quantity} × <Money amountMinor={item.unit_price_minor} currency={quote.currency} variant="muted" />
                </div>
              </div>
              <span className="font-mono font-semibold text-neutral-200 text-sm">
                <Money amountMinor={item.total_minor} currency={quote.currency} />
              </span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="mt-6 space-y-2 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal</span>
            <span className="font-mono text-neutral-200">
            <Money amountMinor={quote.subtotal_minor} currency={quote.currency} />
          </span>
          </div>

          {quote.discount_minor > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount</span>
              <span className="font-mono">-<Money amountMinor={quote.discount_minor} currency={quote.currency} /></span>
            </div>
          )}

          {quote.tax_rate_percent > 0 && (
            <div className="flex justify-between text-neutral-400">
              <span>VAT ({quote.tax_rate_percent}%)</span>
              <span className="font-mono text-neutral-200">
                <Money amountMinor={quote.tax_minor} currency={quote.currency} />
              </span>
            </div>
          )}

          <div className="flex justify-between text-neutral-300 font-semibold border-t border-neutral-800 pt-2">
            <span>Gross Total</span>
              <span className="font-mono">
                <Money amountMinor={quote.total_minor} currency={quote.currency} />
              </span>
          </div>

          {quote.wht_rate_percent > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Withholding Tax (WHT {quote.wht_rate_percent}%)</span>
              <span className="font-mono">-<Money amountMinor={quote.wht_minor} currency={quote.currency} /></span>
            </div>
          )}

          <div className="flex justify-between text-white font-bold text-base border-t border-neutral-700 pt-2">
            <span>Net Payable</span>
            <span className="font-mono text-emerald-400">
                <Money amountMinor={quote.net_payable_minor} currency={quote.currency} />
              </span>
          </div>
        </div>

        {/* Notes & Deposit */}
        {quote.notes && (
          <div className="mt-5 rounded-lg border border-neutral-800/50 bg-neutral-800/30 p-4">
            <h4 className="text-xs font-bold text-neutral-300 mb-2">Notes & Deliverables</h4>
            <p className="text-neutral-400 text-xs whitespace-pre-line leading-relaxed">
              {quote.notes}
            </p>
          </div>
        )}
        {quote.deposit_percentage && quote.deposit_percentage > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-200/20 bg-emerald-950/20 p-4 text-emerald-300">
            <div className="text-xs font-semibold text-emerald-400 mb-1">
              Upfront Milestone Deposit: {quote.deposit_percentage}%
            </div>
            <p className="text-[11px] leading-relaxed">
              Upon acceptance, an initial deposit of{' '}
              <span className="text-white font-semibold">
                <Money amountMinor={quote.deposit_amount_minor || 0} currency={quote.currency} />
              </span>{' '}
              is required to kickoff production.
            </p>
          </div>
        )}

        {/* Client Action Bar */}
        {canRespond && (
          <div className="mt-6 pt-4 border-t border-neutral-800 space-y-3">
            <p className="text-xs text-neutral-400">
              Ready to kick off this project? Review the scope and confirm acceptance.
            </p>
            <button
              type="button"
              onClick={() => setShowDeclineSheet(true)}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Decline
            </button>
            <button
              type="button"
              onClick={() => setShowAcceptSheet(true)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Accept Quote
            </button>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
            >
              <Share2 className="w-4 h-4" /> Share on WhatsApp
            </a>
          </div>
        )}

        {/* Bagg Viral Acquisition Footer */}
        {quote.show_badge && (
          <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Created with <strong>Bagg</strong> — Free Invoicing & Quotes for African Freelancers</span>
              <ArrowRight className="w-3 h-3 text-neutral-600" />
            </Link>
          </div>
        )}
      </div>

      {/* Accept Quote Bottom Sheet */}
      {showAcceptSheet && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="hidden" />
          </SheetTrigger>
          <SheetContent className="rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[90dvh]">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Accept Project Quote</h3>
                  <p className="text-xs text-neutral-400">
                    {quote.quote_number} • <Money amountMinor={quote.net_payable_minor} currency={quote.currency} />
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <form onSubmit={handleAcceptQuote} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Your Full Name or Authorized Signatory <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amara Okonkwo"
                    value={acceptName}
                    onChange={(e) => setAcceptName(e.target.value)}
                    className="min-h-[44px] w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {acceptError && (
                  <div className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/50">
                    {acceptError}
                  </div>
                )}

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  By clicking "Confirm Acceptance", you formally approve the scope, pricing, and
                  terms outlined in this estimate.
                </p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    disabled={accepting}
                    onClick={() => setShowAcceptSheet(false)}
                    className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accepting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
                  >
                    {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Confirm Acceptance
                  </button>
                </div>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Decline Quote Bottom Sheet */}
      {showDeclineSheet && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="hidden" />
          </SheetTrigger>
          <SheetContent className="rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[90dvh]">
            <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Decline Quote</h3>
                <p className="text-xs text-neutral-400">
                  Let the freelancer know why this quote didn't fit.
                </p>
              </div>
            </div>
            <div className="p-4">
              <form onSubmit={handleDeclineQuote} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Optional Feedback / Reason
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Budget was reduced, timeline too tight, or scope change..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="min-h-[44px] w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                </div>

                {declineError && (
                  <div className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/50">
                    {declineError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    disabled={declining}
                    onClick={() => setShowDeclineSheet(false)}
                    className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={declining}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                  >
                    {declining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Decline Quote'}
                  </button>
                </div>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
