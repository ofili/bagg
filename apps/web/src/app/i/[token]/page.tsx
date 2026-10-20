'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import {
  Copy,
  Check,
  CreditCard,
  Building2,
  CheckCircle2,
  MessageSquare,
  Send,
  Upload,
  ShieldCheck,
  Info,
  Download,
  Loader2,
  ExternalLink,
  Smartphone,
  Landmark,
  User,
  HelpCircle,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

interface PaymentProfile {
  id: string;
  currency: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  payment_link?: string | null;
  mobile_money_number?: string | null;
  instructions?: string | null;
}

interface Comment {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface PaymentClaim {
  id: string;
  amount_minor: number;
  payment_date: string;
  reference?: string | null;
  proof_file_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
}

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    client_name?: string;
    currency: string;
    status: string;
    issue_date: string;
    due_date: string;
    items: LineItem[];
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    wht_rate_percent?: number;
    wht_minor?: number;
    net_payable_minor?: number;
    wht_credit_note_number?: string;
    deposit_percentage?: number;
    deposit_amount_minor?: number;
    deposit_due_date?: string;
    balance_due_minor?: number;
    direct_checkout_enabled?: boolean;
    amount_paid_minor: number;
    notes?: string;
    version: number;
    share_token: string;
  };
  payment_profile?: PaymentProfile | null;
  comments: Comment[];
  is_revised: boolean;
  revision_banner?: string | null;
  show_viral_footer: boolean;
  viral_footer_text?: string;
  viral_footer_link?: string;
  latest_claim?: PaymentClaim | null;
}

