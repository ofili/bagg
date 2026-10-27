import type { Status } from '@/components/ui/status-pill';

export type DocumentStatus =
  | 'draft'
  | 'issued'
  | 'sent'
  | 'viewed'
  | 'payment_claimed'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'overdue'
  | 'processing'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted';

export interface StatusDisplay {
  status: Status;
  label: string;
}

function daysUntil(dueDate: string | null | undefined, now: Date): number | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function lateLabel(days: number) {
  const late = Math.abs(days);
  return `${late} ${late === 1 ? 'day' : 'days'} late`;
}

/**
 * Maps backend document statuses to the design status words (DESIGN.md 3.3).
 * Open documents resolve against their due date so the pill always answers
 * "what do I need to know now?" rather than repeating the database value.
 */
export function documentStatus({
  status,
  dueDate,
  remainingMinor,
  totalMinor,
  now = new Date(),
}: {
  status?: string | null;
  dueDate?: string | null;
  remainingMinor?: number;
  totalMinor?: number;
  now?: Date;
} = {}): StatusDisplay {
  const raw = (status || 'draft').toLowerCase();
  const days = daysUntil(dueDate, now);
  const remaining = remainingMinor ?? totalMinor;

  switch (raw) {
    case 'paid':
      return { status: 'paid', label: 'paid' };
    case 'draft':
      return { status: 'draft', label: 'draft' };
    case 'payment_claimed':
      return { status: 'awaiting', label: 'needs review' };
    case 'processing':
      return { status: 'pending', label: 'processing' };
    case 'overdue':
      return { status: 'late', label: days === null ? 'late' : lateLabel(days) };
    case 'cancelled':
      return { status: 'void', label: 'cancelled' };
    case 'declined':
      return { status: 'void', label: 'declined' };
    case 'expired':
      return { status: 'void', label: 'expired' };
    case 'converted':
      return { status: 'accepted', label: 'converted' };
    case 'accepted':
      return { status: 'accepted', label: 'accepted' };
    case 'partially_paid': {
      if (days !== null && days < 0) return { status: 'late', label: `part paid · ${lateLabel(days)}` };
      if (days !== null && days <= 7) {
        return { status: 'due-soon', label: days === 0 ? 'part paid · due today' : `part paid · due in ${days} days` };
      }
      return { status: 'pending', label: 'part paid' };
    }
    case 'issued':
    case 'sent':
    case 'viewed': {
      if (remaining !== undefined && remaining <= 0) return { status: 'paid', label: 'paid' };
      if (days !== null && days < 0) return { status: 'late', label: lateLabel(days) };
      if (days !== null && days === 0) return { status: 'due-soon', label: 'due today' };
      if (days !== null && days <= 7) return { status: 'due-soon', label: `due in ${days} days` };
      return { status: 'upcoming', label: raw === 'issued' ? 'sent' : raw };
    }
    default:
      return { status: 'draft', label: raw.replace(/_/g, ' ') };
  }
}
