'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowsClockwise,
  ArrowSquareOut,
  ArrowUUpLeft,
  Bell,
  ChatCircle,
  Check,
  CheckCircle,
  CircleNotch,
  ClockCounterClockwise,
  Copy,
  DownloadSimple,
  FileText,
  Pencil,
  Receipt,
  Scroll,
  ShareNetwork,
  WarningCircle,
  X,
  XCircle,
} from '@phosphor-icons/react';
import { DocumentComments } from "@/components/comments/DocumentComments";
import { InvoiceDocument, LineItemsEditor, type LineItem } from '@/components/invoice';
import { InvoiceMobileSummary } from '@/components/mobile/InvoiceMobileSummary';
import { InvoiceActionBar } from '@/components/mobile/InvoiceActionBar';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import {
  StatusPill,
  StatusTimeline,
  type StatusEvent,
} from '@/components/status';
import {
  BaggSelect,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  buttonStyles,
} from '@/components/ui';
import { useCurrentBreadcrumb } from '@/components/navigation/BreadcrumbContext';
import { cleanAmount, toMinor } from '@/lib/amount';
import { formatDate } from '@/lib/date';

const API_BASE = '/api';


interface InvoiceRevision {
  id: string;
  invoice_id: string;
  version: number;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  wht_minor?: number;
  total_minor: number;
  items_snapshot: Array<{
    description: string;
    quantity: number;
    unit_price_minor: number;
    total_minor?: number;
  }>;
  reason?: string | null;
  created_at: string;
}

interface ReminderJob {
  id: string;
  invoice_id: string;
  reminder_type: string;
  channel: string;
  scheduled_for: string;
  status: string;
  sent_at?: string | null;
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
  created_at: string;
}

interface InvoiceDetail {
  id: string; // Internal route/relationship ID; do not display as a reference.
  bagg_reference: string;
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
  wht_credit_note_number?: string | null;
  version?: number;
  share_token?: string | null;
  recurring_schedule_id?: string | null;
  recurring_label?: string | null;
  recurring_period_key?: string | null;
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

interface InvoiceReceipt {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string;
  client_name?: string | null;
  currency: string;
  amount_paid_minor: number;
  balance_remaining_minor: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
  is_verified: boolean;
  share_url?: string | null;
  created_at: string;
}

interface InvoiceSendResult {
  detail?: string;
  message?: string;
  email_sent?: boolean;
  recipient_email?: string | null;
  whatsapp_url?: string | null;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'manual', label: 'Other' },
];

const todayIso = () => new Date().toISOString().split('T')[0];

