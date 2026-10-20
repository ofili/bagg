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
  Landmark
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

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    client_name?: string;
    currency: string;
    issue_date: string;
    due_date: string;
    items: LineItem[];
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    notes?: string;
    version: number;
    share_token: string;
  };
  payment_profile?: PaymentProfile | null;
  is_revised: boolean;
  revision_banner?: string | null;
}

export default function PublicClientInvoiceView() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ author: string; text: string }>>([]);

  useEffect(() => {
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
  }, [token]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleClaimPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setHasClaimed(true);
    setIsPaidModalOpen(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments([...comments, { author: 'Client', text: commentText.trim() }]);
    setCommentText('');
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

  const { invoice, payment_profile, is_revised, revision_banner } = data;

  return (
    <div className="min-h-screen bg-neutral-100 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Revision Banner (US-DEL-05) */}
        {is_revised && revision_banner && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-900 text-xs font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{revision_banner}</span>
          </div>
        )}

        {/* Status Notification if Payment Claimed */}
        {hasClaimed && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Payment Claim Received!</span> We have notified the freelancer to verify your payment.
            </div>
          </div>
        )}

        {/* Invoice Card */}
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
              <thead className="border-b text-neutral-500 font-medium">
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

            {/* Calculations Breakdown */}
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
              <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t">
                <span>Total Due:</span>
                <span className="text-emerald-700">{formatMoney(invoice.total_minor, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions (US-CLV-02, US-PAY-01) */}
          <div className="bg-neutral-50 rounded-xl p-5 border space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-neutral-900">How to Pay ({invoice.currency})</h3>
            </div>

            {payment_profile ? (
              <div className="space-y-3 text-xs">
                {payment_profile.bank_name && (
                  <div className="space-y-1.5 bg-white p-3.5 rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Bank Name</span>
                      <span className="font-semibold text-neutral-800">{payment_profile.bank_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Account Number</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-neutral-900">{payment_profile.account_number}</span>
                        <button
                          onClick={() => handleCopy(payment_profile.account_number || '', 'acc')}
                          className="text-neutral-400 hover:text-neutral-700 p-1"
                        >
                          {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {payment_profile.account_name && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Account Name</span>
                        <span className="font-medium text-neutral-800">{payment_profile.account_name}</span>
                      </div>
                    )}
                    {payment_profile.routing_number && (
                      <div className="flex justify-between">
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

          {/* Action Button: I've Paid */}
          {!hasClaimed && (
            <div className="text-center pt-2">
              <button
                onClick={() => setIsPaidModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
              >
                I&apos;ve Paid This Invoice
              </button>
            </div>
          )}
        </div>

        {/* Claim Modal */}
        {isPaidModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
              <h3 className="font-bold text-base text-neutral-900">Notify Freelancer of Payment</h3>
              <form onSubmit={handleClaimPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-neutral-600 mb-1">Transfer Reference / Note</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank session ID or transfer description"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsPaidModalOpen(false)}
                    className="px-3 py-1.5 border rounded-lg text-neutral-600 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    Confirm Payment Sent
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
