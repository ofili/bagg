import { cn } from '@/lib/cn';

/** Lowercase wordmark with the pink squiggle. Use for the website, documents and footers. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-start leading-none', className)}>
      <span className="text-title-l text-text">bagg</span>
      <svg aria-hidden width="48" height="8" viewBox="0 0 48 8" className="-mt-0.5">
        <path
          d="M2 4 Q7 0 12 4 T22 4 T32 4 T42 4"
          fill="none"
          stroke="var(--bagg-pink)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
