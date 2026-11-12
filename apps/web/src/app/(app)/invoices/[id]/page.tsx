'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowUUpLeftIcon,
  BellIcon,
  ChatCircleIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  CopyIcon,
  DotsThreeIcon,
  FileTextIcon,
  ReceiptIcon,
  ScrollIcon,
  ShareNetworkIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';

import { DocumentComments } from '@/components/comments/DocumentComments';
import { InvoiceDocument } from '@/components/invoice';
import { InvoiceActionBar } from '@/components/mobile/InvoiceActionBar';
import { InvoiceMobileSummary } from '@/components/mobile/InvoiceMobileSummary';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import {
  StatusPill,
  StatusTimeline,
  type StatusEvent,
} from '@/components/status';
import {
  Alert,
  BaggSelect,
  Button,
  Card,
  Dialog,
  ErrorState,
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
  id: string;
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
  email_queued?: boolean;
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

const TERMINAL_STATUSES = ['paid', 'cancelled', 'void'];

function todayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function safeAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function safeExternalUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function readError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const result = await response.json().catch(() => ({}));

  return new Error(
    result.detail || result.message || fallback,
  );
}

async function fetchOptional<T>(
  url: string,
): Promise<{ data: T | null; failed: boolean }> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return { data: null, failed: true };
    }

    return {
      data: (await response.json()) as T,
      failed: false,
    };
  } catch {
    return { data: null, failed: true };
  }
}

