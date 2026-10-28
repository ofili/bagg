'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Copy, ExternalLink, FileText, Loader2, ReceiptText, Share2, X } from 'lucide-react';
import { InvoiceDocument } from '@/components/invoice';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import { StatusPill, StatusTimeline, type StatusEvent } from '@/components/status';
import { Button, Card, Dialog, Field, Input, buttonStyles, inputStyles } from '@/components/ui';
import { cleanAmount, toMinor } from '@/lib/amount';
import { formatDate } from '@/lib/date';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PaymentClaim {
  id: string;
  amount_minor: number;
  payment_date: string;
  reference?: string | null;
  proof_file_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string | null;
  client_email?: string | null;
  currency: string;
  status: string;
  user_facing_status?: string | null;
  remaining_minor?: number;
  issue_date: string;
  due_date: string;
  items: Array<{
    id: string;
    position?: number;
    description: string;
    quantity: number;
    unit_price_minor: number;
    total_minor: number;
  }>;
  subtotal_minor: number;
  discount_minor: number;
  tax_rate_percent?: number;
  tax_minor: number;
  total_minor: number;
  wht_minor?: number;
  net_payable_minor?: number;
  amount_paid_minor: number;
  notes?: string | null;
  share_token?: string | null;
  latest_claim?: PaymentClaim | null;
  latest_receipt?: {
    id: string;
    receipt_number: string;
    amount_paid_minor: number;
    balance_remaining_minor?: number;
    payment_date?: string;
    payment_method?: string;
    reference?: string | null;
    confirmation_source?: string;
    provider?: string | null;
    verification_code?: string;
    share_token?: string | null;
  } | null;
  created_at: string;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'manual', label: 'Other' },
];

