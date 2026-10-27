import { cn } from '@/lib/cn';

/* Brand pieces. See DESIGN.md sections 2 and 6.2. */

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 7" fill="none" aria-hidden="true" className={className}>
      <path
        d="M1 3.5 Q5 0.5 9 3.5 T17 3.5 T25 3.5 T33 3.5 T41 3.5 T50 3.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** App icon and favicon mark. Decorative: put an accessible name on the parent link. */
export function CoinLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 -rotate-[8deg] items-center justify-center rounded-full border-2 border-dashed border-cocoa bg-mango font-extrabold leading-none text-cocoa',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
    >
      b
    </span>
  );
}

/** Lowercase wordmark with the pink squiggle. Used on the website, documents and footers. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-title font-extrabold tracking-tight text-ink">bagg</span>
      <Squiggle className="mt-0.5 h-1.5 w-9 text-pink" />
    </span>
  );
}

type BagMood = 'happy' | 'sleepy';

/** Product character for empty states, onboarding and the 404 page. */
export function BagCharacter({
  mood = 'happy',
  size = 80,
  decorative = false,
  className,
}: {
  mood?: BagMood;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const label = mood === 'sleepy' ? 'Sleepy bagg character' : 'bagg character';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <path d="M13 13 Q13 4 20 4 Q27 4 27 13" fill="none" stroke="#FF4F8B" strokeWidth="3" strokeLinecap="round" />
      <rect x="5" y="13" width="30" height="24" rx="9" fill="#FF7A1A" stroke="#3A1F0A" strokeWidth="2" />
      {mood === 'sleepy' ? (
        <>
          <path d="M12 22 L18 22" stroke="#3A1F0A" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 22 L28 22" stroke="#3A1F0A" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="15" cy="23" r="2.2" fill="#3A1F0A" />
          <circle cx="25" cy="23" r="2.2" fill="#3A1F0A" />
        </>
      )}
      <circle cx="11" cy="28" r="2.5" fill="#FF4F8B" />
      <circle cx="29" cy="28" r="2.5" fill="#FF4F8B" />
      {mood === 'sleepy' ? (
        <ellipse cx="20" cy="30" rx="3" ry="2" fill="#3A1F0A" />
      ) : (
        <path d="M16 28 Q20 32 24 28" fill="none" stroke="#3A1F0A" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Paid stamp. Always sits beside the status word or amount, never alone. */
export function PaidStamp({ label = 'paid', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block -rotate-6 rounded-small border-[3px] border-double border-[#0F6B45] bg-[#D8F5E6] px-2.5 text-body font-extrabold text-[#0F6B45]',
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Milestone star. Earned is yellow with a dark outline; locked is grey and dashed. */
export function MilestoneStar({
  earned = true,
  size = 32,
  label,
  className,
}: {
  earned?: boolean;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn('-rotate-[8deg]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polygon
        points="20,3 24.8,14 36.5,15 27.6,22.8 30.4,34.5 20,28.3 9.6,34.5 12.4,22.8 3.5,15 15.2,14"
        fill={earned ? '#FFC933' : '#E8DCC8'}
        stroke={earned ? '#3A1F0A' : '#B8A98E'}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeDasharray={earned ? undefined : '3 2'}
      />
    </svg>
  );
}
