'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { InvoiceDocument } from '@/components/invoice';
import { Money } from '@/components/money/Money';
import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Info,
  X,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    client_name?: string;
    currency: string;
    status: string;
    user_facing_status?: string | null;
    remaining_minor?: number;
    issue_date: string;
    due_date: string;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price_minor: number;
      total_minor: number;
    }>;
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    wht_rate_percent?: number;
    wht_minor?: number;
    net_payable_minor?: number;
    deposit_percentage?: number;
    deposit_amount_minor?: number;
    notes?: string | null;
    share_token: string;
    amount_paid_minor: number;
    latest_claim?: {
      id: string;
      amount_minor: number;
      payment_date: string;
      reference?: string | null;
      status: string;
      rejection_reason?: string | null;
    } | null;
    latest_receipt?: {
      id: string;
      receipt_number: string;
      amount_paid_minor: number;
      balance_remaining_minor: number;
      payment_date: string;
      payment_method: string;
      reference?: string | null;
      confirmation_source?: string;
      provider?: string | null;
      verification_code: string;
      share_token?: string | null;
    } | null;
  };
  payment_profile?: {
    id: string;
    currency: string;
    bank_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    routing_number?: string | null;
    payment_link?: string | null;
    mobile_money_number?: string | null;
    instructions?: string | null;
  } | null;
  comments: Array<{
    id: string;
    author_name: string;
    message: string;
    created_at: string;
  }>;
  is_revised: boolean;
  revision_banner?: string | null;
  show_viral_footer: boolean;
  viral_footer_text?: string;
  viral_footer_link?: string;
}