export default function PublicClientInvoiceView() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Direct checkout state (US-INT-01)
  const [checkingOut, setCheckingOut] = useState(false);

  // Claim modal state (US-CLM-01)
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimReference, setClaimReference] = useState('');
  const [claimProofUrl, setClaimProofUrl] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Abuse report modal state (US-SEC-02)
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [abuseReason, setAbuseReason] = useState('');
  const [abuseEmail, setAbuseEmail] = useState('');
  const [abuseName, setAbuseName] = useState('');
  const [submittingAbuse, setSubmittingAbuse] = useState(false);
  const [abuseSuccess, setAbuseSuccess] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  // Comment state (US-CLV-03)
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
        const netTotal = json.invoice.net_payable_minor || json.invoice.total_minor;
        let defaultMinor = netTotal - (json.invoice.amount_paid_minor || 0);
        if (json.invoice.deposit_amount_minor && (json.invoice.amount_paid_minor || 0) < json.invoice.deposit_amount_minor) {
          defaultMinor = json.invoice.deposit_amount_minor - (json.invoice.amount_paid_minor || 0);
        }
        const remaining = defaultMinor / 100;
        setClaimAmount(remaining > 0 ? remaining.toString() : (netTotal / 100).toString());
      })
      .catch((err) => {
        setError(err.message || 'Could not load invoice');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDirectCheckout = async () => {
    try {
      setCheckingOut(true);
      const res = await fetch(`${API_BASE}/share/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Could not initialize payment checkout');
      }
      const chk = await res.json();
      if (chk.checkout_url) {
        window.location.href = chk.checkout_url;
      }
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
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
        setShowAbuseModal(false);
        setAbuseSuccess(false);
        setAbuseReason('');
      }, 3000);
    } catch (err: any) {
      setAbuseError(err.message || 'Error submitting report');
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

      setHasClaimed(true);
      setIsPaidModalOpen(false);
      setToastMsg('Payment claim submitted to freelancer!');
      fetchInvoiceData();
    } catch (err: any) {
      setClaimError(err.message || 'Error submitting claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center space-y-3 max-w-sm">
          <Info className="w-10 h-10 text-neutral-400 mx-auto" />
          <h2 className="font-bold text-lg text-neutral-900">Invoice Unavailable</h2>
          <p className="text-xs text-neutral-500">{error || 'This link may have been revoked or expired.'}</p>
        </div>
      </div>
    );
  }

  const { invoice, payment_profile, comments, is_revised, revision_banner, show_viral_footer, viral_footer_link, latest_claim } = data;
  const isPaid = invoice.status === 'paid';
  const isClaimed = invoice.status === 'payment_claimed' || latest_claim?.status === 'pending' || hasClaimed;
  const isRejected = latest_claim?.status === 'rejected' && !isClaimed && !isPaid;
  const isPartiallyPaid = invoice.status === 'partially_paid' || (invoice.amount_paid_minor > 0 && !isPaid);

  return (
    <div className="min-h-screen bg-neutral-100 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Copy Feedback Toast (US-CLV-02) */}
        {toastMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Revision Banner (US-DEL-05) */}
        {is_revised && revision_banner && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-900 text-xs font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{revision_banner}</span>
          </div>
        )}

        {/* Paid in Full Banner */}
        {isPaid && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold">Payment Verified & Settled in Full</div>
              <div className="text-xs text-emerald-700">This invoice has been marked as paid. An official receipt has been issued.</div>
            </div>
          </div>
        )}

        {/* Status Notification if Payment Claimed (US-CLM-01) */}
        {isClaimed && !isPaid && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-900 text-sm">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">Payment Claim Received!</span> We have notified the freelancer to verify your transfer.
            </div>
          </div>
        )}

        {/* Rejection Notification if Claim was Rejected (US-CLM-02) */}
        {isRejected && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Payment Claim Needs Attention</div>
              <div className="text-xs text-amber-800 mt-0.5">
                {latest_claim?.rejection_reason || 'The freelancer could not verify the payment transfer.'}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                Please re-check your transfer session ID or submit an updated receipt below.
              </div>
            </div>
          </div>
        )}

        {/* Partially Paid Notification */}
        {isPartiallyPaid && !isPaid && (
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs text-neutral-800">
            <div>
              <span className="font-semibold text-neutral-900">Partially Paid: </span>
              {formatMoney(invoice.amount_paid_minor, invoice.currency)} received of {formatMoney(invoice.total_minor, invoice.currency)}.
            </div>
            <div className="font-bold text-emerald-700">
              Remaining: {formatMoney(invoice.total_minor - invoice.amount_paid_minor, invoice.currency)}
            </div>
          </div>
        )}

        {/* Invoice Card (US-CLV-01) */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Invoice From</span>
              <h1 className="text-xl font-bold text-neutral-900 mt-1">Studio Bagg Creative Ltd</h1>
              {invoice.client_name && (
                <div className="text-xs text-neutral-500 mt-0.5">Billed to: <strong>{invoice.client_name}</strong></div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-black text-neutral-900">{invoice.invoice_number}</div>
              <div className="text-xs text-neutral-500 mt-1">Due {invoice.due_date}</div>
              <div className="mt-2">
                <a
                  href={`${API_BASE}/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 border px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 transition"
                >
                  <Download className="w-3 h-3" /> Download Receipt
                </a>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <table className="w-full text-left text-sm">
              <thead className="border-b text-neutral-500 font-medium text-xs">
                <tr>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-medium text-neutral-800">{item.description}</td>
                    <td className="py-3 text-center text-neutral-600">{item.quantity}</td>
                    <td className="py-3 text-right text-neutral-600">{formatMoney(item.unit_price_minor, invoice.currency)}</td>
                    <td className="py-3 text-right font-semibold text-neutral-900">{formatMoney(item.total_minor, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Breakdown (US-INV-02, US-INT-02, US-INT-03) */}
            <div className="mt-4 pt-4 border-t space-y-2 text-xs text-neutral-600 max-w-xs ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-neutral-900">{formatMoney(invoice.subtotal_minor, invoice.currency)}</span>
              </div>
              {invoice.discount_minor > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatMoney(invoice.discount_minor, invoice.currency)}</span>
                </div>
              )}
              {invoice.tax_minor > 0 && (
                <div className="flex justify-between">
                  <span>VAT ({invoice.tax_rate_percent}%):</span>
                  <span className="font-medium text-neutral-900">{formatMoney(invoice.tax_minor, invoice.currency)}</span>
                </div>
              )}
              {(invoice.wht_minor || 0) > 0 && (
                <>
                  <div className="flex justify-between font-semibold text-neutral-800 pt-1 border-t">
                    <span>Gross Total:</span>
                    <span>{formatMoney(invoice.total_minor, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Less WHT ({invoice.wht_rate_percent}%):</span>
                    <span>-{formatMoney(invoice.wht_minor || 0, invoice.currency)}</span>
                  </div>
                  {invoice.wht_credit_note_number && (
                    <div className="text-[10px] text-neutral-400 italic text-right">
                      Credit Note: {invoice.wht_credit_note_number}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t">
                <span>{(invoice.wht_minor || 0) > 0 ? 'Net Payable:' : 'Total Due:'}</span>
                <span className="text-emerald-700 font-mono font-bold">
                  {formatMoney(invoice.net_payable_minor || invoice.total_minor, invoice.currency)}
                </span>
              </div>

              {/* Milestone Deposit Callout (US-INT-02) */}
              {(invoice.deposit_amount_minor || 0) > 0 && (
                <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex justify-between font-bold text-xs">
                    <span>Deposit Due Today:</span>
                    <span>{formatMoney(invoice.deposit_amount_minor || 0, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>Remaining Balance:</span>
                    <span>
                      {formatMoney(
                        Math.max(0, (invoice.net_payable_minor || invoice.total_minor) - (invoice.deposit_amount_minor || 0)),
                        invoice.currency
                      )}
                    </span>
                  </div>
                  {invoice.deposit_due_date && (
                    <div className="text-[10px] text-emerald-600">
                      Deposit Due: {invoice.deposit_due_date}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 1-Tap Copy Payout Details (US-CLV-02) */}
          <div className="bg-neutral-50 rounded-xl p-5 border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-neutral-900">How to Pay in {invoice.currency}</h3>
              </div>
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">1-Tap Copy</span>
            </div>

            {payment_profile ? (
              <div className="space-y-3 text-xs">
                {payment_profile.bank_name && (
                  <div className="space-y-2 bg-white p-3.5 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Bank Name</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-800">{payment_profile.bank_name}</span>
                        <button
                          onClick={() => handleCopy(payment_profile.bank_name || '', 'bank', 'Bank Name')}
                          className="text-neutral-400 hover:text-neutral-700 p-1"
                          title="Copy Bank Name"
                        >
                          {copiedKey === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-neutral-50/70 p-2 rounded-md">
                      <span className="text-neutral-600 font-medium">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-neutral-900 tracking-wide">{payment_profile.account_number}</span>
                        <button
                          onClick={() => handleCopy(payment_profile.account_number || '', 'acc', 'Account Number')}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 inline-flex items-center gap-1 transition"
                        >
                          {copiedKey === 'acc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                    </div>

                    {payment_profile.account_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Account Name</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-neutral-800">{payment_profile.account_name}</span>
                          <button
                            onClick={() => handleCopy(payment_profile.account_name || '', 'accname', 'Account Name')}
                            className="text-neutral-400 hover:text-neutral-700 p-1"
                          >
                            {copiedKey === 'accname' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {payment_profile.routing_number && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Routing / Sort Code</span>
                        <span className="font-mono text-neutral-800">{payment_profile.routing_number}</span>
                      </div>
                    )}
                  </div>
                )}

                {payment_profile.payment_link && (
                  <div className="bg-white p-3.5 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-800 block">Digital Payment Link</span>
                      <span className="text-neutral-500 text-[11px]">Pay directly via Wise, Stripe, or Card</span>
                    </div>
                    <a
                      href={payment_profile.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
                    >
                      Pay Online <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {payment_profile.mobile_money_number && (
                  <div className="bg-white p-3.5 rounded-lg border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-800 block">Mobile Money</span>
                      <span className="font-mono text-neutral-700">{payment_profile.mobile_money_number}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(payment_profile.mobile_money_number || '', 'momo', 'Mobile Money Number')}
                      className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                )}

                {payment_profile.instructions && (
                  <p className="text-neutral-500 italic text-[11px]">
                    Instructions: {payment_profile.instructions}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">
                Please contact the freelancer directly for payment details.
              </p>
            )}

            {invoice.notes && (
              <div className="pt-2 border-t text-[11px] text-neutral-500">
                <strong>Note:</strong> {invoice.notes}
              </div>
            )}
          </div>

          {/* Payment Actions (US-INT-01, US-CLM-01) */}
          {!isPaid && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {invoice.direct_checkout_enabled && (
                <button
                  type="button"
                  disabled={checkingOut}
                  onClick={handleDirectCheckout}
                  className="w-full sm:w-auto px-7 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-md transition inline-flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading Checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Pay with Card / Transfer
                    </>
                  )}
                </button>
              )}

              {isClaimed ? (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-50 text-blue-800 rounded-xl font-semibold text-xs border border-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Claim Pending Verification by Freelancer</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsPaidModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {isRejected
                    ? 'Resubmit Payment Proof'
                    : isPartiallyPaid
                    ? 'I’ve Paid Remaining Balance'
                    : 'I’ve Paid via Bank Transfer'}
                </button>
              )}
            </div>
          )}

          {/* Question & Comment Thread (US-CLV-03) */}
          <div className="border-t pt-6 space-y-4">
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

            <form onSubmit={handleAddComment} className="space-y-2 text-xs">
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Your Name (e.g. Tunde)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                />
                <input
                  type="text"
                  required
                  placeholder="Ask a question or request clarification..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                />
              </div>
              <button
                type="submit"
                disabled={submittingComment}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                {submittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Question
              </button>
            </form>
          </div>
        </div>

        {/* Viral Acquisition Footer (US-CLV-04) */}
        {show_viral_footer && (
          <div className="pt-4 pb-2 text-center">
            <a
              href={viral_footer_link || 'https://bagg.africa?utm_source=invoice_footer&utm_medium=referral'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition"
            >
              <span>Powered by</span>
              <span className="font-bold text-neutral-900 tracking-tight">bagg.</span>
              <span>— Invoicing & get-paid workspace for African creators</span>
            </a>
          </div>
        )}

        {/* Abuse Reporting Link (US-SEC-02) */}
        <div className="pt-1 pb-8 text-center">
          <button
            type="button"
            onClick={() => setShowAbuseModal(true)}
            className="text-[11px] text-neutral-400 hover:text-red-600 underline transition"
          >
            Report this invoice as suspicious or fraudulent
          </button>
        </div>

        {/* Claim Modal (US-CLM-01) */}
        {isPaidModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Notify Freelancer of Payment</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Let {data.invoice.client_name ? 'the freelancer' : 'them'} know funds have been sent so they can verify and issue your receipt.
                </p>
              </div>

              {claimError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {claimError}
                </div>
              )}

              <form onSubmit={handleClaimPayment} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Amount Paid ({data.invoice.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Date Transferred</label>
                  <input
                    type="date"
                    required
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    disabled={submittingClaim}
                    onClick={() => setIsPaidModalOpen(false)}
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
          </div>
        )}

        {/* Abuse Report Modal (US-SEC-02) */}
        {showAbuseModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-neutral-900">Report Suspicious Invoice</h3>
                </div>
                <button
                  onClick={() => setShowAbuseModal(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {abuseSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Thank you. Your report has been submitted. Our security team will inspect this invoice promptly.</span>
                </div>
              ) : (
                <form onSubmit={handleReportAbuse} className="space-y-3.5 text-xs">
                  <p className="text-neutral-500">
                    If this invoice appears to be impersonation, phishing, or an unauthorized charge, report it below. We take platform integrity seriously.
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
                      rows={3}
                      placeholder="Describe why you believe this invoice is suspicious or fraudulent..."
                      value={abuseReason}
                      onChange={(e) => setAbuseReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-neutral-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">Your Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        value={abuseEmail}
                        onChange={(e) => setAbuseEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-neutral-500 text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">Your Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={abuseName}
                        onChange={(e) => setAbuseName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-neutral-500 text-neutral-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAbuseModal(false)}
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
          </div>
        )}
      </div>
    </div>
  );
}