const todayIso = () => new Date().toISOString().split('T')[0];

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  /** The invoice could not be loaded at all. */
  const [error, setError] = useState<string | null>(null);
  /** An action failed; the invoice itself is still fine. */
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingClaimId, setConfirmingClaimId] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invoiceRes, eventsRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE}/invoices/${invoiceId}`, { credentials: 'include' }),
        fetch(`${API_BASE}/invoices/${invoiceId}/status-events`, { credentials: 'include' }),
        fetch(`${API_BASE}/invoices/${invoiceId}/claims`, { credentials: 'include' }),
      ]);

      if (!invoiceRes.ok) {
        const err = await invoiceRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Invoice could not be loaded');
      }

      setInvoice(await invoiceRes.json());
      setEvents(eventsRes.ok ? await eventsRes.json() : []);
      setClaims(claimsRes.ok ? await claimsRes.json() : []);
    } catch (err: any) {
      setError(err.message || 'Invoice could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const shareUrl = () => `${window.location.origin}/i/${invoice?.share_token}`;

  const copyShareLink = async () => {
    if (!invoice?.share_token) return;
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Could not copy the link. Open the client view and copy it from the address bar.');
    }
  };

  const openReceiptModal = () => {
    if (!invoice) return;
    const payable = invoice.net_payable_minor || invoice.total_minor;
    setAmount((Math.max(0, payable - invoice.amount_paid_minor) / 100).toFixed(2));
    setPaymentDate(todayIso());
    setPaymentMethod('bank_transfer');
    setReference('');
    setConfirmed(false);
    setFormError(null);
    setShowReceiptModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setFormError('Confirm that the funds have arrived before recording this payment.');
      return;
    }
    const amountMinor = toMinor(amount);
    if (amountMinor <= 0) {
      setFormError('Enter the amount you received.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const res = await fetch(`${API_BASE}/receipts/invoice/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount_paid_minor: amountMinor,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
          confirm_received: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to record payment');
      }

      setShowReceiptModal(false);
      await loadInvoice();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClaim = async (claim: PaymentClaim) => {
    try {
      setConfirmingClaimId(claim.id);
      setActionError(null);
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/claims/${claim.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to confirm claim');
      }
      await loadInvoice();
    } catch (err: any) {
      // A failed action must not replace the whole page with "Invoice unavailable"
      setActionError(err.message || 'Failed to confirm claim');
    } finally {
      setConfirmingClaimId(null);
    }
  };

  const handleSendInvoice = async () => {
  if (!invoice) return;

  try {
    setSendingInvoice(true);
    setActionError(null);

    // A draft must be finalized first.
    if (invoice.status === 'draft') {
      const finalizeRes = await fetch(
        `${API_BASE}/invoices/${invoice.id}/finalize`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}));
        throw new Error(
          err.detail || 'Could not finalize this invoice.',
        );
      }
    }

    // Finalization must succeed before the send request runs.
    const sendRes = await fetch(
      `${API_BASE}/invoices/${invoice.id}/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ send_email: true }),
      },
    );

    const result = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok) {
      throw new Error(result.detail || 'Could not send this invoice.');
    }

    // The API may mark the invoice sent even if email delivery fails.
    // Keep the returned message so the user knows what happened.
    if (result.message) {
      setActionError(
        result.email_sent
          ? null
          : result.message,
      );
    }

    await loadInvoice();
  } catch (err: unknown) {
    setActionError(
      err instanceof Error
        ? err.message
        : 'Could not finalize and send this invoice.',
    );
  } finally {
    setSendingInvoice(false);
  }
};

  if (loading && !invoice) {
    return (
      <div role="status" className="flex min-h-[50vh] items-center justify-center text-text-muted">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
        <span className="sr-only">Loading invoice</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card zone="calm" className="mx-auto max-w-lg space-y-3 p-8 text-center">
          <AlertCircle aria-hidden className="mx-auto h-9 w-9" />
          <h1 className="text-title">invoice unavailable</h1>
          <p className="text-body text-text-soft">{error || 'Invoice not found.'}</p>
          <Link href="/invoices" className={buttonStyles({ variant: 'outline', zone: 'calm' })}>
            Back to invoices
          </Link>
        </Card>
      </div>
    );
  }

  const netPayable = invoice.net_payable_minor || invoice.total_minor;
  const balanceMinor = Math.max(0, netPayable - invoice.amount_paid_minor);
  const pendingClaims = claims.filter((claim) => claim.status === 'pending');
  const canRecordPayment = !['paid', 'cancelled'].includes(invoice.status);
  const whatsappHref = invoice.share_token
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${invoice.client_name || 'there'}, here is invoice ${invoice.invoice_number}: ${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/i/${invoice.share_token}`,
      )}`
    : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/invoices" className={buttonStyles({ variant: 'link' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" /> All invoices
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title-l sm:text-display">{invoice.invoice_number}</h1>
            <StatusPill
              status={invoice.status}
              labelOverride={invoice.user_facing_status ?? undefined}
              subLabel={
                ['issued', 'sent', 'viewed'].includes(invoice.status)
                  ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
                  : undefined
              }
            />
          </div>
          <p className="text-body text-text-soft">
            {invoice.client_name || 'Client'} · Due {formatDate(invoice.due_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {['draft', 'issued', 'sent', 'viewed'].includes(invoice.status) && (
            <Button
              zone="calm"
              loading={sendingInvoice}
              onClick={handleSendInvoice}
            >
              {invoice.status === 'draft'
                ? 'Finalize & send invoice'
                : invoice.status === 'issued'
                  ? 'Send invoice'
                  : 'Send invoice again'}
            </Button>
          )}
          {invoice.share_token && invoice.status !== 'draft' && (
            <>
              <Button variant="outline" zone="calm" onClick={copyShareLink}>
                {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Link
                href={`/i/${invoice.share_token}`}
                target="_blank"
                className={buttonStyles({ variant: 'outline', zone: 'calm' })}
              >
                <ExternalLink aria-hidden className="h-4 w-4" /> Client view
              </Link>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'outline', zone: 'calm' })}
                >
                  <Share2 aria-hidden className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </>
          )}
          {canRecordPayment && (
            <Button
              zone="calm"
              variant={pendingClaims.length > 0 ? 'outline' : 'primary'}
              onClick={openReceiptModal}
            >
              <ReceiptText aria-hidden className="h-4 w-4" /> Record payment
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
        >
          <span className="pt-2">{actionError}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setActionError(null)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {pendingClaims.length > 0 && (
            <Card zone="calm" tone="peach" className="space-y-3">
              <div>
                <h2 className="text-heading">payments waiting for you</h2>
                <p className="text-body text-text-soft">
                  Your client says they paid. Check your bank or mobile money account before you confirm.
                </p>
              </div>
              <ul className="space-y-2">
                {pendingClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className="flex flex-col gap-3 rounded-row border border-line-subtle bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Money amountMinor={claim.amount_minor} currency={invoice.currency} className="text-amount-s" />
                      <p className="text-caption text-text-muted">
                        Claimed {formatDate(claim.payment_date)}
                        {claim.reference ? ` · Ref ${claim.reference}` : ''}
                      </p>
                    </div>
                    <Button
                      zone="calm"
                      loading={confirmingClaimId === claim.id}
                      onClick={() => handleConfirmClaim(claim)}
                    >
                      <CheckCircle2 aria-hidden className="h-4 w-4" /> Confirm funds received
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <InvoiceDocument
            variant="issuer"
            invoice={{
              ...invoice,
              tax_rate_percent: invoice.tax_rate_percent ?? 0,
              remaining_minor: invoice.remaining_minor,
            }}
          />
        </div>

        <aside className="space-y-6">
          <Card zone="calm" className="space-y-4">
            <h2 className="text-heading">status history</h2>
            <StatusTimeline events={events} />
          </Card>

          {invoice.latest_receipt?.share_token && (
            <Link
              href={`/r/${invoice.latest_receipt.share_token}`}
              className={buttonStyles({ variant: 'outline', zone: 'calm', fullWidth: true })}
            >
              <FileText aria-hidden className="h-4 w-4" /> Official receipt
            </Link>
          )}

          <Card zone="calm" className="space-y-3">
            <h2 className="text-heading">payment summary</h2>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Issued</dt>
                <dd className="font-medium">{formatDate(invoice.issue_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Due</dt>
                <dd className="font-medium">{formatDate(invoice.due_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Paid</dt>
                <dd>
                  <Money amountMinor={invoice.amount_paid_minor} currency={invoice.currency} hideCurrencyCode />
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-extrabold">Outstanding</dt>
                <dd>
                  <Money amountMinor={balanceMinor} currency={invoice.currency} hideCurrencyCode />
                </dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>

      <Dialog
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="record a payment you received"
        className="max-h-[90dvh] overflow-y-auto"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-body text-text-soft">
            Only record this after the funds have arrived. It issues an official receipt and updates the invoice.
          </p>

          <MoneyInput
            label="Amount received"
            currency={invoice.currency}
            value={amount}
            onChange={(v) => setAmount(cleanAmount(v, amount))}
            hint={`Outstanding balance: ${(balanceMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${invoice.currency}`}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payment date">
              {(a) => <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required {...a} />}
            </Field>
            <Field label="Method">
              {(a) => (
                <select className={inputStyles} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} {...a}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <Field label="Reference (optional)" hint="Bank session ID or transfer reference.">
            {(a) => <Input type="text" value={reference} onChange={(e) => setReference(e.target.value)} {...a} />}
          </Field>

          <label className="flex min-h-11 items-start gap-3 rounded-row bg-peach p-3 text-body">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--bagg-mango)]"
            />
            <span>I have checked that these funds arrived in my account.</span>
          </label>

          {formError && (
            <p role="alert" className="text-body font-medium text-danger dark:text-[#FFB3A8]">
              {formError}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="outline" zone="calm" onClick={() => setShowReceiptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" zone="calm" loading={saving}>
              Confirm payment received
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
