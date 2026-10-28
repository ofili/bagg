import { cn } from '@/lib/cn';

/** App icon and favicon mark: orange sticker coin, dashed border, lowercase b, tilted 8 degrees. */
export function BaggCoin({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      role="img"
      aria-label="bagg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0 -rotate-[8deg]', className)}
    >
      <circle cx="16" cy="16" r="14.5" fill="var(--bagg-mango)" stroke="var(--ink)" strokeWidth="2" strokeDasharray="3 2.5" />
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fontSize="20"
        fontWeight="800"
        fill="#2B1405"
        style={{ fontFamily: 'var(--font-bricolage), system-ui, sans-serif' }}
      >
        b
      </text>
    </svg>
  );
}

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
