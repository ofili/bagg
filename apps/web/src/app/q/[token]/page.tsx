'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, CheckCircle2, Clock, Loader2, Sparkles, XCircle } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { Button, Card, Field, Input, buttonStyles, inputStyles } from '@/components/ui';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

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
  user_facing_status?: string | null;
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
  version: number;
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

    if (!quote) {
      setAcceptError('Quote details are not loaded. Refresh and try again.');
      return;
    }

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
        body: JSON.stringify({
          accepted_by_name: acceptName.trim(),
          version: quote.version,
        }),
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
      <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream p-6 text-text-muted">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin" />
        <p className="text-body">Loading your quote</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream p-6">
        <Card zone="calm" className="w-full max-w-md space-y-4 p-6 text-center">
          <AlertCircle aria-hidden className="mx-auto h-10 w-10" />
          <h1 className="text-title">quote unavailable</h1>
          <p className="text-body text-text-soft">{error || 'Quote could not be found.'}</p>
          <Link href="/" className={buttonStyles({ variant: 'outline', zone: 'calm' })}>
            Visit bagg
          </Link>
        </Card>
      </div>
    );
  }

  const displayStatus = quote.user_facing_status || quote.status;
  const isAccepted = quote.status === 'accepted';
  const isDeclined = quote.status === 'declined';
  const isConverted = quote.status === 'converted';
  const isExpired = quote.is_expired || displayStatus === 'expired';
  const canRespond = !isAccepted && !isDeclined && !isConverted && !isExpired;

  const brandColor = quote.business_brand_color || 'var(--bagg-mango)';
  const initials = (quote.business_name || 'b')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toLowerCase();

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappText = encodeURIComponent(`Hi, I’d like to discuss quote ${quote.quote_number}: ${shareUrl}/q/${token}`);

  const Row = ({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) => (
    <div className={cn('flex items-baseline justify-between gap-4', strong && 'font-extrabold')}>
      <span className={strong ? 'text-body-l' : 'text-body text-text-soft'}>{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-cream p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Where this quote stands */}
        {isAccepted && (
          <Card zone="calm" tone="peach" className="flex items-start gap-3">
            <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-body font-extrabold">Quote accepted</p>
              <p className="text-body text-text-soft">
                Accepted by <span className="font-medium text-text">{quote.accepted_by_name}</span>
                {quote.accepted_at ? ` on ${formatDate(quote.accepted_at)}` : ''}.
              </p>
            </div>
          </Card>
        )}
        {isDeclined && (
          <Card zone="calm" tone="peach" className="flex items-start gap-3">
            <XCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-body font-extrabold">Quote declined</p>
              <p className="text-body text-text-soft">
                {quote.decline_reason ? `Feedback: ${quote.decline_reason}` : 'Declined by the client.'}
              </p>
            </div>
          </Card>
        )}
        {isConverted && (
          <Card zone="calm" tone="peach" className="flex items-start gap-3">
            <Sparkles aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-body font-extrabold">Now an invoice</p>
              <p className="text-body text-text-soft">
                This quote was approved and became invoice {quote.invoice_number || ''}.
              </p>
            </div>
          </Card>
        )}
        {isExpired && !isAccepted && (
          <Card zone="calm" tone="peach" className="flex items-start gap-3">
            <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-body font-extrabold">This quote has expired</p>
              <p className="text-body text-text-soft">
                The offer lapsed on {formatDate(quote.expires_at)}. Ask for an updated quote.
              </p>
            </div>
          </Card>
        )}

        <article className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="h-1.5" style={{ backgroundColor: brandColor }} />

          <div className="space-y-6 p-5 sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {quote.business_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quote.business_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-body font-extrabold"
                  >
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-heading">{quote.business_name}</h1>
                  <p className="text-body text-text-soft">
                    Prepared for <span className="font-medium text-text">{quote.client_name || 'you'}</span>
                  </p>
                </div>
              </div>
              <StatusPill status={displayStatus} />
            </header>

            <div className="space-y-1 rounded-row bg-surface-sunken p-4">
              <p className="text-body text-text-soft">Quote {quote.quote_number}</p>
              <p className="text-body-l">
                Issued {formatDate(quote.issue_date)} ·{' '}
                <span className={cn('font-extrabold', isExpired && 'text-danger dark:text-[#FFB3A8]')}>
                  Valid until {formatDate(quote.expires_at)}
                </span>
              </p>
              <p className="pt-2 text-caption text-text-muted">Net payable ({quote.currency})</p>
              <Money
                amountMinor={quote.net_payable_minor}
                currency={quote.currency}
                className="block text-amount-l sm:text-amount-xl"
                hideCurrencyCode
              />
            </div>

            <section aria-labelledby="scope-heading" className="space-y-3">
              <h2 id="scope-heading" className="text-heading">
                scope and deliverables
              </h2>
              <ul className="space-y-2">
                {quote.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-row border border-line-subtle bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium">{item.description}</p>
                      <p className="text-caption text-text-muted">
                        {item.quantity} ×{' '}
                        <Money amountMinor={item.unit_price_minor} currency={quote.currency} variant="muted" hideCurrencyCode />
                      </p>
                    </div>
                    <Money amountMinor={item.total_minor} currency={quote.currency} className="text-amount-s" hideCurrencyCode />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Totals" className="space-y-2">
              <Row label="Subtotal">
                <Money amountMinor={quote.subtotal_minor} currency={quote.currency} hideCurrencyCode />
              </Row>
              {quote.discount_minor > 0 && (
                <Row label="Discount">
                  −<Money amountMinor={quote.discount_minor} currency={quote.currency} hideCurrencyCode />
                </Row>
              )}
              {quote.tax_rate_percent > 0 && (
                <Row label={`VAT (${quote.tax_rate_percent}%)`}>
                  <Money amountMinor={quote.tax_minor} currency={quote.currency} hideCurrencyCode />
                </Row>
              )}
              {quote.wht_rate_percent > 0 && (
                <>
                  <Row label="Gross total">
                    <Money amountMinor={quote.total_minor} currency={quote.currency} hideCurrencyCode />
                  </Row>
                  <Row label={`Less withholding tax (${quote.wht_rate_percent}%)`}>
                    −<Money amountMinor={quote.wht_minor} currency={quote.currency} hideCurrencyCode />
                  </Row>
                </>
              )}
              <div className="border-t border-line pt-3">
                <Row label="Net payable" strong>
                  <Money amountMinor={quote.net_payable_minor} currency={quote.currency} className="text-amount-m" hideCurrencyCode />
                </Row>
              </div>
            </section>

            {quote.deposit_percentage && quote.deposit_percentage > 0 ? (
              <Card zone="calm" tone="peach" className="space-y-1">
                <p className="text-body font-extrabold">Deposit on acceptance: {quote.deposit_percentage}%</p>
                <p className="text-body text-text-soft">
                  When you accept, an initial deposit of{' '}
                  <Money
                    amountMinor={quote.deposit_amount_minor || 0}
                    currency={quote.currency}
                    variant="inherit"
                    className="font-extrabold text-text"
                  />{' '}
                  is due to start the work.
                </p>
              </Card>
            ) : null}

            {quote.notes && (
              <Card zone="calm">
                <h2 className="text-heading">Notes</h2>
                <p className="mt-2 whitespace-pre-line text-body text-text-soft">{quote.notes}</p>
              </Card>
            )}

            {canRespond && (
              <div className="space-y-3 border-t border-line pt-5">
                <p className="text-body text-text-soft">Happy with the scope and price? Accept to get started.</p>
                <Button zone="calm" size="lg" fullWidth onClick={() => setShowAcceptSheet(true)}>
                  <Check aria-hidden className="h-4 w-4" /> Accept quote
                </Button>
                <Button variant="outline" zone="calm" size="lg" fullWidth onClick={() => setShowDeclineSheet(true)}>
                  Decline
                </Button>
                <div className="text-center">
                  <a
                    href={`https://wa.me/?text=${whatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: 'link' })}
                  >
                    Discuss on WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </article>

        {quote.show_badge && (
          <div className="text-center">
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-2 text-caption text-text-muted hover:text-text"
            >
              <BaggCoin size={20} />
              <span>Sent with bagg. Free invoices and quotes for African freelancers.</span>
            </Link>
          </div>
        )}
      </div>

      {/* Accept sheet */}
      <Sheet open={showAcceptSheet} onOpenChange={setShowAcceptSheet}>
        <SheetContent title="Accept this quote" className="overflow-y-auto">
          <form onSubmit={handleAcceptQuote} className="space-y-4 p-5 pb-8">
            <div className="space-y-1">
              <h2 className="text-title">accept this quote</h2>
              <p className="text-body text-text-soft">
                {quote.quote_number} ·{' '}
                <Money amountMinor={quote.net_payable_minor} currency={quote.currency} variant="inherit" className="font-extrabold text-text" />
              </p>
            </div>

            <Field label="Your full name or authorised signatory">
              {(a) => (
                <Input
                  type="text"
                  required
                  placeholder="e.g. Amara Okonkwo"
                  value={acceptName}
                  onChange={(e) => setAcceptName(e.target.value)}
                  {...a}
                />
              )}
            </Field>

            {acceptError && (
              <p role="alert" className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                {acceptError}
              </p>
            )}

            <p className="text-body text-text-soft">
              By confirming, you approve the scope, pricing and terms in this quote.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <SheetClose asChild>
                <Button variant="outline" zone="calm" size="lg" disabled={accepting}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" zone="calm" size="lg" loading={accepting}>
                Confirm
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Decline sheet */}
      <Sheet open={showDeclineSheet} onOpenChange={setShowDeclineSheet}>
        <SheetContent title="Decline this quote" className="overflow-y-auto">
          <form onSubmit={handleDeclineQuote} className="space-y-4 p-5 pb-8">
            <div className="space-y-1">
              <h2 className="text-title">decline this quote</h2>
              <p className="text-body text-text-soft">Tell them why it did not fit. It helps them improve the next one.</p>
            </div>

            <Field label="Reason (optional)">
              {(a) => (
                <textarea
                  rows={4}
                  placeholder="For example: budget changed, timeline too tight, or the scope changed."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className={cn(inputStyles, 'min-h-28 py-2')}
                  {...a}
                />
              )}
            </Field>

            {declineError && (
              <p role="alert" className="rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                {declineError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <SheetClose asChild>
                <Button variant="outline" zone="calm" size="lg" disabled={declining}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" variant="danger" zone="calm" size="lg" loading={declining}>
                Decline quote
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
