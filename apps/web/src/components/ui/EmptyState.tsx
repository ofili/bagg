/*
 * Save as apps/web/src/components/ui/EmptyState.tsx
 *
 * Needs the new BagCharacter and BagMood from '@/components/brand'
 * (export BagMood there if it isn't exported yet).
 * Class names and the buttonStyles() call match the 404 page.
 */
import Link from 'next/link';
import { BagCharacter, type BagMood } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type Action =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export type EmptyStateProps = {
  mood?: BagMood;
  title: string;
  body?: string;
  action?: Action;
  /** Smaller bag and tighter spacing for use inside a table or side panel. */
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  mood = 'happy',
  title,
  body,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'px-4 py-8' : 'px-4 py-14',
        className,
      )}
    >
      {/* The heading and text carry the meaning, so the bag is decorative. */}
      <BagCharacter mood={mood} size={compact ? 72 : 96} decorative />
      <h2 className="mt-3 text-title-l text-ink">{title}</h2>
      {body ? <p className="mt-1.5 max-w-sm text-body text-ink-soft">{body}</p> : null}
      {action ? (
        action.href ? (
          <Link href={action.href} className={cn(buttonStyles(), 'mt-5')}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={cn(buttonStyles(), 'mt-5')}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}

/* ---------- Presets: keep wording and moods consistent across tables ---------- */

export const emptyStates = {
  invoicesFirst: {
    mood: 'happy',
    title: 'No invoices yet',
    body: 'Create one and send it in a minute.',
    action: { label: 'Create invoice', href: '/invoices/new' },
  },
  quotesFirst: {
    mood: 'happy',
    title: 'No quotes yet',
    body: 'Send a quote and turn it into an invoice once it is accepted.',
    action: { label: 'Create quote', href: '/quotes/new' },
  },
  clientsFirst: {
    mood: 'happy',
    title: 'No clients yet',
    body: 'Add a client and their details fill in on every document.',
    action: { label: 'Add client', href: '/clients/new' },
  },
  noMatches: {
    mood: 'confused',
    title: 'Nothing matches that',
    body: 'Try a different search or clear the filters.',
  },
  allPaid: {
    mood: 'superExcited',
    title: 'All paid up',
    body: 'Nothing is outstanding right now.',
  },
  nothingToDo: {
    mood: 'sleepy',
    title: 'Nothing needs you right now',
    body: 'We will let you know when a client responds.',
  },
  // Shown where a client or provider looks for files that are still protected.
  // Pass `body` per engagement so it names the real condition, for example
  // body="These files unlock once invoice #0042 is paid." or "...once you approve the final version."
  filesLocked: {
    mood: 'locked',
    title: 'Files are locked for now',
    body: 'They unlock as soon as the agreed conditions are met.',
  },
  // Shown once, the first time a payment is confirmed. Keep it rare so it stays special.
  firstPayment: {
    mood: 'celebrating',
    title: 'Your first payment is in',
    body: 'Nice work. The receipt is on its way to your client.',
  },
} satisfies Record<string, EmptyStateProps>;
