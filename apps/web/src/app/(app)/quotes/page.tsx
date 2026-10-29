'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, MessageSquare, Plus } from 'lucide-react';
import { BaggCoin } from '@/components/brand/Logo';
import { type QuoteCardData } from '@/components/mobile/QuoteCard';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { formatDate } from '@/lib/date';
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  buttonStyles,
  DataTable,
  type ColumnDef,
  Pagination,
  TableToolbar,
} from '@/components/ui';
import { useDataTable } from '@/hooks/useDataTable';

const API_BASE = '/api';

type Notice = {
  kind: 'success' | 'error';
  text: string;
};

type DeliveryMethod = 'email' | 'whatsapp';

async function responseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  return new Error(body.detail || body.message || fallback);
}

const QUOTE_STATUS_CHIPS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'converted', label: 'Converted' },
  { value: 'expired', label: 'Expired' },
];

export default function QuotesPage() {
  const router = useRouter();

  const table = useDataTable<QuoteCardData>({
    endpoint: '/quotes',
    defaultSortBy: 'sequence_number',
    defaultSortOrder: 'desc',
    defaultPerPage: 20,
  });

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [deliveryQuote, setDeliveryQuote] = useState<QuoteCardData | null>(null);
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryBusy, setDeliveryBusy] = useState(false);

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

    try {
      setDeliveryBusy(true);
      setSendingId(quote.id);
      setNotice(null);

      const response = await fetch(`${API_BASE}/quotes/${quote.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipient_email: email || undefined,
          delivery_channel: method,
        }),
      });

      if (!response.ok) {
        throw await responseError(response, 'Could not send this quote.');
      }

      const result = await response.json();

      if (method === 'whatsapp' && result.whatsapp_share_url) {
        window.open(result.whatsapp_share_url, '_blank');
      }

      setNotice({
        kind: 'success',
        text:
          method === 'email'
            ? `Quote ${quote.quote_number} sent to ${email}.`
            : `Quote ${quote.quote_number} ready to send via WhatsApp.`,
      });

      closeDeliveryDialog();
      table.reload();
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to send the quote.',
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

      table.reload();
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

  const columns: ColumnDef<QuoteCardData>[] = [
    {
      key: 'sequence_number',
      header: 'Quote',
      align: 'left',
      sortable: true,
      render: (quote) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/quotes/${quote.id}`}
            className="font-bold underline-offset-4 hover:underline"
          >
            {quote.quote_number}
          </Link>
          {(quote.comment_count ?? 0) > 0 && (
            <span
              title={`${quote.comment_count} comment${(quote.comment_count ?? 0) > 1 ? 's' : ''}`}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface-tint px-1.5 py-0.5 text-caption font-bold text-ink"
            >
              <MessageSquare className="h-3 w-3 text-ink-muted" />
              <span>{quote.comment_count}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'client_name',
      header: 'Customer',
      align: 'left',
      render: (quote) => quote.client_name || 'Unnamed client',
    },
    {
      key: 'issue_date',
      header: 'Created',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (quote) => formatDate(quote.issue_date),
    },
    {
      key: 'expires_at',
      header: 'Expires',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (quote) => {
        const expired =
          (quote.is_expired || quote.effective_status === 'expired') &&
          !['accepted', 'converted'].includes(quote.status);
        return (
          <span className={expired ? 'font-bold text-danger' : ''}>
            {formatDate(quote.expires_at)}
          </span>
        );
      },
    },
    {
      key: 'total_minor',
      header: 'Total',
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (quote) => (
        <Money
          amountMinor={quote.net_payable_minor}
          currency={quote.currency}
          hideCurrencyCode
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'left',
      sortable: true,
      cellClassName: 'whitespace-nowrap',
      render: (quote) => {
        const expired =
          (quote.is_expired || quote.effective_status === 'expired') &&
          !['accepted', 'converted'].includes(quote.status);
        return (
          <StatusPill
            status={
              expired ? 'expired' : quote.effective_status || quote.status
            }
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (quote) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {quote.status === 'draft' && (
            <Link
              href={`/quotes/${quote.id}`}
              className={buttonStyles({
                variant: 'outline',
                zone: 'calm',
              })}
            >
              View
            </Link>
          )}

          {['issued', 'sent', 'viewed'].includes(quote.status) && (
            <Button
              zone="calm"
              variant="outline"
              loading={sendingId === quote.id}
              onClick={() => openDeliveryDialog(quote)}
            >
              Send
            </Button>
          )}

          {quote.status === 'accepted' && (
            <Button
              zone="calm"
              loading={convertingId === quote.id}
              onClick={() => void handleConvert(quote)}
            >
              Convert to invoice
            </Button>
          )}

          {quote.status === 'converted' && (
            <Link
              href={
                quote.invoice_id
                  ? `/invoices/${quote.invoice_id}`
                  : '/invoices'
              }
              className={buttonStyles({
                variant: 'outline',
                zone: 'calm',
              })}
            >
              View invoice
            </Link>
          )}
        </div>
      ),
    },
  ];

  const emptyState = (
    <Card tone="peach" className="space-y-4 p-8 text-center">
      <BaggCoin size={48} className="mx-auto" />
      <h2 className="text-title">no quotes here</h2>
      <p className="mx-auto max-w-sm text-body text-text-soft">
        {table.search.trim() || table.filters['status']
          ? 'No quotes match your current search and filters.'
          : 'Create your first quote with an expiry date and an optional upfront deposit.'}
      </p>
      <Link href="/quotes/new" className={buttonStyles({ size: 'lg' })}>
        <Plus aria-hidden className="h-4 w-4" />
        Create a quote
      </Link>
    </Card>
  );

  const renderMobileCard = (quote: QuoteCardData) => (
    <Card zone="calm" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/quotes/${quote.id}`}
            className="font-bold underline-offset-4 hover:underline"
          >
            {quote.quote_number}
          </Link>
          <p className="mt-1 text-body text-text-soft">
            {quote.client_name || 'Unnamed client'}
          </p>
        </div>
        <Money
          amountMinor={quote.net_payable_minor}
          currency={quote.currency}
          className="shrink-0 font-bold"
          hideCurrencyCode
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-body">
        <span className="text-text-soft">
          Expires {formatDate(quote.expires_at)}
        </span>
        <StatusPill status={quote.effective_status || quote.status} />
      </div>

      {quote.status === 'draft' && (
        <Link
          href={`/quotes/${quote.id}`}
          className={buttonStyles({
            variant: 'outline',
            zone: 'calm',
            fullWidth: true,
          })}
        >
          View draft quote
        </Link>
      )}

      {['issued', 'sent', 'viewed'].includes(quote.status) && (
        <Button
          zone="calm"
          fullWidth
          loading={sendingId === quote.id}
          onClick={() => openDeliveryDialog(quote)}
        >
          Send quote
        </Button>
      )}

      {quote.status === 'accepted' && (
        <Button
          zone="calm"
          fullWidth
          loading={convertingId === quote.id}
          onClick={() => void handleConvert(quote)}
        >
          Convert to invoice
        </Button>
      )}

      {quote.status === 'converted' && (
        <Link
          href={
            quote.invoice_id
              ? `/invoices/${quote.invoice_id}`
              : '/invoices'
          }
          className={buttonStyles({
            variant: 'outline',
            zone: 'calm',
            fullWidth: true,
          })}
        >
          View invoice
        </Link>
      )}
    </Card>
  );

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

      {/* Unified Toolbar: Chips, Search */}
      <TableToolbar
        chips={QUOTE_STATUS_CHIPS}
        chipValue={table.filters['status'] || ''}
        onChipChange={(v) => table.setFilter('status', v)}
        chipLabel="Filter quotes by status"
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search quote number, customer or status"
      />

      {table.error && (
        <Card zone="calm" className="space-y-3 p-6">
          <h2 className="text-heading">we couldn&rsquo;t load your quotes</h2>
          <p className="text-body text-text-soft">
            Check your connection and try again.
          </p>
          <Button variant="outline" zone="calm" onClick={() => table.reload()}>
            Try again
          </Button>
        </Card>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        rows={table.data?.items ?? []}
        getRowKey={(quote) => quote.id}
        loading={table.loading}
        emptyState={emptyState}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSort={table.toggleSort}
        renderMobileCard={renderMobileCard}
        tableClassName="min-w-[850px]"
        caption="Quotes table"
      />

      {/* Pagination */}
      {table.data && (
        <Pagination
          page={table.page}
          totalPages={table.data.total_pages}
          total={table.data.total}
          perPage={table.perPage}
          onPageChange={table.setPage}
          onPerPageChange={table.setPerPage}
        />
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
