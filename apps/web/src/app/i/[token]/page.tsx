'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, Info, Loader2, MessageSquare, Send } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { InvoiceDocument, PaymentDetails } from '@/components/invoice';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Button, Card, Field, Input, inputStyles } from '@/components/ui';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { cleanAmount, toMinor } from '@/lib/amount';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

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
  const [commentError, setCommentError] = useState<string | null>(null);

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

    const amountMinor = toMinor(claimAmount);
    if (amountMinor <= 0) {
      setClaimError('Enter the amount you paid.');
      setSubmittingClaim(false);
      return;
    }

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
      setToastMsg('Done. Your payment claim was sent.');
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
    setCommentError(null);
    try {
      const res = await fetch(`${API_BASE}/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName.trim(),
          message: commentText.trim(),
        }),
      });
      if (!res.ok) throw new Error('send failed');
      setCommentText('');
      fetchInvoiceData();
    } catch {
      setCommentError('Your message did not send. Check your connection and try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center bg-cream p-4 text-text-muted">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin" />
        <span className="sr-only">Loading invoice</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream p-4">
        <Card zone="calm" className="w-full max-w-sm space-y-3 p-6 text-center">
          <Info aria-hidden className="mx-auto h-9 w-9 text-text-muted" />
          <h1 className="text-title">invoice unavailable</h1>
          <p className="text-body text-text-soft">{error || 'This link may have been revoked or expired.'}</p>
        </Card>
      </div>
    );
  }

  const { invoice, payment_profile, comments, is_revised, revision_banner, show_viral_footer, viral_footer_link } = data;

  const openClaimSheet = () => {
    const payable = invoice.net_payable_minor || invoice.total_minor;
    const remaining = invoice.remaining_minor ?? Math.max(0, payable - (invoice.amount_paid_minor || 0));
    setClaimAmount((remaining / 100).toFixed(2));
    setClaimError(null);
    setIsClaimSheetOpen(true);
  };

  return (
    <div className="min-h-dvh bg-cream p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Copy and status toast */}
        {toastMsg && (
          <div
            role="status"
            className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-btn border-brut-thin border-ink bg-surface px-4 py-2 text-body font-extrabold"
          >
            <Check aria-hidden className="h-4 w-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Revision banner */}
        {is_revised && revision_banner && (
          <Card zone="calm" tone="peach" className="flex items-start gap-2.5 text-body">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{revision_banner}</span>
          </Card>
        )}

        <InvoiceDocument
          variant="public"
          onClaimPaid={openClaimSheet}
          paymentSlot={
            <PaymentDetails
              profile={payment_profile}
              currency={invoice.currency}
              onCopy={handleCopy}
              copiedKey={copiedKey}
            />
          }
          invoice={{
            ...invoice,
            remaining_minor: invoice.remaining_minor,
            amount_paid_minor: invoice.amount_paid_minor,
          }}
        />

        {/* Comments */}
        <section aria-labelledby="comments-heading" className="space-y-4 border-t border-line pt-6">
          <div className="flex items-center gap-2">
            <MessageSquare aria-hidden className="h-4 w-4" />
            <h2 id="comments-heading" className="text-heading">
              questions or clarifications
            </h2>
          </div>

          {comments && comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map((cmt) => (
                <li key={cmt.id} className="space-y-1 rounded-row bg-surface-sunken p-3 text-body">
                  <div className="flex justify-between gap-3">
                    <span className="font-extrabold">{cmt.author_name}</span>
                    <span className="text-caption text-text-muted">{formatDate(cmt.created_at)}</span>
                  </div>
                  <p className="text-text-soft">{cmt.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-soft">
              Have a question about a line item? Leave a message below and your freelancer will be notified.
            </p>
          )}

          <form onSubmit={handleAddComment} className="space-y-3">
            <Field label="Your name">
              {(a) => (
                <Input
                  type="text"
                  required
                  placeholder="e.g. Tunde"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  {...a}
                />
              )}
            </Field>
            <Field label="Your question">
              {(a) => (
                <Input
                  type="text"
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  {...a}
                />
              )}
            </Field>
            {commentError && (
              <p role="alert" className="text-body font-medium text-danger dark:text-[#FFB3A8]">
                {commentError}
              </p>
            )}
            <Button type="submit" variant="outline" zone="calm" fullWidth loading={submittingComment}>
              <Send aria-hidden className="h-4 w-4" /> Send message
            </Button>
          </form>
        </section>

        {/* Branding footer, only when the plan shows it */}
        {show_viral_footer && (
          <div className="text-center">
            <Link
              href={viral_footer_link || 'https://bagg.africa?utm_source=invoice_footer&utm_medium=referral'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-caption text-text-muted hover:text-text"
            >
              <BaggCoin size={20} />
              <span>Sent with bagg. Invoicing for African creators.</span>
            </Link>
          </div>
        )}

        <div className="text-center">
          <Button variant="link" onClick={() => setShowAbuseSheet(true)} className="text-caption font-medium">
            Report this invoice as suspicious
          </Button>
        </div>
      </div>

      {/* "I've paid" sheet */}
      <Sheet open={isClaimSheetOpen} onOpenChange={setIsClaimSheetOpen}>
        <SheetContent title="Tell your freelancer you paid" className="overflow-y-auto">
          <form onSubmit={handleClaimPayment} className="space-y-4 p-5 pb-8">
            <div className="space-y-1">
              <h2 className="text-title">i&rsquo;ve paid</h2>
              <p className="text-body text-text-soft">
                Share the transfer details so they can check the funds and send your receipt.
              </p>
            </div>

            {claimError && (
              <p role="alert" className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                {claimError}
              </p>
            )}

            <MoneyInput
              label="Amount you paid"
              currency={invoice.currency}
              value={claimAmount}
              onChange={(v) => setClaimAmount(cleanAmount(v, claimAmount))}
              required
            />

            <Field label="Date you paid">
              {(a) => (
                <Input type="date" required value={claimDate} onChange={(e) => setClaimDate(e.target.value)} {...a} />
              )}
            </Field>

            <Field label="Transfer reference" hint="The session ID or narration from your bank app.">
              {(a) => (
                <Input
                  type="text"
                  required
                  value={claimReference}
                  onChange={(e) => setClaimReference(e.target.value)}
                  {...a}
                />
              )}
            </Field>

            <Field label="Link to proof (optional)" hint="A link to a screenshot or receipt.">
              {(a) => (
                <Input
                  type="url"
                  placeholder="https://"
                  value={claimProofUrl}
                  onChange={(e) => setClaimProofUrl(e.target.value)}
                  {...a}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <SheetClose asChild>
                <Button variant="outline" zone="calm" size="lg" disabled={submittingClaim}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" zone="calm" size="lg" loading={submittingClaim}>
                Send claim
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Report abuse sheet */}
      <Sheet open={showAbuseSheet} onOpenChange={setShowAbuseSheet}>
        <SheetContent title="Report a suspicious invoice" className="overflow-y-auto">
          <div className="space-y-4 p-5 pb-8">
            <h2 className="flex items-center gap-2 text-title">
              <AlertCircle aria-hidden className="h-5 w-5" /> report this invoice
            </h2>

            {abuseSuccess ? (
              <p role="status" className="flex items-start gap-2 rounded-row bg-peach p-3 text-body">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                Thank you. Your report was sent and our team will look at this invoice promptly.
              </p>
            ) : (
              <form onSubmit={handleReportAbuse} className="space-y-4">
                <p className="text-body text-text-soft">
                  If this invoice looks like impersonation, phishing or a charge you did not expect, tell us below.
                </p>

                {abuseError && (
                  <p role="alert" className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                    {abuseError}
                  </p>
                )}

                <Field label="What looks wrong?" hint="At least 10 characters.">
                  {(a) => (
                    <textarea
                      required
                      minLength={10}
                      rows={4}
                      value={abuseReason}
                      onChange={(e) => setAbuseReason(e.target.value)}
                      className={cn(inputStyles, 'min-h-28 py-2')}
                      {...a}
                    />
                  )}
                </Field>
                <Field label="Your email (optional)">
                  {(a) => (
                    <Input type="email" value={abuseEmail} onChange={(e) => setAbuseEmail(e.target.value)} {...a} />
                  )}
                </Field>
                <Field label="Your name (optional)">
                  {(a) => <Input type="text" value={abuseName} onChange={(e) => setAbuseName(e.target.value)} {...a} />}
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <SheetClose asChild>
                    <Button variant="outline" zone="calm" size="lg">
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button type="submit" variant="danger" zone="calm" size="lg" loading={submittingAbuse}>
                    Send report
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
