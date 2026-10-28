'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import { QuoteCard, type QuoteCardData } from '@/components/mobile/QuoteCard';
import { Button, Card, buttonStyles } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Load everything once and filter on the client, so the chip counts stay correct while a filter is on
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const res = await fetch(`${API_BASE}/quotes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Could not load quotes');
      setQuotes(await res.json());
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSend = async (id: string) => {
  try {
    setSendingId(id);
    setNotice(null);

    // Reload the latest quote state before deciding whether to finalize.
    const current = quotes.find((quote) => quote.id === id);
    if (!current) {
      throw new Error('Quote not found. Refresh the page and try again.');
    }

    // Draft quotes must be finalized before they can be sent.
    if (current.status === 'draft') {
      const finalizeRes = await fetch(
        `${API_BASE}/quotes/${id}/finalize`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}));
        throw new Error(
          err.detail || 'Could not finalize this quote.',
        );
      }
    }

    // Send only after finalization succeeds (or if already finalized).
    const sendRes = await fetch(`${API_BASE}/quotes/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ send_email: true }),
    });

    const result = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok) {
      throw new Error(result.detail || 'Could not send this quote.');
    }

    setNotice({
      kind: 'success',
      text:
        result.message ||
        `Quote ${current.quote_number} is ready to share.`,
    });

    await fetchQuotes();
  } catch (err: unknown) {
    setNotice({
      kind: 'error',
      text:
        err instanceof Error
          ? err.message
          : 'Could not finalize and send this quote.',
    });
  } finally {
    setSendingId(null);
  }
};

  const handleConvert = async (quote: QuoteCardData) => {
    try {
      setConvertingId(quote.id);
      setNotice(null);
      const res = await fetch(`${API_BASE}/quotes/${quote.id}/convert`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNotice({ kind: 'error', text: err.detail || 'Could not convert this quote to an invoice.' });
        return;
      }
      const inv = await res.json();
      setNotice({ kind: 'success', text: `Quote ${quote.quote_number} is now invoice ${inv.invoice_number}.` });
      fetchQuotes();
      setTimeout(() => router.push('/invoices'), 1500);
    } catch {
      setNotice({ kind: 'error', text: 'Network error while converting the quote.' });
    } finally {
      setConvertingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: quotes.length,
      draft: quotes.filter((q) => q.status === 'draft').length,
      sent: quotes.filter((q) => q.status === 'sent').length,
      viewed: quotes.filter((q) => q.status === 'viewed').length,
      accepted: quotes.filter((q) => q.status === 'accepted').length,
      declined: quotes.filter((q) => q.status === 'declined').length,
      converted: quotes.filter((q) => q.status === 'converted').length,
      expired: quotes.filter((q) => q.is_expired).length,
    }),
    [quotes],
  );

  const visible = quotes.filter((q) => {
    if (!statusFilter) return true;
    if (statusFilter === 'expired') return q.is_expired;
    return q.status === statusFilter;
  });

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-title-l sm:text-display">quotes</h1>
          <p className="mt-1 text-body text-text-soft">
            Pitch with a clear expiry date, then turn an accepted quote into an invoice in one tap.
          </p>
        </div>
        <Link href="/quotes/new" className={buttonStyles({ variant: 'accent' })}>
          <Plus aria-hidden className="h-4 w-4" /> New quote
        </Link>
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
          <span>{notice.text}</span>
        </div>
      )}

      <ChipStrip
        label="Filter quotes by status"
        chips={[
          { value: '', label: 'All', count: counts.all },
          { value: 'draft', label: 'Draft', count: counts.draft },
          { value: 'sent', label: 'Sent', count: counts.sent },
          { value: 'viewed', label: 'Viewed', count: counts.viewed },
          { value: 'accepted', label: 'Accepted', count: counts.accepted },
          { value: 'declined', label: 'Declined', count: counts.declined },
          { value: 'converted', label: 'Converted', count: counts.converted },
          { value: 'expired', label: 'Expired', count: counts.expired },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {loading ? (
        <div role="status" className="flex justify-center py-16 text-text-muted">
          <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
          <span className="sr-only">Loading quotes</span>
        </div>
      ) : loadFailed ? (
        <Card zone="calm" className="space-y-3 p-6">
          <h2 className="text-heading">we couldn&rsquo;t load your quotes</h2>
          <p className="text-body text-text-soft">Check your connection and try again.</p>
          <Button variant="outline" zone="calm" onClick={fetchQuotes}>
            Try again
          </Button>
        </Card>
      ) : visible.length === 0 ? (
        <Card tone="peach" className="space-y-4 p-8 text-center">
          <BaggCoin size={48} className="mx-auto" />
          <h2 className="text-title">no quotes here</h2>
          <p className="mx-auto max-w-sm text-body text-text-soft">
            {statusFilter
              ? `Nothing is marked ${statusFilter} right now.`
              : 'Create your first quote with an expiry date and an optional upfront deposit.'}
          </p>
          <Link href="/quotes/new" className={buttonStyles({ size: 'lg' })}>
            <Plus aria-hidden className="h-4 w-4" /> Create a quote
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              sending={sendingId === q.id}
              converting={convertingId === q.id}
              onSend={() => handleSend(q.id)}
              onConvert={() => handleConvert(q)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
