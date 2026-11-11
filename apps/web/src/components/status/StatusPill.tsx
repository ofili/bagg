import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  FileEdit,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  TimerOff,
  XCircle,
} from 'lucide-react';

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

const STATUS_META: Record<
  DocumentStatus,
  { label: string; className: string; icon: typeof FileEdit }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-status-draft text-status-draft-fg',
    icon: FileEdit,
  },
  issued: {
    label: 'Issued',
    className: 'bg-surface-tint text-text',
    icon: FileEdit,
  },
  sent: {
    label: 'Open',
    className: 'bg-surface-tint text-text',
    icon: Send,
  },
  viewed: {
    label: 'Open',
    className: 'bg-surface-tint text-text',
    icon: Eye,
  },
  payment_claimed: {
    label: 'Needs review',
    className: 'bg-status-pending text-status-pending-fg',
    icon: Clock3,
  },
  partially_paid: {
    label: 'Partially paid',
    className: 'bg-status-due text-status-due-fg',
    icon: CircleDashed,
  },
  paid: {
    label: 'Paid',
    className: 'bg-status-paid text-status-paid-fg',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-status-void text-status-void-fg',
    icon: XCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-status-late text-status-late-fg',
    icon: AlertTriangle,
  },
  processing: {
    label: 'Processing',
    className: 'bg-status-pending text-status-pending-fg',
    icon: Loader2,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-status-draft text-status-draft-fg',
    icon: ThumbsUp,
  },
  declined: {
    label: 'Declined',
    className: 'bg-status-void text-status-void-fg',
    icon: ThumbsDown,
  },
  expired: {
    label: 'Expired',
    className: 'bg-status-void text-status-void-fg',
    icon: TimerOff,
  },
  converted: {
    label: 'Converted to invoice',
    className: 'bg-status-draft text-status-draft-fg',
    icon: ArrowRightCircle,
  },
};

const SUB_LABELS: Record<DocumentStatus, string | null> = {
  draft: null,
  issued: null,
  sent: 'Sent',
  viewed: 'Viewed',
  payment_claimed: null,
  partially_paid: null,
  paid: null,
  cancelled: null,
  overdue: null,
  processing: null,
  accepted: null,
  declined: null,
  expired: null,
  converted: null,
};

export function StatusPill({
  status,
  className = '',
  pulse = false,
  labelOverride,
  subLabel,
}: {
  status?: string | null;
  className?: string;
  pulse?: boolean;
  labelOverride?: string;
  subLabel?: string;
}) {
  const key = (status || 'draft') as DocumentStatus;
  const meta = STATUS_META[key] || STATUS_META.draft;
  const Icon = meta.icon;
  const label = labelOverride ?? meta.label;
  const sub = subLabel ?? SUB_LABELS[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-extrabold whitespace-nowrap ${meta.className} ${className}`}
    >
      <Icon aria-hidden className={`h-3 w-3 ${pulse ? 'animate-pulse' : ''}`} />
      <span className="leading-none">{label}</span>
      {sub && (
        <span className="ml-1 text-caption font-normal whitespace-nowrap">{sub}</span>
      )}
    </span>
  );
}
