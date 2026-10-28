
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { Button, Card, Field, Input, buttonStyles } from '@/components/ui';
import { formatDate } from '@/lib/date';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type QuoteLineItem = {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
};

type QuoteDetail = {
  id: string;
  workspace_id: string;
  client_id: string;
  client_name?: string | null;
  client_email?: string | null;
  quote_number: string;
  sequence_number: number;
  version: number;
  last_revised_at?: string | null;
  currency: string;
  status: string;
  is_expired: boolean;
  issue_date: string;
  expires_at: string;
  items: QuoteLineItem[];
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
  share_token?: string | null;
  share_url?: string | null;
  whatsapp_share_url?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  email_delivery_status?: string | null;
  review_requested_at?: string | null;
  review_reason?: string | null;
  accepted_at?: string | null;
  accepted_by_name?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  effective_status?: string | null;
  created_at: string;
  updated_at: string;
};

type Revision = {
  id: string;
  quote_id: string;
  version: number;
  subtotal_minor: number;
  discount_minor: number;
  tax_rate_percent: number;
  tax_minor: number;
  total_minor: number;
  wht_rate_percent: number;
  wht_minor: number;
  net_payable_minor: number;
  deposit_amount_minor?: number | null;
  items_snapshot: Array<{
    description: string;
    quantity: number;
    unit_price_minor: number;
    total_minor?: number;
  }>;
  revised_reason?: string | null;
  created_at: string;
};

type DraftItem = {
  description: string;
  quantity: string;
  unit_price: string;
};

type Notice = { kind: 'success' | 'error'; message: string };

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  return new Error(body.detail || body.message || fallback);
}

