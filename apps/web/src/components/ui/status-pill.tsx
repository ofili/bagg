
import { cn } from '@/lib/cn';

export type Status =
  | 'paid'
  | 'due-soon'
  | 'late'
  | 'draft'
  | 'awaiting'
  | 'pending'
  | 'upcoming'
  | 'accepted'
  | 'void';

type StatusStyle = {
  classes: string;
  label: string;
};

const STYLES: Record<Status, StatusStyle> = {
  paid: {
    classes: 'bg-status-paid text-status-paid-fg',
    label: 'paid',
  },
  'due-soon': {
    classes: 'bg-status-due text-status-due-fg',
    label: 'due soon',
  },
  late: {
    classes: 'bg-status-late text-status-late-fg',
    label: 'late',
  },
  draft: {
    classes: 'bg-status-draft text-status-draft-fg',
    label: 'draft',
  },
  awaiting: {
    classes: 'bg-status-due text-status-due-fg',
    label: 'awaiting approval',
  },
  pending: {
    classes: 'bg-status-pending text-status-pending-fg',
    label: 'pending',
  },
  upcoming: {
    classes: 'bg-status-draft text-status-draft-fg',
    label: 'upcoming',
  },
  accepted: {
    classes: 'bg-status-pending text-status-pending-fg',
    label: 'accepted',
  },
  void: {
    classes: 'bg-status-void text-status-void-fg',
    label: 'not active',
  },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const style = STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-small px-2 py-0.5',
        'text-caption font-extrabold',
        style.classes,
        className,
      )}
    >
      {label ?? style.label}
    </span>
  );
}