export default function PublicClientInvoiceView() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isClaimSheetOpen, setIsClaimSheetOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimReference, setClaimReference] = useState('');
  const [claimProofUrl, setClaimProofUrl] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [showAbuseSheet, setShowAbuseSheet] = useState(false);
  const [abuseReason, setAbuseReason] = useState('');
  const [abuseEmail, setAbuseEmail] = useState('');
  const [abuseName, setAbuseName] = useState('');
  const [submittingAbuse, setSubmittingAbuse] = useState(false);
  const [abuseSuccess, setAbuseSuccess] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchInvoiceData = () => {
    if (!token) return;
    fetch(`${API_BASE}/share/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Invoice link not found or expired');
        return res.json();
      })
      .then((json: PublicInvoiceData) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message || 'Could not load invoice');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleClaimPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmittingClaim(true);
    setClaimError(null);

    const amountNum = parseFloat(claimAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setClaimError('Please enter a valid payment amount.');
      setSubmittingClaim(false);
      return;
    }

    const amountMinor = Math.round(amountNum * 100);

    try {
      const res = await fetch(`${API_BASE}/share/${token}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_minor: amountMinor,
          payment_date: claimDate || undefined,
          reference: claimReference.trim() || undefined,
          proof_file_url: claimProofUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit payment claim.');
      }

      setIsClaimSheetOpen(false);
      setToastMsg('Payment claim submitted to freelancer!');
      fetchInvoiceData();
    } catch (err: any) {
      setClaimError(err.message || 'Error submitting claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (abuseReason.trim().length < 10) {
      setAbuseError('Please provide a reason with at least 10 characters.');
      return;
    }
    try {
      setSubmittingAbuse(true);
      setAbuseError(null);
      const res = await fetch(`${API_BASE}/share/${token}/report-abuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: abuseReason.trim(),
          reporter_email: abuseEmail.trim() || undefined,
          reporter_name: abuseName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to submit report');
      }
      setAbuseSuccess(true);
      setTimeout(() => {
        setShowAbuseSheet(false);
        setAbuseSuccess(false);
        setAbuseReason('');
      }, 3000);
    } catch (err: any) {
      setAbuseError(err.message || 'Error submitting report.');
    } finally {
      setSubmittingAbuse(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [token]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMsg(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedKey(null);
      setToastMsg(null);
    }, 2500);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !authorName.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_BASE}/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName.trim(),
          message: commentText.trim(),
        }),
      });
      if (res.ok) {
        setCommentText('');
        fetchInvoiceData();
      }
    } catch {
      // Fallback
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-neutral-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm text-center space-y-3 max-w-sm w-full">
          <Info className="w-10 h-10 text-neutral-400 mx-auto" />
          <h2 className="font-bold text-lg text-neutral-900">Invoice Unavailable</h2>
          <p className="text-xs text-neutral-500">
            {error || 'This link may have been revoked or expired.'}
          </p>
        </div>
      </div>
    );
  }

  const { invoice, payment_profile, comments, is_revised, revision_banner, show_viral_footer, viral_footer_link } = data;

  const whatsappText = encodeURIComponent(
    `Hi ${invoice.client_name || 'there'}, here is invoice ${invoice.invoice_number}: ${window.location.origin}/i/${invoice.share_token}`
  );

  return (
    <div className="min-h-dvh bg-neutral-100 p-4 sm:p-6 lg:p-8">
      {/* Copy Feedback Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Revision Banner */}
      {is_revised && revision_banner && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-900 text-xs font-medium">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{revision_banner}</span>
        </div>
      )}

      {/* Invoice Document */}
      <InvoiceDocument
        variant="public"
        invoice={{
          ...invoice,
          remaining_minor: invoice.remaining_minor,
          amount_paid_minor: invoice.amount_paid_minor,
        }}
      />

      {/* Claim Bottom Sheet */}
      {isClaimSheetOpen && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="hidden" />
          </SheetTrigger>
          <SheetContent className="rounded-2xl border border-neutral-200 bg-white shadow-xl max-h-[90dvh] p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h3 className="font-bold text-base text-neutral-900">Notify Freelancer of Payment</h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-neutral-500 mb-4">
                Let {invoice.client_name ? 'the freelancer' : 'them'} know funds have been sent so
                they can verify and issue your receipt.
              </p>

              {claimError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 mb-4">
                  {claimError}
                </div>
              )}

              <form onSubmit={handleClaimPayment} className="space-y-4">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Amount Paid ({invoice.currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Date Transferred</label>
                  <input
                    type="date"
                    required
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Transaction Reference / Session ID / Narration
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 000013241020084534 or bank session ref"
                    value={claimReference}
                    onChange={(e) => setClaimReference(e.target.value)}
                    className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Proof URL or Screenshot Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... or link to receipt screenshot"
                    value={claimProofUrl}
                    onChange={(e) => setClaimProofUrl(e.target.value)}
                    className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    disabled={submittingClaim}
                    onClick={() => setIsClaimSheetOpen(false)}
                    className="px-3.5 py-2 border rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {submittingClaim ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Confirm Payment Sent'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Abuse Report Bottom Sheet */}
      {showAbuseSheet && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="hidden" />
          </SheetTrigger>
          <SheetContent className="rounded-2xl border border-neutral-200 bg-white shadow-xl max-h-[90dvh] p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-neutral-900">Report Suspicious Invoice</h3>
              </div>
            </div>
            <div className="p-4">
              {abuseSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Thank you. Your report has been submitted. Our security team will inspect this invoice promptly.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReportAbuse} className="space-y-4">
                  <p className="text-neutral-500 text-xs">
                    If this invoice appears to be impersonation, phishing, or an unauthorized charge,
                    report it below. We take platform integrity seriously.
                  </p>

                  {abuseError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                      {abuseError}
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Reason for Report *
                    </label>
                    <textarea
                      required
                      minLength={10}
                      rows={4}
                      placeholder="Describe why you believe this invoice is suspicious or fraudulent..."
                      value={abuseReason}
                      onChange={(e) => setAbuseReason(e.target.value)}
                      className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-red-500 text-neutral-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Your Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        value={abuseEmail}
                        onChange={(e) => setAbuseEmail(e.target.value)}
                        className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-neutral-500 text-neutral-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={abuseName}
                        onChange={(e) => setAbuseName(e.target.value)}
                        className="min-h-[44px] w-full border rounded-lg focus:ring-1 focus:ring-neutral-500 text-neutral-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAbuseSheet(false)}
                      className="px-3.5 py-2 border rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAbuse}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {submittingAbuse ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Report'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Comments Section */}
      <div className="mt-8 border-t pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-neutral-900">Questions or Clarifications</h3>
        </div>

        {comments && comments.length > 0 ? (
          <div className="space-y-2">
            {comments.map((cmt) => (
              <div key={cmt.id} className="p-3 bg-neutral-50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between font-semibold text-neutral-800">
                  <span>{cmt.author_name}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {new Date(cmt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-neutral-600">{cmt.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">
            Have a question about a line item? Leave a message below and the freelancer will be notified.
          </p>
        )}

        <form onSubmit={handleAddComment} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Your Name (e.g. Tunde)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="min-h-[44px] px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Ask a question..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[44px] px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment}
            className="w-full min-h-[44px] px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {submittingComment ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </form>
      </div>

      {/* Viral Footer */}
      {show_viral_footer && (
        <div className="mt-8 pt-4 pb-2 text-center">
          <Link
            href={
              viral_footer_link ||
              'https://bagg.africa?utm_source=invoice_footer&utm_medium=referral'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition"
          >
            <span>Powered by</span>
            <span className="font-bold text-neutral-900 tracking-tight">bagg.</span>
            <span>— Invoicing & get-paid workspace for African creators</span>
          </Link>
        </div>
      )}

      {/* Abuse Reporting Link */}
      <div className="mt-8 pt-1 pb-2 text-center">
        <button
          type="button"
          onClick={() => setShowAbuseSheet(true)}
          className="text-[11px] text-neutral-400 hover:text-red-600 underline transition"
        >
          Report this invoice as suspicious or fraudulent
        </button>
      </div>
    </div>
  );
}
