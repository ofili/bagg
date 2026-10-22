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
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    icon: FileEdit,
  },
  sent: {
    label: 'Open',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Send,
  },
  viewed: {
    label: 'Open',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Eye,
  },
  payment_claimed: {
    label: 'Needs review',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock3,
  },
  partially_paid: {
    label: 'Partially paid',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CircleDashed,
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  processing: {
    label: 'Processing',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Loader2,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: ThumbsUp,
  },
  declined: {
    label: 'Declined',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: ThumbsDown,
  },
  expired: {
    label: 'Expired',
    className: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    icon: TimerOff,
  },
  converted: {
    label: 'Converted to invoice',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: ArrowRightCircle,
  },
};

const SUB_LABELS: Record<DocumentStatus, string | null> = {
  draft: null,
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${meta.className} ${className}`}
    >
      <Icon className={`h-3 w-3 ${pulse ? 'animate-pulse' : ''}`} />
      <span className="leading-none">{label}</span>
      {sub && (
        <span className="ml-1 text-[10px] font-normal opacity-70 whitespace-nowrap">{sub}</span>
      )}
    </span>
  );
}
