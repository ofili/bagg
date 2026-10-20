'use client';

import { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';

export default function PublicClientInvoiceView() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ author: string; text: string }>>([]);

  // Mock invoice matching PRD specs
  const invoice = {
    invoice_number: 'INV-0001',
    business_name: 'Studio Bagg Creative Ltd',
    issue_date: 'Oct 15, 2026',
    due_date: 'Oct 29, 2026',
    currency: 'NGN' as const,
    items: [
      { id: '1', description: 'Brand Identity & Visual System', quantity: 1, unit_price_minor: 25000000, total_minor: 25000000 },
      { id: '2', description: 'Social Media Templates (5 custom layouts)', quantity: 5, unit_price_minor: 3000000, total_minor: 15000000 },
    ],
    subtotal_minor: 40000000,
    discount_minor: 2000000,
    tax_percent: 7.5,
    tax_minor: 2850000,
    total_minor: 40850000,
    notes: 'Thank you for your business! Please use your invoice number as the payment reference.',
    payment_profile: {
      bank_name: 'Guaranty Trust Bank (GTBank)',
      account_name: 'Studio Bagg Creative Ltd',
      account_number: '0123456789',
      instructions: 'Please transfer to the account above and click "I\'ve Paid" below with your reference.',
    },
  };

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

  return (
    <div className="min-h-screen bg-neutral-100 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
              <h1 className="text-xl font-bold text-neutral-900 mt-1">{invoice.business_name}</h1>
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-black text-neutral-900">{invoice.invoice_number}</div>
              <div className="text-xs text-neutral-500 mt-1">Due {invoice.due_date}</div>
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
              <tbody className="divide-y divide-neutral-100">
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
            <div className="mt-4 pt-4 border-t space-y-2 text-sm text-neutral-600 max-w-xs ml-auto">
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
              <div className="flex justify-between">
                <span>VAT ({invoice.tax_percent}%):</span>
                <span className="font-medium text-neutral-900">{formatMoney(invoice.tax_minor, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t">
                <span>Total Due:</span>
                <span className="text-emerald-700">{formatMoney(invoice.total_minor, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions Box */}
          <div className="bg-neutral-50 border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>How to Pay in {invoice.currency}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border rounded-lg">
                <span className="text-neutral-500 block mb-0.5">Bank Name</span>
                <span className="font-semibold text-neutral-800">{invoice.payment_profile.bank_name}</span>
              </div>

              <div className="p-3 bg-white border rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block mb-0.5">Account Number</span>
                  <span className="font-bold text-neutral-900 tracking-wide">{invoice.payment_profile.account_number}</span>
                </div>
                <button
                  onClick={() => handleCopy(invoice.payment_profile.account_number, 'acc')}
                  className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 transition"
                  title="Copy Account Number"
                >
                  {copiedKey === 'acc' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 bg-white border rounded-lg sm:col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block mb-0.5">Account Name</span>
                  <span className="font-semibold text-neutral-800">{invoice.payment_profile.account_name}</span>
                </div>
                <button
                  onClick={() => handleCopy(invoice.payment_profile.account_name, 'name')}
                  className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 transition"
                  title="Copy Account Name"
                >
                  {copiedKey === 'name' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 italic">
              {invoice.payment_profile.instructions}
            </p>

            {/* "I've Paid" Action Button */}
            {!hasClaimed ? (
              <button
                onClick={() => setIsPaidModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> I Have Paid This Invoice
              </button>
            ) : (
              <div className="text-center py-2 text-xs font-semibold text-emerald-700 bg-emerald-100/50 rounded-lg">
                ✓ Payment claim recorded. Freelancer will issue your official receipt.
              </div>
            )}
          </div>

          {/* Line-item / Invoice Questions */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <MessageSquare className="w-3.5 h-3.5" /> Have a question about this invoice?
            </div>

            {comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((c, i) => (
                  <div key={i} className="text-xs p-3 bg-neutral-50 border rounded-lg">
                    <span className="font-semibold text-neutral-800">{c.author}: </span>
                    <span className="text-neutral-600">{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about a line item or payment detail..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Bagg Viral Acquisition Footer */}
        <div className="text-center text-xs text-neutral-400">
          Powered by{' '}
          <a href="/" target="_blank" className="font-bold text-neutral-700 hover:underline">
            bagg.
          </a>{' '}
          — Invoicing and get-paid workspace for African creators.
        </div>
      </div>

      {/* "I've Paid" Submission Modal */}
      {isPaidModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-neutral-900">Confirm Your Payment</h3>
              <button onClick={() => setIsPaidModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleClaimPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Amount Transferred</label>
                <input
                  type="text"
                  readOnly
                  value={formatMoney(invoice.total_minor, invoice.currency)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank session ID or transfer remark"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Attach Proof of Payment (Optional)</label>
                <div className="border border-dashed rounded-lg p-4 text-center text-neutral-500 hover:bg-neutral-50 cursor-pointer">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-neutral-400" />
                  <span>Click to attach screenshot or PDF receipt</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaidModalOpen(false)}
                  className="w-1/2 py-2.5 border rounded-lg font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                >
                  Submit Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