function getReceiptItems(data: unknown): InvoiceReceipt[] | null {
  if (Array.isArray(data)) {
    return data as InvoiceReceipt[];
  }

  if (
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray(data.items)
  ) {
    return data.items as InvoiceReceipt[];
  }

  return null;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string | undefined);

  const requestSequence = useRef(0);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [receipts, setReceipts] = useState<InvoiceReceipt[]>([]);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<InvoiceRevision[]>([]);
  const [reminders, setReminders] = useState<ReminderJob[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [rejectingClaim, setRejectingClaim] = useState<PaymentClaim | null>(
    null,
  );
  const [rejectClaimReason, setRejectClaimReason] = useState('');
  const [savingClaimReject, setSavingClaimReject] = useState(false);

  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryEmail, setDeliveryEmail] = useState('');

  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [recallReason, setRecallReason] = useState('');
  const [recalling, setRecalling] = useState(false);

  const [showWhtDialog, setShowWhtDialog] = useState(false);
  const [whtCreditNoteNumber, setWhtCreditNoteNumber] = useState('');
  const [savingWht, setSavingWht] = useState(false);

  const [nudgingWhatsApp, setNudgingWhatsApp] = useState(false);
  const [regeneratingLink, setRegeneratingLink] = useState(false);

  const { setCurrentLabel } = useCurrentBreadcrumb();

  useEffect(() => {
    setCurrentLabel(invoice?.invoice_number ?? null);

    return () => setCurrentLabel(null);
  }, [invoice?.invoice_number, setCurrentLabel]);

  /**
   * The invoice itself is the required resource. Events, claims, receipts,
   * revisions and reminders are supporting resources and must not prevent
   * the invoice from loading.
   *
   * A monotonically increasing request ID prevents a slower earlier request
   * from overwriting a newer reload or a different route's invoice.
   */
  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError('No invoice was specified.');
      setLoading(false);
      return;
    }

    const requestId = ++requestSequence.current;

    setLoading(true);
    setError(null);

    try {
      const invoiceResponse = await fetch(
        `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      if (!invoiceResponse.ok) {
        throw await readError(
          invoiceResponse,
          'Invoice could not be loaded.',
        );
      }

      const invoiceData = (await invoiceResponse.json()) as InvoiceDetail;

      if (requestId !== requestSequence.current) return;

      setInvoice(invoiceData);

      const [
        eventsResult,
        claimsResult,
        receiptsResult,
        revisionsResult,
        remindersResult,
      ] = await Promise.all([
        fetchOptional<StatusEvent[]>(
          `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/status-events`,
        ),
        fetchOptional<PaymentClaim[]>(
          `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/claims`,
        ),
        fetchOptional<unknown>(
          `${API_BASE}/receipts?invoice_id=${encodeURIComponent(invoiceId)}`,
        ),
        fetchOptional<InvoiceRevision[]>(
          `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/revisions`,
        ),
        fetchOptional<ReminderJob[]>(
          `${API_BASE}/reminders/invoices/${encodeURIComponent(invoiceId)}`,
        ),
      ]);

      if (requestId !== requestSequence.current) return;

      setEvents(eventsResult.data ?? []);
      setEventsError(
        eventsResult.failed ? 'Status history could not be loaded.' : null,
      );

      setClaims(claimsResult.data ?? []);
      setClaimsError(
        claimsResult.failed ? 'Payment claims could not be loaded.' : null,
      );

      const receiptItems = receiptsResult.data
        ? getReceiptItems(receiptsResult.data)
        : null;

      setReceipts(receiptItems ?? []);
      setReceiptsError(
        receiptsResult.failed || receiptItems === null
          ? 'Receipt history could not be loaded.'
          : null,
      );

      setRevisions(revisionsResult.data ?? []);
      setReminders(remindersResult.data ?? []);
    } catch (err: unknown) {
      if (requestId !== requestSequence.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'Invoice could not be loaded.',
      );
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadInvoice();

    return () => {
      requestSequence.current += 1;
    };
  }, [loadInvoice]);

  const netPayable =
    invoice?.net_payable_minor && invoice.net_payable_minor > 0
      ? invoice.net_payable_minor
      : (invoice?.total_minor ?? 0);

  const paidMinor = safeAmount(invoice?.amount_paid_minor);
  const balanceMinor = Math.max(0, netPayable - paidMinor);

  const pendingClaims = claims.filter(
    (claim) => claim.status === 'pending',
  );

  const hasPendingClaims = pendingClaims.length > 0;

  const canRecordPayment = Boolean(
    invoice &&
      invoice.status !== 'draft' &&
      !TERMINAL_STATUSES.includes(invoice.status) &&
      !hasPendingClaims &&
      !claimsError &&
      balanceMinor > 0,
  );

  const canRecall = Boolean(
    invoice &&
      ['issued', 'sent', 'viewed', 'overdue'].includes(invoice.status) &&
      paidMinor === 0 &&
      !hasPendingClaims &&
      !claimsError,
  );

  const shareUrl =
    invoice?.share_token && typeof window !== 'undefined'
      ? `${window.location.origin}/i/${invoice.share_token}`
      : null;

  const whatsappHref = invoice?.share_token
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${invoice.client_name || 'there'}, here is invoice ${invoice.invoice_number}: ${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/i/${invoice.share_token}`,
      )}`
    : undefined;

  const copyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setActionError(null);
      setActionNotice('Invoice link copied.');

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError(
        'Could not copy the link. Open the client view and copy the address from your browser.',
      );
    }
  };

  const openReceiptModal = () => {
    if (!invoice || !canRecordPayment) return;

    setAmount((balanceMinor / 100).toFixed(2));
    setPaymentDate(todayIso());
    setPaymentMethod('bank_transfer');
    setReference('');
    setConfirmed(false);
    setFormError(null);
    setShowReceiptModal(true);
  };

  const handleRecordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!invoice || !canRecordPayment || saving) return;

    if (hasPendingClaims) {
      setFormError(
        'Resolve the pending payment claim before recording another payment.',
      );
      return;
    }

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

    if (amountMinor > balanceMinor) {
      setFormError(
        'The amount received cannot exceed the outstanding balance.',
      );
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const response = await fetch(
        `${API_BASE}/receipts/invoice/${invoice.id}`,
        {
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
        },
      );

      if (!response.ok) {
        throw await readError(response, 'Failed to record payment.');
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
    if (!invoice || confirmingClaimId || savingClaimReject) return;

    try {
      setConfirmingClaimId(claim.id);
      setActionError(null);
      setActionNotice(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/claims/${claim.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        throw await readError(response, 'Failed to confirm claim.');
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

  const handleRejectClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !invoice ||
      !rejectingClaim ||
      savingClaimReject ||
      confirmingClaimId ||
      !rejectClaimReason.trim()
    ) {
      return;
    }

    try {
      setSavingClaimReject(true);
      setActionError(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/claims/${rejectingClaim.id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            rejection_reason: rejectClaimReason.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw await readError(response, 'Could not reject payment claim.');
      }

      setRejectingClaim(null);
      setRejectClaimReason('');
      setActionNotice('Payment claim rejected.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not reject payment claim.',
      );
    } finally {
      setSavingClaimReject(false);
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!invoice || sendingInvoice || invoice.status !== 'draft') return;

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

  const openInvoiceDelivery = () => {
    if (!invoice) return;

    setDeliveryEmail(invoice.client_email?.trim() || '');
    setActionError(null);
    setActionNotice(null);
    setShowDeliveryDialog(true);
  };

  useEffect(() => {
    if (!invoice || invoice.status !== 'issued') return;

    const search = new URLSearchParams(window.location.search);

    if (search.get('send') === '1') {
      openInvoiceDelivery();
      window.history.replaceState(null, '', window.location.pathname);
    }
    // The dialog should open only when the invoice first becomes available
    // or its status changes to issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.status]);

  const closeDeliveryDialog = () => {
    if (sendingInvoice) return;
    setShowDeliveryDialog(false);
  };

  const handleDeliverInvoice = async (
    method: 'email' | 'whatsapp',
  ) => {
    if (!invoice || sendingInvoice) return;

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

    // Open during the click event so that the browser is less likely to
    // block the later WhatsApp destination.
    const whatsappTab =
      method === 'whatsapp'
        ? window.open('about:blank', '_blank')
        : null;

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
          result.detail ||
            result.message ||
            'Could not deliver this invoice.',
        );
      }

      if (method === 'email') {
        if (result.email_sent) {
          setActionNotice(
            `Invoice ${invoice.invoice_number} emailed successfully to ${
              result.recipient_email || email
            }.`,
          );
        } else if (result.email_queued) {
          setActionNotice(
            `Invoice ${invoice.invoice_number} has been queued for email delivery to ${
              result.recipient_email || email
            }.`,
          );
        } else {
          throw new Error(
            result.message ||
              'The invoice was not emailed or queued successfully. You can share it on WhatsApp instead.',
          );
        }
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
        err instanceof Error
          ? err.message
          : 'Could not deliver this invoice.',
      );
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleRecallInvoice = async () => {
    if (!invoice || recalling || !canRecall) return;

    try {
      setRecalling(true);
      setActionError(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/recall`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            reason: recallReason.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw await readError(response, 'Could not recall invoice.');
      }

      setShowRecallDialog(false);
      setRecallReason('');
      setActionNotice(
        'Invoice recalled successfully and returned to draft.',
      );

      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Could not recall invoice.',
      );
    } finally {
      setRecalling(false);
    }
  };

  const handleUpdateWht = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !invoice ||
      savingWht ||
      !whtCreditNoteNumber.trim()
    ) {
      return;
    }

    try {
      setSavingWht(true);
      setActionError(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/wht`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            wht_credit_note_number: whtCreditNoteNumber.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw await readError(
          response,
          'Could not update WHT credit note.',
        );
      }

      setShowWhtDialog(false);
      setActionNotice('WHT credit note number recorded.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not update WHT credit note.',
      );
    } finally {
      setSavingWht(false);
    }
  };

  const handleWhatsAppNudge = async () => {
    if (!invoice || nudgingWhatsApp) return;

    try {
      setNudgingWhatsApp(true);
      setActionError(null);

      const response = await fetch(
        `${API_BASE}/reminders/invoices/${invoice.id}/nudge/whatsapp`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw await readError(
          response,
          'Could not generate WhatsApp reminder.',
        );
      }

      const result = await response.json();

      if (!result.whatsapp_url) {
        throw new Error(
          'A WhatsApp reminder link could not be generated.',
        );
      }

      window.open(result.whatsapp_url, '_blank');
      setActionNotice('WhatsApp reminder opened.');
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not generate WhatsApp reminder.',
      );
    } finally {
      setNudgingWhatsApp(false);
    }
  };

  const handleRegenerateShareLink = async () => {
    if (!invoice || regeneratingLink) return;

    const confirmedRegeneration = window.confirm(
      'Regenerate the public share link? Previous links shared with clients will stop working.',
    );

    if (!confirmedRegeneration) return;

    try {
      setRegeneratingLink(true);
      setActionError(null);

      const response = await fetch(
        `${API_BASE}/invoices/${invoice.id}/share-link/regenerate`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw await readError(
          response,
          'Could not regenerate share link.',
        );
      }

      setActionNotice('New public share link generated.');
      await loadInvoice();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not regenerate share link.',
      );
    } finally {
      setRegeneratingLink(false);
    }
  };

  if (loading && (!invoice || invoice.id !== invoiceId)) {
    return (
      <div
        role="status"
        className="flex min-h-[50vh] items-center justify-center gap-3 text-text-muted"
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent" />
        <span>Loading invoice…</span>
      </div>
    );
  }

  if (error || !invoice || invoice.id !== invoiceId) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ErrorState
        title="Invoice unavailable"
        description={error || 'Invoice could not be found.'}
        onRetry={() => void loadInvoice()}
        retryLabel="Try again"
        action={
          <Link
            href="/invoices"
            className={buttonStyles({
              variant: 'outline',
              zone: 'calm',
            })}
          >
            Back to invoices
          </Link>
        }
      />
    </div>
  );
}

  const overdue =
    balanceMinor > 0 &&
    !['draft', 'issued', 'paid', 'cancelled', 'void'].includes(
      invoice.status,
    ) &&
    invoice.due_date < todayIso();

  const showWhtAction =
    safeAmount(invoice.wht_minor) > 0 ||
    Boolean(invoice.wht_credit_note_number);

  const primaryReceipt =
    invoice.status === 'paid' && invoice.latest_receipt?.id
      ? invoice.latest_receipt
      : null;

  const scrollToClaims = () => {
    document.getElementById('claims')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };

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
      {/* Compact invoice header */}
      <header className="flex flex-col gap-4 border-b border-line-subtle pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/invoices"
            className="inline-flex min-h-10 items-center gap-2 text-body font-semibold text-text-soft transition-colors hover:text-text"
          >
            <ArrowLeftIcon aria-hidden className="h-4 w-4" />
            All invoices
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="break-words text-title-l sm:text-display">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-sun/40 px-2.5 py-0.5 text-caption font-bold text-ink transition-colors hover:bg-sun"
                title="View recurring schedule"
              >
                <span aria-hidden>↻</span>
                <span>{invoice.recurring_label || 'Recurring'}</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-text-soft">
            <span>{invoice.client_name || 'Client'}</span>
            <span aria-hidden>·</span>
            <span>Due {formatDate(invoice.due_date)}</span>
          </div>

          {invoice.recurring_period_key && (
            <p className="text-caption text-text-muted">
              Recurring period: {invoice.recurring_period_key}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start">
          {hasPendingClaims ? (
            <Button zone="calm" onClick={scrollToClaims}>
              <WarningCircleIcon aria-hidden className="h-4 w-4" />
              Review payment{pendingClaims.length === 1 ? '' : 's'}
            </Button>
          ) : invoice.status === 'draft' ? (
            <Button
              zone="calm"
              loading={sendingInvoice}
              onClick={handleFinalizeInvoice}
            >
              Approve & issue
            </Button>
          ) : ['issued', 'sent', 'viewed'].includes(invoice.status) ? (
            <Button
              zone="calm"
              loading={sendingInvoice}
              onClick={openInvoiceDelivery}
            >
              {invoice.status === 'issued' ? 'Send invoice' : 'Send again'}
            </Button>
          ) : canRecordPayment ? (
            <Button zone="calm" onClick={openReceiptModal}>
              <ReceiptIcon aria-hidden className="h-4 w-4" />
              Record payment
            </Button>
          ) : primaryReceipt ? (
            <Link
              href={`/receipts/${encodeURIComponent(primaryReceipt.id)}`}
              className={buttonStyles({
                variant: 'primary',
                zone: 'calm',
              })}
            >
              <ReceiptIcon aria-hidden className="h-4 w-4" />
              View receipt
            </Link>
          ) : null}

          <details className="relative">
            <summary
              aria-label="More invoice actions"
              title="More actions"
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-btn border border-line bg-surface px-3 text-text transition-colors hover:bg-surface-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden"
            >
              <DotsThreeIcon aria-hidden className="h-6 w-6" />
              <span className="sr-only">More actions</span>
            </summary>

            <div className="absolute right-0 z-30 mt-2 w-64 rounded-card border-brut border-ink bg-surface p-2 shadow-brut">
              {invoice.share_token && invoice.status !== 'draft' && (
                <div className="space-y-1 border-b border-line-subtle pb-2">
                  <p className="px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-muted">
                    Share
                  </p>

                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex min-h-10 w-full items-center gap-2 rounded-row px-3 text-left text-body font-medium hover:bg-surface-tint"
                  >
                    {copied ? (
                      <CheckIcon aria-hidden className="h-4 w-4" />
                    ) : (
                      <CopyIcon aria-hidden className="h-4 w-4" />
                    )}
                    {copied ? 'Copied link' : 'Copy invoice link'}
                  </button>

                  <Link
                    href={`/i/${invoice.share_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-10 items-center gap-2 rounded-row px-3 text-body font-medium hover:bg-surface-tint"
                  >
                    <ArrowSquareOutIcon aria-hidden className="h-4 w-4" />
                    Open client view
                  </Link>

                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-10 items-center gap-2 rounded-row px-3 text-body font-medium hover:bg-surface-tint"
                    >
                      <ShareNetworkIcon aria-hidden className="h-4 w-4" />
                      Share on WhatsApp
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-1 border-b border-line-subtle py-2">
                <p className="px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-muted">
                  Document
                </p>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex min-h-10 w-full items-center gap-2 rounded-row px-3 text-left text-body font-medium hover:bg-surface-tint"
                >
                  <FileTextIcon aria-hidden className="h-4 w-4" />
                  Print / save as PDF
                </button>
              </div>

              {(canRecall ||
                showWhtAction ||
                (invoice.share_token && invoice.status !== 'draft')) && (
                <div className="space-y-1 pt-2">
                  <p className="px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-muted">
                    Manage
                  </p>

                  {canRecall && (
                    <button
                      type="button"
                      onClick={() => setShowRecallDialog(true)}
                      className="flex min-h-10 w-full items-center gap-2 rounded-row px-3 text-left text-body font-medium hover:bg-surface-tint"
                    >
                      <ArrowUUpLeftIcon aria-hidden className="h-4 w-4" />
                      Recall invoice
                    </button>
                  )}

                  {showWhtAction && (
                    <button
                      type="button"
                      onClick={() => {
                        setWhtCreditNoteNumber(
                          invoice.wht_credit_note_number || '',
                        );
                        setShowWhtDialog(true);
                      }}
                      className="flex min-h-10 w-full items-center gap-2 rounded-row px-3 text-left text-body font-medium hover:bg-surface-tint"
                    >
                      <ScrollIcon aria-hidden className="h-4 w-4" />
                      {invoice.wht_credit_note_number
                        ? 'WHT reference'
                        : 'Record WHT'}
                    </button>
                  )}

                  {invoice.share_token && invoice.status !== 'draft' && (
                    <button
                      type="button"
                      disabled={regeneratingLink}
                      onClick={handleRegenerateShareLink}
                      className="flex min-h-10 w-full items-center gap-2 rounded-row px-3 text-left text-body font-medium hover:bg-surface-tint disabled:opacity-50"
                    >
                      <ArrowCounterClockwiseIcon
                        aria-hidden
                        className="h-4 w-4"
                      />
                      {regeneratingLink
                        ? 'Regenerating link…'
                        : 'Regenerate share link'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>
      </header>

      {/* Action feedback */}
      {actionError && (
        <Alert
          variant="error"
          dismissible
          onDismiss={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      {actionNotice && (
        <Alert
          variant="success"
          dismissible
          onDismiss={() => setActionNotice(null)}
        >
          {actionNotice}
        </Alert>
      )}

      {/* Mobile financial summary */}
      <InvoiceMobileSummary
        clientName={invoice.client_name}
        dueDate={invoice.due_date}
        currency={invoice.currency}
        netPayableMinor={netPayable}
        paidMinor={paidMinor}
        overdue={overdue}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Payment claims */}
          {hasPendingClaims && (
            <Card
              zone="calm"
              tone="peach"
              className="space-y-3"
            >
              <div>
                <h2
                  id="claims"
                  className="scroll-mt-4 text-heading"
                >
                  payments waiting for you
                </h2>

                <p className="text-body text-text-soft">
                  Your client says they paid. Check your bank or mobile
                  money account before confirming the funds.
                </p>
              </div>

              {claimsError && (
                <p role="alert" className="text-body text-danger">
                  {claimsError}
                </p>
              )}

              <ul className="space-y-2">
                {pendingClaims.map((claim) => {
                  const proofUrl = safeExternalUrl(claim.proof_file_url);
                  const claimBusy =
                    confirmingClaimId !== null || savingClaimReject;

                  return (
                    <li
                      key={claim.id}
                      className="flex flex-col gap-3 rounded-row border border-line-subtle bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Money
                          amountMinor={safeAmount(claim.amount_minor)}
                          currency={invoice.currency}
                          className="text-amount-s"
                        />

                        <p className="text-caption text-text-muted">
                          Claimed {formatDate(claim.payment_date)}
                          {claim.reference
                            ? ` · Ref ${claim.reference}`
                            : ''}
                        </p>

                        {proofUrl && (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-caption font-bold underline underline-offset-4"
                          >
                            View payment evidence
                            <ArrowSquareOutIcon
                              aria-hidden
                              className="h-3.5 w-3.5"
                            />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          zone="calm"
                          disabled={claimBusy}
                          onClick={() => {
                            setRejectingClaim(claim);
                            setRejectClaimReason('');
                          }}
                        >
                          <XCircleIcon
                            aria-hidden
                            className="h-4 w-4"
                          />
                          Reject
                        </Button>

                        <Button
                          zone="calm"
                          loading={confirmingClaimId === claim.id}
                          disabled={
                            claimBusy &&
                            confirmingClaimId !== claim.id
                          }
                          onClick={() => void handleConfirmClaim(claim)}
                        >
                          <CheckCircleIcon
                            aria-hidden
                            className="h-4 w-4"
                          />
                          Confirm funds
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Invoice document */}
          <details className="rounded-card border-brut border-ink bg-surface sm:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 font-extrabold">
              View full invoice
            </summary>

            <div className="p-3">
              {invoiceDoc}
            </div>
          </details>

          <div className="hidden sm:block">
            {invoiceDoc}
          </div>

          {/* Receipts */}
          <Card zone="calm" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-heading">receipts</h2>

                <p className="mt-1 text-body text-text-soft">
                  Issued receipts for payments recorded against this
                  invoice.
                </p>
              </div>

              <span className="rounded-full bg-surface-tint px-3 py-1 text-caption font-bold">
                {receipts.length}{' '}
                {receipts.length === 1 ? 'receipt' : 'receipts'}
              </span>
            </div>

            {receiptsError && (
              <div className="space-y-2">
                <p role="alert" className="text-body text-danger">
                  {receiptsError}
                </p>

                <Button
                  variant="outline"
                  zone="calm"
                  onClick={() => void loadInvoice()}
                >
                  Retry loading invoice data
                </Button>
              </div>
            )}

            {!receiptsError && receipts.length === 0 && (
              <div className="rounded-row border border-dashed border-line-subtle p-5">
                <ReceiptIcon
                  aria-hidden
                  className="h-6 w-6 text-text-muted"
                />

                <p className="mt-2 font-semibold">
                  No receipts issued yet
                </p>

                <p className="mt-1 text-body text-text-soft">
                  When a payment is recorded and a receipt is issued,
                  it will appear here.
                </p>
              </div>
            )}

            {!receiptsError && receipts.length > 0 && (
              <ul className="divide-y divide-line-subtle">
                {receipts.map((receipt) => (
                  <li
                    key={receipt.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-row bg-peach">
                        <ReceiptIcon
                          aria-hidden
                          className="h-5 w-5"
                        />
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
                          amountMinor={safeAmount(
                            receipt.amount_paid_minor,
                          )}
                          currency={receipt.currency}
                          className="font-bold"
                        />

                        <p className="text-caption text-text-muted">
                          {receipt.is_verified
                            ? 'Verified'
                            : 'Unverified'}
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

          {/* Revision history */}
          {revisions.length > 0 && (
            <Card zone="calm" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-heading">revision history</h2>

                  <p className="text-body text-text-soft">
                    Prior snapshots of this invoice.
                  </p>
                </div>

                <ClockCounterClockwiseIcon
                  aria-hidden
                  className="h-5 w-5 text-text-muted"
                />
              </div>

              <ul className="divide-y divide-line-subtle">
                {revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="py-3 text-body"
                  >
                    <div className="flex justify-between gap-3 font-bold">
                      <span>Version {revision.version}</span>

                      <Money
                        amountMinor={revision.total_minor}
                        currency={invoice.currency}
                      />
                    </div>

                    <p className="text-caption text-text-muted">
                      {formatDate(revision.created_at)}
                      {revision.reason
                        ? ` · ${revision.reason}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Automated reminders */}
          {reminders.length > 0 && (
            <Card zone="calm" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-heading">
                    automated reminders
                  </h2>

                  <p className="text-body text-text-soft">
                    Scheduled and sent payment nudges.
                  </p>
                </div>

                <BellIcon
                  aria-hidden
                  className="h-5 w-5 text-text-muted"
                />
              </div>

              <ul className="divide-y divide-line-subtle text-caption">
                {reminders.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <span className="font-bold">
                        {reminder.reminder_type.replaceAll('_', ' ')}
                      </span>

                      <span className="ml-2 text-text-muted">
                        {reminder.channel}
                      </span>

                      <p className="mt-1 text-text-muted">
                        {formatDate(reminder.scheduled_for)}
                      </p>
                    </div>

                    <span className="rounded-full bg-surface-tint px-2 py-0.5 font-bold capitalize">
                      {reminder.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Document comments */}
          <DocumentComments
            documentType="invoice"
            documentId={invoice.id}
            documentNumber={invoice.invoice_number}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card zone="calm" className="space-y-4">
            <h2 className="text-heading">status history</h2>

            {eventsError ? (
              <p role="alert" className="text-body text-danger">
                {eventsError}
              </p>
            ) : (
              <StatusTimeline events={events} />
            )}
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
              <FileTextIcon aria-hidden className="h-4 w-4" />
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
                    amountMinor={paidMinor}
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

            {balanceMinor > 0 &&
              [
                'issued',
                'sent',
                'viewed',
                'overdue',
                'partially_paid',
                'payment_claimed',
              ].includes(invoice.status) && (
                <Button
                  fullWidth
                  variant="outline"
                  zone="calm"
                  loading={nudgingWhatsApp}
                  onClick={handleWhatsAppNudge}
                >
                  <ChatCircleIcon aria-hidden className="h-4 w-4" />
                  Send WhatsApp reminder
                </Button>
              )}
          </Card>

          {claimsError && (
            <Card zone="calm" className="space-y-2">
              <h2 className="text-heading">payment claims</h2>

              <p role="alert" className="text-body text-danger">
                {claimsError}
              </p>

              <Button
                variant="outline"
                zone="calm"
                onClick={() => void loadInvoice()}
              >
                Retry
              </Button>
            </Card>
          )}
        </aside>
      </div>

      {/* Mobile action bar */}
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
            behavior: window.matchMedia(
              '(prefers-reduced-motion: reduce)',
            ).matches
              ? 'auto'
              : 'smooth',
            block: 'start',
          })
        }
        copied={copied}
        onCopy={copyShareLink}
        clientViewHref={
          invoice.share_token && invoice.status !== 'draft'
            ? `/i/${invoice.share_token}`
            : undefined
        }
        whatsappHref={
          invoice.share_token && invoice.status !== 'draft'
            ? whatsappHref
            : undefined
        }
        receiptHref={
          invoice.latest_receipt?.share_token
            ? `/r/${invoice.latest_receipt.share_token}`
            : undefined
        }
      />

      {/* Delivery dialog */}
      <Dialog
        open={showDeliveryDialog}
        onClose={closeDeliveryDialog}
        title={`Send invoice ${invoice.invoice_number}`}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            Choose how to share this issued invoice with{' '}
            <strong>{invoice.client_name || 'your client'}</strong>.
            Issuing an invoice does not send it automatically.
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
                onChange={(event) =>
                  setDeliveryEmail(event.target.value)
                }
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

      {/* Record payment dialog */}
      <Dialog
        open={showReceiptModal}
        onClose={() => {
          if (!saving) setShowReceiptModal(false);
        }}
        title="record a payment you received"
        className="max-h-[90dvh] overflow-y-auto"
      >
        <form
          onSubmit={handleRecordPayment}
          className="space-y-4"
        >
          <p className="text-body text-text-soft">
            Only record this after the funds have arrived. Recording
            the payment issues an official receipt and updates the
            invoice.
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
                  onChange={(event) =>
                    setPaymentDate(event.target.value)
                  }
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
                onChange={(event) =>
                  setReference(event.target.value)
                }
                {...fieldProps}
              />
            )}
          </Field>

          <label className="flex min-h-11 items-start gap-3 rounded-row bg-peach p-3 text-body">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) =>
                setConfirmed(event.target.checked)
              }
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--bagg-mango)]"
            />

            <span>
              I have checked that these funds arrived in my account.
            </span>
          </label>

          {formError && (
            <p
              role="alert"
              className="text-body font-medium text-danger"
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

            <Button
              type="submit"
              zone="calm"
              loading={saving}
            >
              Confirm payment received
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Recall invoice dialog */}
      <Dialog
        open={showRecallDialog}
        onClose={() => {
          if (!recalling) setShowRecallDialog(false);
        }}
        title="recall this invoice"
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            Recalling returns this invoice to draft status. Any public
            share link will stop working until you issue it again.
          </p>

          <Field label="Reason (optional)">
            {(fieldProps) => (
              <Input
                type="text"
                placeholder="e.g. Scope change or billing correction"
                value={recallReason}
                onChange={(event) =>
                  setRecallReason(event.target.value)
                }
                {...fieldProps}
              />
            )}
          </Field>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              zone="calm"
              disabled={recalling}
              onClick={() => setShowRecallDialog(false)}
            >
              Cancel
            </Button>

            <Button
              zone="calm"
              loading={recalling}
              onClick={handleRecallInvoice}
            >
              Confirm recall
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Withholding tax credit note dialog */}
      <Dialog
        open={showWhtDialog}
        onClose={() => {
          if (!savingWht) setShowWhtDialog(false);
        }}
        title="withholding tax credit note"
      >
        <form
          onSubmit={handleUpdateWht}
          className="space-y-4"
        >
          <p className="text-body text-text-soft">
            Enter the credit note or tax certificate number provided
            by your client.
          </p>

          <Field label="Credit note / certificate number">
            {(fieldProps) => (
              <Input
                type="text"
                required
                placeholder="e.g. WHT-2026-0987"
                value={whtCreditNoteNumber}
                onChange={(event) =>
                  setWhtCreditNoteNumber(event.target.value)
                }
                {...fieldProps}
              />
            )}
          </Field>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              zone="calm"
              disabled={savingWht}
              onClick={() => setShowWhtDialog(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              zone="calm"
              loading={savingWht}
            >
              Save WHT number
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reject payment claim dialog */}
      <Dialog
        open={!!rejectingClaim}
        onClose={() => {
          if (!savingClaimReject) setRejectingClaim(null);
        }}
        title="reject payment claim"
      >
        <form
          onSubmit={handleRejectClaim}
          className="space-y-4"
        >
          <p className="text-body text-text-soft">
            Let the client know why their claimed payment could not
            be confirmed.
          </p>

          <Field label="Reason for rejection">
            {(fieldProps) => (
              <Input
                type="text"
                required
                placeholder="e.g. Funds not found in account; please verify the session ID."
                value={rejectClaimReason}
                onChange={(event) =>
                  setRejectClaimReason(event.target.value)
                }
                {...fieldProps}
              />
            )}
          </Field>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              zone="calm"
              disabled={savingClaimReject}
              onClick={() => setRejectingClaim(null)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="danger"
              loading={savingClaimReject}
            >
              Reject claim
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}