'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  StopCircle,
  User,
  X,
} from 'lucide-react';

import {
  Button,
  Card,
  Dialog,
  Field,
  buttonStyles,
  inputStyles,
} from '@/components/ui';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { RecurringSchedule, RecurringLineItem } from '../page';

const API_BASE = '/api';

interface Occurrence {
  invoice_id: string;
  invoice_number?: string | null;
  invoice_status: string;
  period_key: string;
  period_start: string;
  period_end: string;
  recurring_label: string;
  due_date?: string | null;
  total_minor: number;
  currency: string;
  created_at: string;
}

interface ClientDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export default function RecurringScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const scheduleId = resolvedParams.id;
  const router = useRouter();

  const [schedule, setSchedule] = useState<RecurringSchedule | null>(null);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog states
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [schedRes, occRes] = await Promise.all([
        fetch(`${API_BASE}/recurring-invoices/${scheduleId}`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE}/recurring-invoices/${scheduleId}/invoices`, {
          credentials: 'include',
        }),
      ]);

      if (!schedRes.ok) {
        throw new Error('Recurring schedule not found');
      }

      const schedData: RecurringSchedule = await schedRes.json();
      setSchedule(schedData);

      if (occRes.ok) {
        const occData = await occRes.json();
        setOccurrences(Array.isArray(occData) ? occData : occData.items || []);
      }

      if (schedData.client_id) {
        const clientRes = await fetch(
          `${API_BASE}/clients/${schedData.client_id}`,
          { credentials: 'include' },
        );
        if (clientRes.ok) {
          setClient(await clientRes.json());
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  async function handlePause() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${API_BASE}/recurring-invoices/${scheduleId}/pause`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to pause schedule');
      }
      setShowPauseDialog(false);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to pause');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${API_BASE}/recurring-invoices/${scheduleId}/resume`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ missed_period_policy: 'skip_missed' }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to resume schedule');
      }
      setShowResumeDialog(false);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to resume');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${API_BASE}/recurring-invoices/${scheduleId}/cancel`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to cancel schedule');
      }
      setShowCancelDialog(false);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-danger" />
        <h2 className="mt-4 text-heading font-black text-ink">Schedule not found</h2>
        <p className="mt-1 text-body text-text-soft">{error}</p>
        <div className="mt-6">
          <Link
            href="/recurring-invoices"
            className={buttonStyles({ variant: 'outline' })}
          >
            Back to recurring schedules
          </Link>
        </div>
      </div>
    );
  }

  const subtotalMinor = schedule.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_minor,
    0,
  );
  const taxMinor = Math.round(subtotalMinor * (schedule.tax_rate_percent / 100));
  const whtMinor = Math.round(subtotalMinor * (schedule.wht_rate_percent / 100));
  const totalMinor = subtotalMinor + taxMinor - whtMinor;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Back button */}
      <div>
        <Link
          href="/recurring-invoices"
          className="inline-flex items-center gap-1.5 text-caption font-bold text-text-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to recurring schedules
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-card border-brut bg-surface p-6 shadow-brut-sm sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title-l font-black text-ink">{schedule.name}</h1>
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-caption font-black uppercase tracking-wider',
                schedule.status === 'active'
                  ? 'border-ink bg-leaf text-[#052E1B]'
                  : schedule.status === 'paused'
                  ? 'border-ink bg-sun text-[#4A3200]'
                  : 'border-line bg-surface-tint text-text-soft',
              )}
            >
              {schedule.status}
            </span>
          </div>

          <p className="text-body text-text-soft">
            Client:{' '}
            {client ? (
              <Link
                href={`/clients/${client.id}`}
                className="font-bold text-ink underline hover:text-mango"
              >
                {client.name}
              </Link>
            ) : (
              <span className="font-bold text-ink">Client</span>
            )}
            {' • '}
            <span>Frequency: {schedule.frequency}</span>
            {' • '}
            <span>Mode: {schedule.issue_mode === 'auto_issue' ? 'Auto issue' : 'Draft lead'}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {schedule.status === 'active' && (
            <button
              type="button"
              onClick={() => setShowPauseDialog(true)}
              className={buttonStyles({ variant: 'outline' })}
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
          )}

          {schedule.status === 'paused' && (
            <button
              type="button"
              onClick={() => setShowResumeDialog(true)}
              className={buttonStyles({ zone: 'calm' })}
            >
              <Play className="h-4 w-4" /> Resume
            </button>
          )}

          {(schedule.status === 'active' || schedule.status === 'paused') && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className={buttonStyles({ variant: 'outline' })}
            >
              <StopCircle className="h-4 w-4 text-danger" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-caption font-bold text-text-soft">Cycle Value</p>
          <Money
            amountMinor={totalMinor}
            currency={schedule.currency}
            className="mt-1 text-title font-black text-ink"
          />
          <p className="text-[12px] text-text-muted">per {schedule.frequency}</p>
        </Card>

        <Card className="p-4">
          <p className="text-caption font-bold text-text-soft">Next Run Date</p>
          <p className="mt-1 text-title font-black text-ink">
            {formatDate(schedule.next_run_date)}
          </p>
          <p className="text-[12px] text-text-muted">
            Lead: {schedule.draft_lead_days} days draft
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-caption font-bold text-text-soft">Generated Invoices</p>
          <p className="mt-1 text-title font-black text-ink">
            {schedule.generated_count}
          </p>
          <p className="text-[12px] text-text-muted">total created</p>
        </Card>

        <Card className="p-4">
          <p className="text-caption font-bold text-text-soft">End Condition</p>
          <p className="mt-1 text-title font-black text-ink">
            {schedule.end_rule === 'never'
              ? 'Never'
              : schedule.end_rule === 'after_count'
              ? `${schedule.end_after_count} runs`
              : formatDate(schedule.end_date ?? '')}
          </p>
          <p className="text-[12px] text-text-muted">rule: {schedule.end_rule}</p>
        </Card>
      </div>

      {/* Line Items Card */}
      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-heading font-black text-ink">Recurring items</h2>
        <div className="space-y-2">
          {schedule.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-card border border-line bg-surface-tint/40 p-3"
            >
              <div>
                <p className="font-bold text-ink">{item.description}</p>
                <p className="text-caption text-text-soft">
                  Qty: {item.quantity} × <Money amountMinor={item.unit_price_minor} currency={schedule.currency} />
                </p>
              </div>
              <Money
                amountMinor={item.quantity * item.unit_price_minor}
                currency={schedule.currency}
                className="font-bold text-ink"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end space-y-1 border-t border-line pt-3 text-caption text-text-soft">
          <div className="flex w-64 justify-between">
            <span>Subtotal:</span>
            <Money amountMinor={subtotalMinor} currency={schedule.currency} />
          </div>
          {taxMinor > 0 && (
            <div className="flex w-64 justify-between">
              <span>Tax ({schedule.tax_rate_percent}%):</span>
              <Money amountMinor={taxMinor} currency={schedule.currency} />
            </div>
          )}
          {whtMinor > 0 && (
            <div className="flex w-64 justify-between">
              <span>WHT ({schedule.wht_rate_percent}%):</span>
              <span>-<Money amountMinor={whtMinor} currency={schedule.currency} /></span>
            </div>
          )}
          <div className="flex w-64 justify-between border-t border-line pt-1 text-body font-black text-ink">
            <span>Total:</span>
            <Money amountMinor={totalMinor} currency={schedule.currency} />
          </div>
        </div>
      </Card>

      {/* Generated Invoices List */}
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-black text-ink">Generated invoices</h2>
          <span className="text-caption text-text-muted">
            {occurrences.length} {occurrences.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        {occurrences.length === 0 ? (
          <div className="rounded-card border border-dashed border-line p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-2 font-bold text-ink">No invoices generated yet</p>
            <p className="mt-1 text-caption text-text-soft">
              The first invoice draft will be generated on {formatDate(schedule.next_run_date)}.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {occurrences.map((occ) => (
              <Link
                key={occ.invoice_id}
                href={`/invoices/${occ.invoice_id}`}
                className="flex items-center justify-between rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink hover:bg-surface-tint"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-ink">
                      {occ.invoice_number || 'Draft'}
                    </p>
                    <span className="text-caption text-text-muted">
                      ({occ.period_key})
                    </span>
                  </div>
                  <p className="text-caption text-text-soft">
                    Period: {formatDate(occ.period_start)} – {formatDate(occ.period_end)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money
                    amountMinor={occ.total_minor}
                    currency={occ.currency}
                    className="text-amount-s font-bold"
                  />
                  <StatusPill status={occ.invoice_status} />
                  <ExternalLink className="h-4 w-4 text-text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Pause Dialog */}
      <Dialog
        open={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        title="Pause recurring schedule"
      >
        <div className="space-y-4 p-4">
          <p className="text-body text-text-soft">
            Pausing this schedule halts future invoice generation. No new drafts or automatic charges will be created while paused.
          </p>
          {actionError && (
            <p className="text-caption font-bold text-danger">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handlePause}
              loading={actionLoading}
            >
              Confirm pause
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog
        open={showResumeDialog}
        onClose={() => setShowResumeDialog(false)}
        title="Resume recurring schedule"
      >
        <div className="space-y-4 p-4">
          <p className="text-body text-text-soft">
            Resuming reactivates generation. Any billing periods that elapsed while paused will be skipped and will not be backfilled.
          </p>
          {actionError && (
            <p className="text-caption font-bold text-danger">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowResumeDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleResume}
              loading={actionLoading}
            >
              Confirm resume
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="Cancel recurring schedule"
      >
        <div className="space-y-4 p-4">
          <p className="text-body text-text-soft">
            Are you sure you want to cancel this recurring schedule? This action cannot be undone. Already-issued invoices will remain intact.
          </p>
          {actionError && (
            <p className="text-caption font-bold text-danger">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={actionLoading}
            >
              Keep schedule
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              loading={actionLoading}
              className="border-danger text-danger hover:bg-danger/10"
            >
              Cancel schedule
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