function toMinor(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

function fromMinor(value: number | null | undefined): string {
  return ((value || 0) / 100).toFixed(2);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isEditableDraft(quote: QuoteDetail): boolean {
  return quote.status === 'draft';
}

function canStartRevision(quote: QuoteDetail): boolean {
  return [
    'issued',
    'sent',
    'viewed',
    'review_requested',
    'declined',
  ].includes(quote.status);
}

export default function QuoteDetailPage() {
  const params = useParams();
  const quoteId = params?.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [editing, setEditing] = useState(false);
  const [revisionMode, setRevisionMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [sending, setSending] = useState(false);
  const [revisionReason, setRevisionReason] = useState(
    'Scope or pricing adjustment',
  );

  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [issueDate, setIssueDate] = useState(today());
  const [expiresAt, setExpiresAt] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [taxRate, setTaxRate] = useState('0');
  const [whtRate, setWhtRate] = useState('0');
  const [depositPercentage, setDepositPercentage] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);

  const populateForm = (data: QuoteDetail) => {
    setClientId(data.client_id);
    setCurrency(data.currency);
    setIssueDate(data.issue_date);
    setExpiresAt(data.expires_at);
    setDiscount(fromMinor(data.discount_minor));
    setTaxRate(String(data.tax_rate_percent ?? 0));
    setWhtRate(String(data.wht_rate_percent ?? 0));
    setDepositPercentage(
      data.deposit_percentage == null ? '' : String(data.deposit_percentage),
    );
    setNotes(data.notes || '');
    setItems(
      data.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unit_price: fromMinor(item.unit_price_minor),
      })),
    );
  };

  const loadQuote = useCallback(async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setPageError(null);

      const response = await fetch(`${API_BASE}/quotes/${quoteId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw await readError(response, 'Quote could not be loaded.');
      }

      const data = (await response.json()) as QuoteDetail;
      setQuote(data);
      populateForm(data);

      // The revisions endpoint is added in the backend batch. Keep the
      // detail page usable against the existing API while that work is pending.
      const revisionsResponse = await fetch(
        `${API_BASE}/quotes/${quoteId}/revisions`,
        { credentials: 'include' },
      );

      if (revisionsResponse.ok) {
        setRevisions((await revisionsResponse.json()) as Revision[]);
      } else {
        setRevisions([]);
      }
    } catch (error: unknown) {
      setPageError(
        error instanceof Error ? error.message : 'Quote could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const resetForm = () => {
    if (quote) populateForm(quote);
    setEditing(false);
    setRevisionMode(false);
    setRevisionReason('Scope or pricing adjustment');
  };

  const updateItem = (
    index: number,
    field: keyof DraftItem,
    value: string,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { description: '', quantity: '1', unit_price: '0.00' },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const buildPayload = () => ({
    client_id: clientId,
    currency: currency.trim().toUpperCase(),
    issue_date: issueDate,
    expires_at: expiresAt,
    items: items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price_minor: toMinor(item.unit_price),
    })),
    discount_minor: toMinor(discount),
    tax_rate_percent: Number(taxRate),
    wht_rate_percent: Number(whtRate),
    deposit_percentage:
      depositPercentage.trim() === '' ? null : Number(depositPercentage),
    notes: notes.trim() || null,
  });

  const validateForm = (): string | null => {
    if (!clientId.trim()) return 'A client is required.';
    if (!currency.trim()) return 'Currency is required.';
    if (!issueDate || !expiresAt) return 'Issue and expiry dates are required.';
    if (expiresAt < issueDate) return 'Expiry date cannot be before the issue date.';
    if (items.length === 0) return 'Add at least one line item.';
    for (const [index, item] of items.entries()) {
      if (!item.description.trim()) {
        return `Enter a description for line item ${index + 1}.`;
      }
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        return `Quantity for line item ${index + 1} must be a whole number of at least 1.`;
      }
      if (!Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) {
        return `Enter a valid unit price for line item ${index + 1}.`;
      }
    }
    if (!Number.isFinite(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100) {
      return 'Tax rate must be between 0 and 100.';
    }
    if (!Number.isFinite(Number(whtRate)) || Number(whtRate) < 0 || Number(whtRate) > 100) {
      return 'WHT rate must be between 0 and 100.';
    }
    if (
      depositPercentage.trim() !== '' &&
      (!Number.isFinite(Number(depositPercentage)) ||
        Number(depositPercentage) < 0 ||
        Number(depositPercentage) > 100)
    ) {
      return 'Deposit percentage must be between 0 and 100.';
    }
    return null;
  };

  const handleSave = async () => {
    if (!quote) return;

    const validationError = validateForm();
    if (validationError) {
      setNotice({ kind: 'error', message: validationError });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      const endpoint = revisionMode
        ? `${API_BASE}/quotes/${quote.id}/revise`
        : `${API_BASE}/quotes/${quote.id}`;

      const response = await fetch(endpoint, {
        method: revisionMode ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          revisionMode
            ? { ...buildPayload(), reason: revisionReason.trim() || 'Scope or pricing adjustment' }
            : buildPayload(),
        ),
      });

      if (!response.ok) {
        throw await readError(
          response,
          revisionMode ? 'Could not create a revised quote.' : 'Could not save quote.',
        );
      }

      const updated = (await response.json()) as QuoteDetail;
      setQuote(updated);
      populateForm(updated);
      setEditing(false);
      setRevisionMode(false);
      setNotice({
        kind: 'success',
        message: revisionMode
          ? `Revision created for quote ${updated.quote_number}. Review it before issuing.`
          : 'Draft quote saved.',
      });
      await loadQuote();
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not save quote.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!quote) return;

    try {
      setIssuing(true);
      setNotice(null);

      const response = await fetch(`${API_BASE}/quotes/${quote.id}/finalize`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw await readError(response, 'Could not issue this quote.');
      }

      setNotice({
        kind: 'success',
        message: 'Quote issued. It has not been sent to the client.',
      });
      await loadQuote();
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not issue quote.',
      });
    } finally {
      setIssuing(false);
    }
  };

  const handleSend = async () => {
    if (!quote) return;

    try {
      setSending(true);
      setNotice(null);

      const response = await fetch(`${API_BASE}/quotes/${quote.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ send_email: false }),
      });

      if (!response.ok) {
        throw await readError(response, 'Could not prepare the quote for sharing.');
      }

      const result = await response.json();
      const shareUrl = result.share_url || quote.share_url;

      if (shareUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setNotice({
          kind: 'success',
          message: 'Quote link copied. Share it with your client.',
        });
      } else {
        setNotice({
          kind: 'success',
          message: 'Quote prepared for sharing.',
        });
      }

      await loadQuote();
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not prepare quote sharing.',
      });
    } finally {
      setSending(false);
    }
  };

  const copyPublicLink = async () => {
    if (!quote?.share_token) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/q/${quote.share_token}`,
      );
      setNotice({ kind: 'success', message: 'Client quote link copied.' });
    } catch {
      setNotice({ kind: 'error', message: 'Could not copy the client link.' });
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex justify-center py-20 text-text-muted">
        <Loader2 aria-hidden className="h-7 w-7 animate-spin" />
        <span className="sr-only">Loading quote</span>
      </div>
    );
  }

  if (pageError || !quote) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <Link href="/quotes" className={buttonStyles({ variant: 'outline' })}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to quotes
        </Link>
        <Card zone="calm" className="space-y-3 p-6">
          <AlertCircle aria-hidden className="h-6 w-6" />
          <h1 className="text-title">quote unavailable</h1>
          <p className="text-body text-text-soft">
            {pageError || 'This quote could not be found.'}
          </p>
          <Button variant="outline" zone="calm" onClick={() => void loadQuote()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  const editable = isEditableDraft(quote);
  const displayStatus = quote.effective_status || quote.status;
  const publicUrl = quote.share_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/q/${quote.share_token}`
    : null;

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/quotes" className={buttonStyles({ variant: 'outline' })}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          All quotes
        </Link>
        <div className="flex flex-wrap gap-2">
          {editable && !editing && (
            <Button variant="outline" zone="calm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="h-4 w-4" />
              Edit draft
            </Button>
          )}
          {!editable && canStartRevision(quote) && !editing && (
            <Button
              variant="outline"
              zone="calm"
              onClick={() => {
                populateForm(quote);
                setRevisionMode(true);
                setEditing(true);
              }}
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Create revision
            </Button>
          )}
          {editable && !editing && (
            <Button zone="calm" loading={issuing} onClick={() => void handleIssue()}>
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              Issue quote
            </Button>
          )}
          {['issued', 'sent', 'viewed', 'review_requested'].includes(quote.status) && (
            <Button zone="calm" loading={sending} onClick={() => void handleSend()}>
              <Send aria-hidden className="h-4 w-4" />
              Copy share link
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={
            notice.kind === 'error'
              ? 'flex items-start gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]'
              : 'flex items-start gap-2 rounded-row bg-peach p-3 text-body'
          }
        >
          {notice.kind === 'error' ? (
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-label text-text-soft">QUOTE</p>
          <h1 className="text-title-l sm:text-display">
            {quote.quote_number}
            <span className="ml-2 text-body text-text-soft">v{quote.version}</span>
          </h1>
          <p className="mt-1 text-body text-text-soft">
            {quote.client_name || 'Client'} · Created {formatDate(quote.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={displayStatus} />
          {quote.is_expired && <StatusPill status="expired" />}
        </div>
      </section>

      {editing ? (
        <Card zone="calm" className="space-y-6 p-4 sm:p-6">
          <div>
            <h2 className="text-heading">
              {revisionMode ? 'Create a revised version' : 'Edit draft'}
            </h2>
            <p className="mt-1 text-body text-text-soft">
              {revisionMode
                ? 'The existing issued version must remain unchanged. The revision will require review and issuance before it can be shared.'
                : 'Only draft quotes can be edited in place.'}
            </p>
          </div>

          {revisionMode && (
            <Field label="Reason for revision">
              {(fieldProps) => (
                <Input
                  value={revisionReason}
                  onChange={(event) => setRevisionReason(event.target.value)}
                  maxLength={500}
                  {...fieldProps}
                />
              )}
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client ID" hint="The quote's current client ID is prefilled.">
              {(fieldProps) => (
                <Input value={clientId} onChange={(event) => setClientId(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Currency">
              {(fieldProps) => (
                <Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Issue date">
              {(fieldProps) => (
                <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Expiry date">
              {(fieldProps) => (
                <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Discount amount" hint="Enter the amount in the selected currency.">
              {(fieldProps) => (
                <Input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Tax rate (%)">
              {(fieldProps) => (
                <Input inputMode="decimal" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Withholding tax rate (%)">
              {(fieldProps) => (
                <Input inputMode="decimal" value={whtRate} onChange={(event) => setWhtRate(event.target.value)} {...fieldProps} />
              )}
            </Field>
            <Field label="Deposit (%)" hint="Leave blank if no deposit applies.">
              {(fieldProps) => (
                <Input inputMode="decimal" value={depositPercentage} onChange={(event) => setDepositPercentage(event.target.value)} {...fieldProps} />
              )}
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-heading">Line items</h3>
              <Button variant="outline" zone="calm" onClick={addItem}>
                <Plus aria-hidden className="h-4 w-4" />
                Add item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={`${index}-${item.description}`} className="grid gap-3 rounded-card border border-border p-3 sm:grid-cols-[minmax(0,1fr)_100px_150px_auto]">
                <Field label={`Description ${index + 1}`}>
                  {(fieldProps) => (
                    <Input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} {...fieldProps} />
                  )}
                </Field>
                <Field label="Quantity">
                  {(fieldProps) => (
                    <Input inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} {...fieldProps} />
                  )}
                </Field>
                <Field label="Unit price">
                  {(fieldProps) => (
                    <Input inputMode="decimal" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} {...fieldProps} />
                  )}
                </Field>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    zone="calm"
                    disabled={items.length <= 1}
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Field label="Notes">
            {(fieldProps) => (
              <textarea
                className="min-h-24 w-full rounded-field border border-border bg-surface p-3 text-body"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                {...fieldProps}
              />
            )}
          </Field>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" zone="calm" disabled={saving} onClick={resetForm}>
              Cancel
            </Button>
            <Button zone="calm" loading={saving} onClick={() => void handleSave()}>
              {revisionMode ? 'Save revision draft' : 'Save draft'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <Card zone="calm" className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <FileText aria-hidden className="h-5 w-5" />
                <h2 className="text-heading">Commercial terms</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-label text-text-soft">Client</p>
                  <p className="mt-1 text-body font-semibold">{quote.client_name || '—'}</p>
                  <p className="text-body text-text-soft">{quote.client_email || 'No email recorded'}</p>
                </div>
                <div>
                  <p className="text-label text-text-soft">Validity</p>
                  <p className="mt-1 text-body">{formatDate(quote.issue_date)} – {formatDate(quote.expires_at)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-body">
                  <thead>
                    <tr className="border-b border-border text-text-soft">
                      <th className="py-3 pr-3 font-medium">Description</th>
                      <th className="px-3 py-3 text-right font-medium">Qty</th>
                      <th className="px-3 py-3 text-right font-medium">Unit price</th>
                      <th className="py-3 pl-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-3">{item.description}</td>
                        <td className="px-3 py-3 text-right">{item.quantity}</td>
                        <td className="px-3 py-3 text-right">
                          <Money amountMinor={item.unit_price_minor} currency={quote.currency} />
                        </td>
                        <td className="py-3 pl-3 text-right font-semibold">
                          <Money amountMinor={item.total_minor} currency={quote.currency} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto max-w-sm space-y-3 border-t border-border pt-4">
                <div className="flex justify-between gap-4">
                  <span className="text-text-soft">Subtotal</span>
                  <Money amountMinor={quote.subtotal_minor} currency={quote.currency} />
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-soft">Discount</span>
                  <Money amountMinor={quote.discount_minor} currency={quote.currency} />
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-soft">Tax ({quote.tax_rate_percent}%)</span>
                  <Money amountMinor={quote.tax_minor} currency={quote.currency} />
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-soft">Withholding tax ({quote.wht_rate_percent}%)</span>
                  <Money amountMinor={quote.wht_minor} currency={quote.currency} />
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3 text-heading">
                  <span>Total</span>
                  <Money amountMinor={quote.total_minor} currency={quote.currency} />
                </div>
                <div className="flex justify-between gap-4 font-semibold">
                  <span>Net payable</span>
                  <Money amountMinor={quote.net_payable_minor} currency={quote.currency} />
                </div>
                {quote.deposit_amount_minor != null && (
                  <div className="flex justify-between gap-4">
                    <span className="text-text-soft">
                      Deposit{quote.deposit_percentage != null ? ` (${quote.deposit_percentage}%)` : ''}
                    </span>
                    <Money amountMinor={quote.deposit_amount_minor} currency={quote.currency} />
                  </div>
                )}
              </div>
              {quote.notes && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-label text-text-soft">Notes</h3>
                  <p className="mt-2 whitespace-pre-wrap text-body">{quote.notes}</p>
                </div>
              )}
            </Card>

            <Card zone="calm" className="space-y-4 p-4 sm:p-6">
              <h2 className="text-heading">Version history</h2>
              {revisions.length === 0 ? (
                <p className="text-body text-text-soft">
                  No revision history is available yet. The backend revision-history endpoint is required to display previous versions here.
                </p>
              ) : (
                <ol className="space-y-4">
                  {revisions
                    .slice()
                    .sort((a, b) => b.version - a.version)
                    .map((revision) => (
                      <li key={revision.id} className="flex gap-3">
                        <div className="mt-1 rounded-full bg-surface-muted p-2">
                          <Clock3 aria-hidden className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-semibold">Version {revision.version}</p>
                            <time className="text-body text-text-soft">
                              {formatDate(revision.created_at)}
                            </time>
                          </div>
                          <p className="text-body text-text-soft">
                            {revision.revised_reason || 'Revision snapshot'}
                          </p>
                          <p className="mt-1 text-body">
                            Total: <Money amountMinor={revision.total_minor} currency={quote.currency} />
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              )}
            </Card>
          </div>

          <aside className="space-y-6">
            <Card zone="calm" className="space-y-4 p-4 sm:p-6">
              <h2 className="text-heading">Client delivery</h2>
              <p className="text-body text-text-soft">
                Issuing and sending are separate actions. Only share a version after it has been issued.
              </p>
              {publicUrl ? (
                <>
                  <div className="break-all rounded-field bg-surface-muted p-3 text-body">
                    {publicUrl}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" zone="calm" onClick={() => void copyPublicLink()}>
                      <Copy aria-hidden className="h-4 w-4" />
                      Copy link
                    </Button>
                    {['issued', 'sent', 'viewed', 'review_requested'].includes(quote.status) && (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonStyles({ variant: 'outline', zone: 'calm' })}
                      >
                        <ExternalLink aria-hidden className="h-4 w-4" />
                        Preview
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-body text-text-soft">
                  A client link is not available for this quote yet.
                </p>
              )}
              <dl className="space-y-3 border-t border-border pt-4 text-body">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-soft">Issued</dt>
                  <dd>{quote.status === 'draft' ? 'Not yet issued' : 'Yes'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-soft">Sent</dt>
                  <dd>{quote.sent_at ? formatDate(quote.sent_at) : 'Not sent'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-soft">Viewed</dt>
                  <dd>{quote.viewed_at ? formatDate(quote.viewed_at) : 'Not viewed'}</dd>
                </div>
                {quote.email_delivery_status && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-soft">Email status</dt>
                    <dd>{quote.email_delivery_status}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card zone="calm" className="space-y-4 p-4 sm:p-6">
              <h2 className="text-heading">Approvals and activity</h2>
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-soft">Created</dt>
                  <dd>{formatDate(quote.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-soft">Last updated</dt>
                  <dd>{formatDate(quote.updated_at)}</dd>
                </div>
                {quote.last_revised_at && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-soft">Last revised</dt>
                    <dd>{formatDate(quote.last_revised_at)}</dd>
                  </div>
                )}
                {quote.review_requested_at && (
                  <div>
                    <dt className="text-text-soft">Client requested changes</dt>
                    <dd className="mt-1">{formatDate(quote.review_requested_at)}</dd>
                    {quote.review_reason && <dd className="mt-1">{quote.review_reason}</dd>}
                  </div>
                )}
                {quote.accepted_at && (
                  <div>
                    <dt className="text-text-soft">Accepted</dt>
                    <dd className="mt-1">
                      {formatDate(quote.accepted_at)}
                      {quote.accepted_by_name ? ` by ${quote.accepted_by_name}` : ''}
                    </dd>
                  </div>
                )}
                {quote.declined_at && (
                  <div>
                    <dt className="text-text-soft">Declined</dt>
                    <dd className="mt-1">{formatDate(quote.declined_at)}</dd>
                    {quote.decline_reason && <dd className="mt-1">{quote.decline_reason}</dd>}
                  </div>
                )}
              </dl>
            </Card>

            {quote.invoice_id && (
              <Card zone="calm" className="space-y-3 p-4 sm:p-6">
                <h2 className="text-heading">Linked invoice</h2>
                <p className="text-body">
                  {quote.invoice_number || quote.invoice_id}
                </p>
                <p className="text-body text-text-soft">
                  Status: {quote.invoice_status || 'Unknown'}
                </p>
                <Link
                  href={`/invoices/${quote.invoice_id}`}
                  className={buttonStyles({ variant: 'outline', zone: 'calm' })}
                >
                  View invoice
                </Link>
              </Card>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