async function readError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const result = await response.json().catch(() => ({}));
  return new Error(result.detail || result.message || fallback);
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [receipts, setReceipts] = useState<InvoiceReceipt[]>([]);
const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** The invoice could not be loaded at all. */
  const [error, setError] = useState<string | null>(null);
  /** An action failed; the invoice itself is still fine. */
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingClaimId, setConfirmingClaimId] = useState<string | null>(
    null,
  );

  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryEmail, setDeliveryEmail] = useState('');

  const [revisions, setRevisions] = useState<InvoiceRevision[]>([]);
  const [reminders, setReminders] = useState<ReminderJob[]>([]);

  // Recall dialog state
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [recallReason, setRecallReason] = useState('');
  const [recalling, setRecalling] = useState(false);

  // WHT Credit Note dialog state
  const [showWhtDialog, setShowWhtDialog] = useState(false);
  const [whtCreditNoteNumber, setWhtCreditNoteNumber] = useState('');
  const [savingWht, setSavingWht] = useState(false);

  // Reject Claim dialog state
  const [rejectingClaim, setRejectingClaim] = useState<PaymentClaim | null>(null);
  const [rejectClaimReason, setRejectClaimReason] = useState('');
  const [savingClaimReject, setSavingClaimReject] = useState(false);

  // WhatsApp Nudge state
  const [nudgingWhatsApp, setNudgingWhatsApp] = useState(false);
  const [regeneratingLink, setRegeneratingLink] = useState(false);


  const { setCurrentLabel } = useCurrentBreadcrumb();

  useEffect(() => {
    setCurrentLabel(invoice?.invoice_number ?? null);

    return () => setCurrentLabel(null);
  }, [invoice?.invoice_number, setCurrentLabel]);
  
  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invoiceRes, eventsRes, claimsRes, receiptsRes, revisionsRes, remindersRes] =
        await Promise.all([
          fetch(`${API_BASE}/invoices/${invoiceId}`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${API_BASE}/invoices/${invoiceId}/status-events`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${API_BASE}/invoices/${invoiceId}/claims`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(
            `${API_BASE}/receipts?invoice_id=${encodeURIComponent(invoiceId)}`,
            {
              credentials: 'include',
              cache: 'no-store',
            },
          ),
          fetch(`${API_BASE}/invoices/${invoiceId}/revisions`, {
            credentials: 'include',
            cache: 'no-store',
          }).catch(() => null),
          fetch(`${API_BASE}/reminders/invoices/${invoiceId}`, {
            credentials: 'include',
            cache: 'no-store',
          }).catch(() => null),
        ]);

      if (!invoiceRes.ok) {
        throw await readError(invoiceRes, 'Invoice could not be loaded.');
      }

      // Consume each response body only once.
      const invoiceData = (await invoiceRes.json()) as InvoiceDetail;
      setInvoice(invoiceData);

      setEvents(
        eventsRes.ok ? ((await eventsRes.json()) as StatusEvent[]) : [],
      );
      setClaims(
        claimsRes.ok ? ((await claimsRes.json()) as PaymentClaim[]) : [],
      );

      if (revisionsRes && revisionsRes.ok) {
        setRevisions(((await revisionsRes.json()) as InvoiceRevision[]) || []);
      } else {
        setRevisions([]);
      }

      if (remindersRes && remindersRes.ok) {
        setReminders(((await remindersRes.json()) as ReminderJob[]) || []);
      } else {
        setReminders([]);
      }

      
      if (receiptsRes.ok) {
        try {
          const receiptsData: unknown = await receiptsRes.json();

          const receiptItems = Array.isArray(receiptsData)
            ? receiptsData
            : receiptsData !== null &&
                typeof receiptsData === 'object' &&
                'items' in receiptsData &&
                Array.isArray(receiptsData.items)
              ? receiptsData.items
              : null;

          if (receiptItems === null) {
            throw new Error('Unexpected receipts API response.');
          }

          setReceipts(receiptItems as InvoiceReceipt[]);
          setReceiptsError(null);
        } catch {
          setReceipts([]);
          setReceiptsError('Receipt history could not be loaded.');
        }
      } else {
        setReceipts([]);
        setReceiptsError('Receipt history could not be loaded.');
      }

    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invoice could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (invoiceId) void loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const shareUrl = () =>
    `${window.location.origin}/i/${invoice?.share_token}`;

  const copyShareLink = async () => {
    if (!invoice?.share_token) return;

    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError(
        'Could not copy the link. Open the client view and copy it from the address bar.',
      );
    }
  };

  const openReceiptModal = () => {
    if (!invoice) return;

    const payable = invoice.net_payable_minor || invoice.total_minor;

    setAmount(
      (Math.max(0, payable - invoice.amount_paid_minor) / 100).toFixed(2),
    );
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
      setFormError(
        'Confirm that the funds have arrived before recording this payment.',
      );
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
        throw await readError(res, 'Failed to record payment.');
      }

      setShowReceiptModal(false);
      setActionNotice('Payment recorded successfully.');
      await loadInvoice();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to record payment.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClaim = async (claim: PaymentClaim) => {
    try {
      setConfirmingClaimId(claim.id);
      setActionError(null);
      setActionNotice(null);

      const res = await fetch(
        `${API_BASE}/invoices/${invoiceId}/claims/${claim.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        throw await readError(res, 'Failed to confirm claim.');
      }

      setActionNotice('Payment claim confirmed.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to confirm claim.',
      );
    } finally {
      setConfirmingClaimId(null);
    }
  };

  /**
   * Finalization only: issue the invoice without sending it to the client.
   */

  const handleRecallInvoice = async () => {
    if (!invoice || recalling) return;
    try {
      setRecalling(true);
      setActionError(null);
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: recallReason.trim() || undefined }),
      });
      if (!res.ok) throw await readError(res, 'Could not recall invoice.');
      setShowRecallDialog(false);
      setRecallReason('');
      setActionNotice('Invoice recalled successfully and returned to draft.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not recall invoice.');
    } finally {
      setRecalling(false);
    }
  };

  const handleUpdateWht = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || savingWht || !whtCreditNoteNumber.trim()) return;
    try {
      setSavingWht(true);
      setActionError(null);
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/wht`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wht_credit_note_number: whtCreditNoteNumber.trim() }),
      });
      if (!res.ok) throw await readError(res, 'Could not update WHT credit note.');
      setShowWhtDialog(false);
      setActionNotice('WHT credit note number recorded.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not update WHT credit note.');
    } finally {
      setSavingWht(false);
    }
  };

  const handleRejectClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !rejectingClaim || savingClaimReject || !rejectClaimReason.trim()) return;
    try {
      setSavingClaimReject(true);
      setActionError(null);
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/claims/${rejectingClaim.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectClaimReason.trim() }),
      });
      if (!res.ok) throw await readError(res, 'Could not reject payment claim.');
      setRejectingClaim(null);
      setRejectClaimReason('');
      setActionNotice('Payment claim rejected.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not reject payment claim.');
    } finally {
      setSavingClaimReject(false);
    }
  };

  const handleWhatsAppNudge = async () => {
    if (!invoice || nudgingWhatsApp) return;
    try {
      setNudgingWhatsApp(true);
      setActionError(null);
      const res = await fetch(`${API_BASE}/reminders/invoices/${invoice.id}/nudge/whatsapp`, {
        credentials: 'include',
      });
      if (!res.ok) throw await readError(res, 'Could not generate WhatsApp reminder.');
      const data = await res.json();
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank');
        setActionNotice('WhatsApp reminder opened.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not generate WhatsApp reminder.');
    } finally {
      setNudgingWhatsApp(false);
    }
  };

  const handleRegenerateShareLink = async () => {
    if (!invoice || regeneratingLink) return;
    const ok = window.confirm('Regenerate public share link? Previous links shared with clients will stop working.');
    if (!ok) return;
    try {
      setRegeneratingLink(true);
      setActionError(null);
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/share-link/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await readError(res, 'Could not regenerate share link.');
      setActionNotice('New public share link generated.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not regenerate share link.');
    } finally {
      setRegeneratingLink(false);
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!invoice) return;

    try {
      setSendingInvoice(true);
      setActionError(null);
      setActionNotice(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/finalize`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw await readError(
          response,
          'Could not approve and issue this invoice.',
        );
      }

      setActionNotice(
        `Invoice ${invoice.invoice_number} approved and issued. It has not been sent to the client.`,
      );

      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not approve and issue this invoice.',
      );
    } finally {
      setSendingInvoice(false);
    }
  };

  /**
   * Open delivery separately, after the invoice has been issued.
   */
  const openInvoiceDelivery = () => {
    if (!invoice) return;

    setDeliveryEmail(invoice.client_email?.trim() || '');
    setActionError(null);
    setActionNotice(null);
    setShowDeliveryDialog(true);
  };

  useEffect(() => {
    if (!invoice) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('send') === '1' && invoice.status === 'issued') {
      openInvoiceDelivery();
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.status]);

  const closeDeliveryDialog = () => {
    if (sendingInvoice) return;
    setShowDeliveryDialog(false);
  };

  /**
   * Email: save a changed client address first, then request email delivery.
   * WhatsApp: use the URL returned by the API and let the user send the message.
   */
  const handleDeliverInvoice = async (method: 'email' | 'whatsapp') => {
    if (!invoice) return;

    const email = deliveryEmail.trim();

    if (method === 'email') {
      if (!email) {
        setActionError(
          'Enter the client’s email address, or choose WhatsApp.',
        );
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setActionError('Enter a valid email address.');
        return;
      }
    }

    // Open synchronously during the user gesture to reduce popup blocking.
    const whatsappTab =
      method === 'whatsapp' ? window.open('about:blank', '_blank') : null;

    try {
      setSendingInvoice(true);
      setActionError(null);
      setActionNotice(null);

      if (
        method === 'email' &&
        email !== (invoice.client_email || '').trim()
      ) {
        const clientResponse = await fetch(
          `${API_BASE}/clients/${invoice.client_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email }),
          },
        );

        if (!clientResponse.ok) {
          throw await readError(
            clientResponse,
            'Could not save the client email address.',
          );
        }
      }

      const sendResponse = await fetch(
        `${API_BASE}/invoices/${invoice.id}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            send_email: method === 'email',
          }),
        },
      );

      const result = (await sendResponse
        .json()
        .catch(() => ({}))) as InvoiceSendResult;

      if (!sendResponse.ok) {
        throw new Error(
          result.detail || result.message || 'Could not deliver this invoice.',
        );
      }

      if (method === 'email') {
        if (!result.email_sent) {
          throw new Error(
            result.message ||
              'The invoice was not emailed successfully. You can share it on WhatsApp instead.',
          );
        }

        setActionNotice(
          `Invoice ${invoice.invoice_number} emailed successfully to ${
            result.recipient_email || email
          }.`,
        );
      } else {
        if (!result.whatsapp_url) {
          whatsappTab?.close();

          throw new Error(
            result.message ||
              'The invoice was prepared, but a WhatsApp sharing link could not be created.',
          );
        }

        if (whatsappTab) {
          whatsappTab.location.href = result.whatsapp_url;
        } else {
          // Fallback when the browser blocks opening a new tab.
          window.location.href = result.whatsapp_url;
        }

        setActionNotice(
          'Invoice is ready to share on WhatsApp. Review the message and send it to the client.',
        );
      }

      setShowDeliveryDialog(false);
      await loadInvoice();
    } catch (err: unknown) {
      whatsappTab?.close();

      setActionError(
        err instanceof Error ? err.message : 'Could not deliver this invoice.',
      );
    } finally {
      setSendingInvoice(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div
        role="status"
        className="flex min-h-[50vh] items-center justify-center text-text-muted"
      >
        <CircleNotch aria-hidden className="h-6 w-6 animate-spin" />
        <span className="sr-only">Loading invoice</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card
          zone="calm"
          className="mx-auto max-w-lg space-y-3 p-8 text-center"
        >
          <WarningCircle aria-hidden className="mx-auto h-9 w-9" />
          <h1 className="text-title">invoice unavailable</h1>
          <p className="text-body text-text-soft">
            {error || 'Invoice not found.'}
          </p>
          <Link
            href="/invoices"
            className={buttonStyles({ variant: 'outline' })}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back to invoices
          </Link>
        </Card>
      </div>
    );
  }

  const netPayable = invoice.net_payable_minor || invoice.total_minor;
  const balanceMinor = Math.max(
    0,
    netPayable - invoice.amount_paid_minor,
  );
  const pendingClaims = claims.filter((claim) => claim.status === 'pending');
  const canRecordPayment = !['paid', 'cancelled'].includes(invoice.status);
  const canRecall =
    ['issued', 'sent', 'viewed', 'overdue'].includes(invoice.status) &&
    invoice.amount_paid_minor === 0 &&
    pendingClaims.length === 0;

  const whatsappHref = invoice.share_token
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${invoice.client_name || 'there'}, here is invoice ${invoice.invoice_number}: ${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/i/${invoice.share_token}`,
      )}`
    : undefined;

  const invoiceDoc = (
      <InvoiceDocument
          variant="issuer"
          invoice={{
            ...invoice,
            tax_rate_percent: invoice.tax_rate_percent ?? 0,
            remaining_minor: invoice.remaining_minor,
          }}
      />
  );

  return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-32 sm:p-6 sm:pb-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/invoices" className={buttonStyles({ variant: 'outline' })}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            All invoices
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title-l sm:text-display">
              {invoice.invoice_number}
            </h1>
            <StatusPill
              status={invoice.status}
              labelOverride={invoice.user_facing_status ?? undefined}
              subLabel={
                ['issued', 'sent', 'viewed'].includes(invoice.status)
                  ? invoice.status.charAt(0).toUpperCase() +
                    invoice.status.slice(1)
                  : undefined
              }
            />
            {invoice.recurring_schedule_id && (
              <Link
                href={`/recurring-invoices/${invoice.recurring_schedule_id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-sun/40 px-2.5 py-0.5 text-caption font-bold text-ink hover:bg-sun transition-colors"
                title="View recurring schedule"
              >
                <ArrowsClockwise aria-hidden className="h-3.5 w-3.5" />
                <span>{invoice.recurring_label || 'Recurring'}</span>
              </Link>
            )}
          </div>

          <p className="hidden text-body text-text-soft sm:block">
            {invoice.client_name || 'Client'} · Due{' '}
            {formatDate(invoice.due_date)}
          </p>
        </div>

        <div className="hidden flex-wrap gap-3 sm:flex">
          {invoice.status === 'draft' && (
            <Button
              zone="calm"
              loading={sendingInvoice}
              onClick={handleFinalizeInvoice}
            >
              Approve & issue invoice
            </Button>
          )}

          {['issued', 'sent', 'viewed'].includes(invoice.status) && (
            <Button
              zone="calm"
              loading={sendingInvoice}
              onClick={openInvoiceDelivery}
            >
              {invoice.status === 'issued'
                ? 'Send invoice'
                : 'Send invoice again'}
            </Button>
          )}

          {invoice.share_token && invoice.status !== 'draft' && (
            <>
              <Button
                variant="outline"
                zone="calm"
                onClick={copyShareLink}
              >
                {copied ? (
                  <Check aria-hidden className="h-4 w-4" />
                ) : (
                  <Copy aria-hidden className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </Button>

              <Link
                href={`/i/${invoice.share_token}`}
                target="_blank"
                className={buttonStyles({
                  variant: 'outline',
                  zone: 'calm',
                })}
              >
                <ArrowSquareOut aria-hidden className="h-4 w-4" />
                Client view
              </Link>

              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({
                    variant: 'outline',
                    zone: 'calm',
                  })}
                >
                  <ShareNetwork aria-hidden className="h-4 w-4" />
                  WhatsApp
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
              <Receipt aria-hidden className="h-4 w-4" />
              Record payment
            </Button>
          )}

          {invoice.status !== 'draft' && (
            <a
              href={`${API_BASE}/invoices/${invoice.id}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({
                variant: 'outline',
                zone: 'calm',
              })}
            >
              <DownloadSimple aria-hidden className="h-4 w-4" />
              PDF
            </a>
          )}

          {['issued', 'sent', 'viewed', 'overdue', 'partially_paid', 'payment_claimed'].includes(invoice.status) && (
            <Button
              variant="outline"
              zone="calm"
              loading={nudgingWhatsApp}
              onClick={handleWhatsAppNudge}
            >
              <ChatCircle aria-hidden className="h-4 w-4" />
              Nudge
            </Button>
          )}

          {canRecall && (
            <Button
              variant="outline"
              zone="calm"
              onClick={() => setShowRecallDialog(true)}
            >
              <ArrowUUpLeft aria-hidden className="h-4 w-4" />
              Recall
            </Button>
          )}

          {((invoice.wht_minor || 0) > 0 || invoice.wht_credit_note_number) && (
            <Button
              variant="outline"
              zone="calm"
              onClick={() => {
                setWhtCreditNoteNumber(invoice.wht_credit_note_number || '');
                setShowWhtDialog(true);
              }}
            >
              <Scroll aria-hidden className="h-4 w-4" />
              {invoice.wht_credit_note_number ? 'WHT ref' : 'Record WHT'}
            </Button>
          )}

          {invoice.share_token && invoice.status !== 'draft' && (
            <Button
              variant="outline"
              zone="calm"
              loading={regeneratingLink}
              onClick={handleRegenerateShareLink}
              title="Generate a new public link"
            >
              <ArrowCounterClockwise aria-hidden className="h-4 w-4" />
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

      {actionNotice && (
        <div
          role="status"
          className="flex items-start justify-between gap-2 rounded-row bg-peach p-3 text-body"
        >
          <span className="pt-2">{actionNotice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setActionNotice(null)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
      )}

        <InvoiceMobileSummary
            clientName={invoice.client_name}
            dueDate={invoice.due_date}
            currency={invoice.currency}
            netPayableMinor={netPayable}
            paidMinor={invoice.amount_paid_minor}
            overdue={
                balanceMinor > 0 &&
                !['draft', 'paid', 'cancelled'].includes(invoice.status) &&
                invoice.due_date < new Date().toISOString().split('T')[0]
            }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {pendingClaims.length > 0 && (
            <Card zone="calm" tone="peach" className="space-y-3">
              <div>
                <h2 id="claims" className="scroll-mt-4 text-heading">payments waiting for you</h2>
                <p className="text-body text-text-soft">
                  Your client says they paid. Check your bank or mobile money
                  account before you confirm.
                </p>
              </div>

              <ul className="space-y-2">
                {pendingClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className="flex flex-col gap-3 rounded-row border border-line-subtle bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Money
                        amountMinor={claim.amount_minor}
                        currency={invoice.currency}
                        className="text-amount-s"
                      />
                      <p className="text-caption text-text-muted">
                        Claimed {formatDate(claim.payment_date)}
                        {claim.reference ? ` · Ref ${claim.reference}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        zone="calm"
                        onClick={() => {
                          setRejectingClaim(claim);
                          setRejectClaimReason('');
                        }}
                      >
                        <XCircle aria-hidden className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        zone="calm"
                        loading={confirmingClaimId === claim.id}
                        onClick={() => void handleConfirmClaim(claim)}
                      >
                        <CheckCircle aria-hidden className="h-4 w-4" />
                        Confirm funds
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <details className="rounded-card border-brut border-ink bg-surface sm:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 font-extrabold">
              View full invoice
            </summary>
            <div className="p-3">{invoiceDoc}</div>
          </details>
          <div className="hidden sm:block">{invoiceDoc}</div>

          <Card zone="calm" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-heading">receipts</h2>
                <p className="mt-1 text-body text-text-soft">
                  Issued receipts for payments recorded against this invoice.
                </p>
              </div>
              <span className="rounded-full bg-surface-tint px-3 py-1 text-caption font-bold">
                {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
              </span>
            </div>

            {receiptsError && (
              <p role="alert" className="text-body text-danger">
                {receiptsError}
              </p>
            )}

            {!receiptsError && receipts.length === 0 ? (
              <div className="rounded-row border border-dashed border-line-subtle p-5">
                <Receipt
                  aria-hidden
                  className="h-6 w-6 text-text-muted"
                />
                <p className="mt-2 font-semibold">No receipts issued yet</p>
                <p className="mt-1 text-body text-text-soft">
                  When a payment is recorded and a receipt is issued, it will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {receipts.map((receipt) => (
                  <li
                    key={receipt.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-row bg-peach">
                        <Receipt aria-hidden className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/receipts/${encodeURIComponent(receipt.id)}`}
                          className="font-bold underline-offset-4 hover:underline"
                        >
                          {receipt.receipt_number}
                        </Link>
                        <p className="mt-1 text-body text-text-soft">
                          {formatDate(receipt.payment_date)}
                          {' · '}
                          {receipt.payment_method.replaceAll('_', ' ')}
                        </p>
                        {receipt.reference && (
                          <p className="mt-1 break-all text-caption text-text-muted">
                            Ref: {receipt.reference}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <Money
                          amountMinor={receipt.amount_paid_minor}
                          currency={receipt.currency}
                          className="font-bold"
                        />
                        <p className="text-caption text-text-muted">
                          {receipt.is_verified ? 'Verified' : 'Unverified'}
                        </p>
                      </div>

                      <Link
                        href={`/receipts/${encodeURIComponent(receipt.id)}`}
                        className={buttonStyles({
                          variant: 'outline',
                          zone: 'calm',
                        })}
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          
          {revisions.length > 0 && (
            <Card zone="calm" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-heading">revision history</h2>
                  <p className="text-body text-text-soft">Prior snapshots of this invoice.</p>
                </div>
                <ClockCounterClockwise aria-hidden className="h-5 w-5 text-text-muted" />
              </div>
              <ul className="divide-y divide-line-subtle">
                {revisions.map((rev) => (
                  <li key={rev.id} className="py-3 text-body">
                    <div className="flex justify-between font-bold">
                      <span>Version {rev.version}</span>
                      <Money amountMinor={rev.total_minor} currency={invoice.currency} />
                    </div>
                    <p className="text-caption text-text-muted">
                      {formatDate(rev.created_at)}
                      {rev.reason ? ` · ${rev.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {reminders.length > 0 && (
            <Card zone="calm" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-heading">automated reminders</h2>
                  <p className="text-body text-text-soft">Scheduled and sent payment nudges.</p>
                </div>
                <Bell aria-hidden className="h-5 w-5 text-text-muted" />
              </div>
              <ul className="divide-y divide-line-subtle text-caption">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-bold">{r.reminder_type.replace('_', ' ')}</span>
                      <span className="ml-2 text-text-muted">{r.channel}</span>
                    </div>
                    <span className="rounded-full bg-surface-tint px-2 py-0.5 font-bold capitalize">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <DocumentComments
            documentType="invoice"
            documentId={invoice.id}
            documentNumber={invoice.invoice_number}
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
              className={buttonStyles({
                variant: 'outline',
                zone: 'calm',
                fullWidth: true,
              })}
            >
              <FileText aria-hidden className="h-4 w-4" />
              Official receipt
            </Link>
          )}

          <Card zone="calm" className="space-y-3">
            <h2 className="text-heading">payment summary</h2>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Issued</dt>
                <dd className="font-medium">
                  {formatDate(invoice.issue_date)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Due</dt>
                <dd className="font-medium">
                  {formatDate(invoice.due_date)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="text-text-soft">Paid</dt>
                <dd>
                  <Money
                    amountMinor={invoice.amount_paid_minor}
                    currency={invoice.currency}
                    hideCurrencyCode
                  />
                </dd>
              </div>

              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-extrabold">Outstanding</dt>
                <dd>
                  <Money
                    amountMinor={balanceMinor}
                    currency={invoice.currency}
                    hideCurrencyCode
                  />
                </dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>

      <InvoiceActionBar
            status={invoice.status}
            pendingClaims={pendingClaims.length}
            canRecordPayment={canRecordPayment}
            busy={sendingInvoice}
            onIssue={handleFinalizeInvoice}
            onSend={openInvoiceDelivery}
            onRecord={openReceiptModal}
            onReviewClaims={() =>
                document.getElementById('claims')?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  block: 'start',
                })
            }
            copied={copied}
            onCopy={copyShareLink}
            clientViewHref={invoice.share_token && invoice.status !== 'draft' ? `/i/${invoice.share_token}` : undefined}
            whatsappHref={invoice.share_token && invoice.status !== 'draft' ? whatsappHref : undefined}
            receiptHref={invoice.latest_receipt?.share_token ? `/r/${invoice.latest_receipt.share_token}` : undefined}
      />

        <Dialog
        open={showDeliveryDialog}
        onClose={closeDeliveryDialog}
        title={`Send invoice ${invoice.invoice_number}`}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            Choose how to share this issued invoice with{' '}
            <strong>{invoice.client_name || 'your client'}</strong>. Issuing
            an invoice does not send it automatically.
          </p>

          <Field
            label="Client email"
            hint={
              deliveryEmail.trim()
                ? 'A changed address will be saved to the client record before sending.'
                : 'No email address is recorded. Enter one here or use WhatsApp.'
            }
          >
            {(fieldProps) => (
              <Input
                type="email"
                autoComplete="email"
                placeholder="client@example.com"
                value={deliveryEmail}
                onChange={(event) => setDeliveryEmail(event.target.value)}
                {...fieldProps}
              />
            )}
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              zone="calm"
              disabled={sendingInvoice}
              onClick={closeDeliveryDialog}
            >
              Cancel
            </Button>

            <Button
              zone="calm"
              loading={sendingInvoice}
              disabled={!deliveryEmail.trim()}
              onClick={() => void handleDeliverInvoice('email')}
            >
              Send by email
            </Button>

            <Button
              zone="calm"
              variant="outline"
              loading={sendingInvoice}
              onClick={() => void handleDeliverInvoice('whatsapp')}
            >
              Share via WhatsApp
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={showReceiptModal}
        onClose={() => {
          if (!saving) setShowReceiptModal(false);
        }}
        title="record a payment you received"
        className="max-h-[90dvh] overflow-y-auto"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-body text-text-soft">
            Only record this after the funds have arrived. It issues an
            official receipt and updates the invoice.
          </p>

          <MoneyInput
            label="Amount received"
            currency={invoice.currency}
            value={amount}
            onChange={(value) =>
              setAmount(cleanAmount(value, amount))
            }
            hint={`Outstanding balance: ${(balanceMinor / 100).toLocaleString(
              'en-US',
              { minimumFractionDigits: 2 },
            )} ${invoice.currency}`}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payment date">
              {(fieldProps) => (
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                  {...fieldProps}
                />
              )}
            </Field>

            <BaggSelect
              label="Method"
              className="w-full"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS}
            />
          </div>

          <Field
            label="Reference (optional)"
            hint="Bank session ID or transfer reference."
          >
            {(fieldProps) => (
              <Input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                {...fieldProps}
              />
            )}
          </Field>

          <label className="flex min-h-11 items-start gap-3 rounded-row bg-peach p-3 text-body">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--bagg-mango)]"
            />
            <span>
              I have checked that these funds arrived in my account.
            </span>
          </label>

          {formError && (
            <p
              role="alert"
              className="text-body font-medium text-danger dark:text-[#FFB3A8]"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              zone="calm"
              disabled={saving}
              onClick={() => setShowReceiptModal(false)}
            >
              Cancel
            </Button>

            <Button type="submit" zone="calm" loading={saving}>
              Confirm payment received
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Recall invoice dialog */}
      <Dialog
        open={showRecallDialog}
        onClose={() => !recalling && setShowRecallDialog(false)}
        title="recall this invoice"
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            Recalling returns this invoice to draft status. Any public share link will stop working until you re-issue it.
          </p>
          <Field label="Reason (optional)">
            {(fieldProps) => (
              <Input
                type="text"
                placeholder="e.g. Scope change or billing correction"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                {...fieldProps}
              />
            )}
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" zone="calm" disabled={recalling} onClick={() => setShowRecallDialog(false)}>
              Cancel
            </Button>
            <Button zone="calm" loading={recalling} onClick={handleRecallInvoice}>
              Confirm recall
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Record WHT dialog */}
      <Dialog
        open={showWhtDialog}
        onClose={() => !savingWht && setShowWhtDialog(false)}
        title="withholding tax credit note"
      >
        <form onSubmit={handleUpdateWht} className="space-y-4">
          <p className="text-body text-text-soft">
            Enter the credit note or tax certificate number provided by your client.
          </p>
          <Field label="Credit note / certificate number">
            {(fieldProps) => (
              <Input
                type="text"
                required
                placeholder="e.g. WHT-2026-0987"
                value={whtCreditNoteNumber}
                onChange={(e) => setWhtCreditNoteNumber(e.target.value)}
                {...fieldProps}
              />
            )}
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" zone="calm" disabled={savingWht} onClick={() => setShowWhtDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" zone="calm" loading={savingWht}>
              Save WHT number
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reject payment claim dialog */}
      <Dialog
        open={!!rejectingClaim}
        onClose={() => !savingClaimReject && setRejectingClaim(null)}
        title="reject payment claim"
      >
        <form onSubmit={handleRejectClaim} className="space-y-4">
          <p className="text-body text-text-soft">
            Let the client know why their claimed payment could not be confirmed.
          </p>
          <Field label="Reason for rejection">
            {(fieldProps) => (
              <Input
                type="text"
                required
                placeholder="e.g. Funds not found in account, please verify session ID"
                value={rejectClaimReason}
                onChange={(e) => setRejectClaimReason(e.target.value)}
                {...fieldProps}
              />
            )}
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" zone="calm" disabled={savingClaimReject} onClick={() => setRejectingClaim(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={savingClaimReject}>
              Reject claim
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
