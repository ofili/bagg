'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import { QuoteCard, type QuoteCardData } from '@/components/mobile/QuoteCard';
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  buttonStyles,
} from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Notice = {
  kind: 'success' | 'error';
  text: string;
};

type DeliveryMethod = 'email' | 'whatsapp';

interface QuoteSendResult {
  id?: string;
  quote_number?: string;
  status?: string;
  email_sent?: boolean;
  recipient_email?: string | null;
  whatsapp_share_url?: string;
  share_url?: string;
  message?: string;
  detail?: string;
}

async function responseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  return new Error(body.detail || body.message || fallback);
}

export default function QuotesPage() {
  const router = useRouter();

  const [quotes, setQuotes] = useState<QuoteCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [deliveryQuote, setDeliveryQuote] = useState<QuoteCardData | null>(null);
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryBusy, setDeliveryBusy] = useState(false);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);

      const response = await fetch(`${API_BASE}/quotes`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw await responseError(response, 'Could not load quotes.');
      }

      const data = (await response.json()) as QuoteCardData[];
      setQuotes(data);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  const handleFinalize = async (quote: QuoteCardData) => {
    try {
      setSendingId(quote.id);
      setNotice(null);

      const response = await fetch(
        `${API_BASE}/quotes/${quote.id}/finalize`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw await responseError(
          response,
          'Could not approve and issue this quote.',
        );
      }

      setNotice({
        kind: 'success',
        text: `Quote ${quote.quote_number} approved and issued. It has not been sent to the client.`,
      });

      await fetchQuotes();
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not approve and issue this quote.',
      });
    } finally {
      setSendingId(null);
    }
  };

  const openDeliveryDialog = (quote: QuoteCardData) => {
    setNotice(null);
    setDeliveryQuote(quote);
    setDeliveryEmail(quote.client_email?.trim() || '');
  };

  const closeDeliveryDialog = () => {
    if (deliveryBusy) return;
    setDeliveryQuote(null);
    setDeliveryEmail('');
  };

  const handleDeliverQuote = async (method: DeliveryMethod) => {
    if (!deliveryQuote) return;

    const quote = deliveryQuote;
    const email = deliveryEmail.trim();

    if (method === 'email') {
      if (!email) {
        setNotice({
          kind: 'error',
          text: 'Enter the client’s email address, or choose WhatsApp.',
        });
        return;
      }

      // Basic client-side guard; the API validates the address as well.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNotice({
          kind: 'error',
          text: 'Enter a valid email address.',
        });
        return;
      }
    }

    // Open a tab synchronously from the click so the browser is less likely
    // to block WhatsApp as a popup. It is navigated after the API responds.
    const whatsappTab =
      method === 'whatsapp' ? window.open('about:blank', '_blank') : null;

    try {
      setDeliveryBusy(true);
      setSendingId(quote.id);
      setNotice(null);

      // Persist a newly entered address before asking the API to send email.
      if (method === 'email' && email !== (quote.client_email || '').trim()) {
        const clientResponse = await fetch(
          `${API_BASE}/clients/${quote.client_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email }),
          },
        );

        if (!clientResponse.ok) {
          throw await responseError(
            clientResponse,
            'Could not save the client email address.',
          );
        }
      }

      const sendResponse = await fetch(
        `${API_BASE}/quotes/${quote.id}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ send_email: method === 'email' }),
        },
      );

      const result = (await sendResponse
        .json()
        .catch(() => ({}))) as QuoteSendResult;

      if (!sendResponse.ok) {
        throw new Error(
          result.detail || result.message || 'Could not deliver this quote.',
        );
      }

      if (method === 'email') {
        if (!result.email_sent) {
          throw new Error(
            result.message ||
              'The quote was not emailed successfully. You can share it on WhatsApp instead.',
          );
        }

        setNotice({
          kind: 'success',
          text: `Quote ${quote.quote_number} emailed successfully to ${result.recipient_email || email}.`,
        });
      } else {
        const whatsappUrl =
          result.whatsapp_share_url || quote.whatsapp_share_url;

        if (!whatsappUrl) {
          whatsappTab?.close();
          throw new Error(
            'The quote was prepared, but the WhatsApp sharing link could not be created.',
          );
        }

        if (whatsappTab) {
          whatsappTab.location.href = whatsappUrl;
        } else {
          // If the browser blocked the new tab, provide a usable fallback.
          window.location.href = whatsappUrl;
        }

        setNotice({
          kind: 'success',
          text: `Quote ${quote.quote_number} is ready to share on WhatsApp. Review the message and send it to the client.`,
        });
      }

      setDeliveryQuote(null);
      setDeliveryEmail('');
      await fetchQuotes();
    } catch (error: unknown) {
      whatsappTab?.close();

      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not deliver this quote.',
      });
    } finally {
      setDeliveryBusy(false);
      setSendingId(null);
    }
  };

  const handleConvert = async (quote: QuoteCardData) => {
    try {
      setConvertingId(quote.id);
      setNotice(null);

      const response = await fetch(
        `${API_BASE}/quotes/${quote.id}/convert`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw await responseError(
          response,
          'Could not convert this quote to an invoice.',
        );
      }

      const invoice = await response.json();

      setNotice({
        kind: 'success',
        text: `Quote ${quote.quote_number} is now invoice ${invoice.invoice_number}.`,
      });

      await fetchQuotes();
      window.setTimeout(() => router.push('/invoices'), 1500);
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Network error while converting the quote.',
      });
    } finally {
      setConvertingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: quotes.length,
      draft: quotes.filter((quote) => quote.status === 'draft').length,
      sent: quotes.filter((quote) => quote.status === 'sent').length,
      viewed: quotes.filter((quote) => quote.status === 'viewed').length,
      accepted: quotes.filter((quote) => quote.status === 'accepted').length,
      declined: quotes.filter((quote) => quote.status === 'declined').length,
      converted: quotes.filter((quote) => quote.status === 'converted').length,
      expired: quotes.filter((quote) => quote.is_expired).length,
    }),
    [quotes],
  );

  const visible = quotes.filter((quote) => {
    if (!statusFilter) return true;
    if (statusFilter === 'expired') return quote.is_expired;
    return quote.status === statusFilter;
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
          <Plus aria-hidden className="h-4 w-4" />
          New quote
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
          <p className="text-body text-text-soft">
            Check your connection and try again.
          </p>
          <Button variant="outline" zone="calm" onClick={() => void fetchQuotes()}>
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
            <Plus aria-hidden className="h-4 w-4" />
            Create a quote
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              sending={sendingId === quote.id}
              converting={convertingId === quote.id}
              onFinalize={() => void handleFinalize(quote)}
              onSend={() => openDeliveryDialog(quote)}
              onConvert={() => void handleConvert(quote)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={deliveryQuote !== null}
        onClose={closeDeliveryDialog}
        title={
          deliveryQuote
            ? `Send quote ${deliveryQuote.quote_number}`
            : 'Send quote'
        }
        className="max-h-[90dvh] overflow-y-auto"
      >
        {deliveryQuote && (
          <div className="space-y-4">
            <p className="text-body text-text-soft">
              Choose how to share this issued quote with{' '}
              <strong>{deliveryQuote.client_name || 'your client'}</strong>.
              Issuing the quote does not send it automatically.
            </p>

            <Field
              label="Client email"
              hint={
                deliveryEmail.trim()
                  ? 'This address will be saved to the client record before email is sent.'
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
                disabled={deliveryBusy}
                onClick={closeDeliveryDialog}
              >
                Cancel
              </Button>

              <Button
                zone="calm"
                loading={deliveryBusy}
                disabled={!deliveryEmail.trim()}
                onClick={() => void handleDeliverQuote('email')}
              >
                Send by email
              </Button>

              <Button
                zone="calm"
                variant="outline"
                loading={deliveryBusy}
                onClick={() => void handleDeliverQuote('whatsapp')}
              >
                Share via WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}