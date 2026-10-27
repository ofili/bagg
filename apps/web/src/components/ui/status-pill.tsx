import { cn } from '@/lib/cn';

/** Status pill. The word is always shown; colour only reinforces it (DESIGN.md sections 3.3 and 8.5). */
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

const STYLES: Record<Status, { classes: string; label: string }> = {
  paid: { classes: 'bg-pill-paid text-pill-paid-fg', label: 'paid' },
  'due-soon': { classes: 'bg-pill-due text-pill-due-fg', label: 'due soon' },
  late: { classes: 'bg-pill-late text-pill-late-fg', label: 'late' },
  draft: { classes: 'bg-pill-draft text-pill-draft-fg', label: 'draft' },
  awaiting: { classes: 'bg-pill-due text-pill-due-fg', label: 'awaiting approval' },
  pending: { classes: 'bg-pill-pending text-pill-pending-fg', label: 'pending' },
  upcoming: { classes: 'bg-pill-draft text-pill-draft-fg', label: 'upcoming' },
  accepted: { classes: 'bg-pill-draft text-pill-draft-fg', label: 'accepted' },
  void: { classes: 'bg-pill-void text-pill-void-fg', label: 'not active' },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: Status;
  /** Override the default word, for example "due in 3 days" or "2 days late". */
  label?: string;
  className?: string;
}) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-small px-2 py-0.5 text-caption font-extrabold',
        style.classes,
        className,
      )}
    >
      {label ?? style.label}
    </span>
  );
}
