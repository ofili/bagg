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
    className: 'bg-[#E6DAC6] text-[#5A4A35]',
    icon: FileEdit,
  },
  sent: {
    label: 'Open',
    className: 'bg-peach-chip text-text',
    icon: Send,
  },
  viewed: {
    label: 'Open',
    className: 'bg-peach-chip text-text',
    icon: Eye,
  },
  payment_claimed: {
    label: 'Needs review',
    className: 'bg-sun text-[#4A3200]',
    icon: Clock3,
  },
  partially_paid: {
    label: 'Partially paid',
    className: 'bg-[#FFF1C2] text-[#8A6200]',
    icon: CircleDashed,
  },
  paid: {
    label: 'Paid',
    className: 'bg-leaf text-[#052E1B]',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#EFE6D8] text-[#8A6A50]',
    icon: XCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-[#FFB3B3] text-[#5A1010]',
    icon: AlertTriangle,
  },
  processing: {
    label: 'Processing',
    className: 'bg-[#FFF1C2] text-[#8A6200]',
    icon: Loader2,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-[#E6DAC6] text-[#5A4A35]',
    icon: ThumbsUp,
  },
  declined: {
    label: 'Declined',
    className: 'bg-[#EFE6D8] text-[#8A6A50]',
    icon: ThumbsDown,
  },
  expired: {
    label: 'Expired',
    className: 'bg-[#EFE6D8] text-[#8A6A50]',
    icon: TimerOff,
  },
  converted: {
    label: 'Converted to invoice',
    className: 'bg-[#E6DAC6] text-[#5A4A35]',
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
