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

/** Lowercase wordmark with the pink squiggle. Used on the website, documents and footers. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-title font-extrabold tracking-tight text-ink">bagg</span>
      <Squiggle className="mt-0.5 h-1.5 w-9 text-pink" />
    </span>
  );
}

export const BAG_MOODS = [
  'happy',
  'sleepy',
  'excited',
  'superExcited',
  'sad',
  'confused',
  'worried',
  'thinking',
  'locked',
  'celebrating',
] as const;

export type BagMood = (typeof BAG_MOODS)[number];

const INK = '#3A1F0A';
const MANGO = '#FF7A1A';
const PINK = '#FF4F8B';
const YELLOW = '#FFC933';
const TEAR = '#8FD3FF';
const GREEN = '#1FA971';

const LABELS: Record<BagMood, string> = {
  happy: 'Happy bagg character',
  sleepy: 'Sleepy bagg character',
  excited: 'Excited bagg character',
  superExcited: 'Super excited bagg character',
  sad: 'Sad bagg character',
  confused: 'Confused bagg character',
  worried: 'Worried bagg character',
  thinking: 'Thinking bagg character',
  locked: 'bagg character guarding locked files',
  celebrating: 'Celebrating bagg character',
};

/** Tilt in degrees, pivoting at the bottom centre so the bag stays planted. */
const TILT: Record<BagMood, number> = {
  happy: 0,
  sleepy: 0,
  excited: 4,
  superExcited: -6,
  sad: 0,
  confused: 7,
  worried: -3,
  thinking: 3,
  locked: 0,
  celebrating: -4,
};

const stroke = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, fill: 'none' };

function Face({ mood }: { mood: BagMood }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <circle cx="15" cy="23" r="2.2" fill={INK} />
          <circle cx="25" cy="23" r="2.2" fill={INK} />
          <path d="M16 28 Q20 32 24 28" {...stroke} />
        </>
      );

    case 'sleepy':
      return (
        <>
          <path d="M12 22 L18 22" {...stroke} />
          <path d="M22 22 L28 22" {...stroke} />
          <ellipse cx="20" cy="30" rx="3" ry="2" fill={INK} />
        </>
      );

    case 'excited':
      return (
        <>
          <circle cx="15" cy="22.5" r="2.7" fill={INK} />
          <circle cx="25" cy="22.5" r="2.7" fill={INK} />
          <circle cx="16" cy="21.5" r="0.9" fill="#fff" />
          <circle cx="26" cy="21.5" r="0.9" fill="#fff" />
          <path d="M15.5 27.5 Q20 35 24.5 27.5 Z" fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );

    case 'superExcited':
      return (
        <>
          {/* happy-closed eyes */}
          <path d="M12.5 24 Q15 19.5 17.5 24" {...stroke} />
          <path d="M22.5 24 Q25 19.5 27.5 24" {...stroke} />
          <path d="M14.5 27 Q20 37 25.5 27 Z" fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M17.5 31.5 Q20 29.5 22.5 31.5 Q20 34 17.5 31.5 Z" fill={PINK} />
          {/* sparkles */}
          <path d="M34 5 L35.2 8 L38.2 9.2 L35.2 10.4 L34 13.4 L32.8 10.4 L29.8 9.2 L32.8 8 Z" fill={YELLOW} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M5.5 6 L6.3 8 L8.3 8.8 L6.3 9.6 L5.5 11.6 L4.7 9.6 L2.7 8.8 L4.7 8 Z" fill={YELLOW} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        </>
      );

    case 'sad':
      return (
        <>
          <circle cx="15" cy="23.5" r="2.2" fill={INK} />
          <circle cx="25" cy="23.5" r="2.2" fill={INK} />
          {/* brows slope up toward the middle */}
          <path d="M11.5 19.5 L17 18" {...stroke} strokeWidth="1.6" />
          <path d="M28.5 19.5 L23 18" {...stroke} strokeWidth="1.6" />
          <path d="M16 31.5 Q20 27.5 24 31.5" {...stroke} />
          <path d="M15 26.5 Q16.8 29.2 15 30.4 Q13.2 29.2 15 26.5 Z" fill={TEAR} stroke={INK} strokeWidth="1" />
        </>
      );

    case 'confused':
      return (
        <>
          <circle cx="15" cy="23" r="2.7" fill={INK} />
          <circle cx="25" cy="23.5" r="1.6" fill={INK} />
          <path d="M22 19 L28 18" {...stroke} strokeWidth="1.6" />
          <path d="M16 30 Q18 27.5 20 30 T24 30" {...stroke} strokeWidth="1.8" />
          <text
            x="33"
            y="12"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill={INK}
            style={{ fontFamily: 'var(--font-bricolage), system-ui, sans-serif' }}
          >
            ?
          </text>
        </>
      );

    case 'worried':
      return (
        <>
          <circle cx="15" cy="23.5" r="2.2" fill={INK} />
          <circle cx="25" cy="23.5" r="2.2" fill={INK} />
          <path d="M11.5 18.5 L17 20" {...stroke} strokeWidth="1.6" />
          <path d="M28.5 18.5 L23 20" {...stroke} strokeWidth="1.6" />
          <path d="M16 30.5 Q18 28.5 20 30.5 T24 30.5" {...stroke} strokeWidth="1.8" />
          <path d="M33 14 Q35 17.5 33 19 Q31 17.5 33 14 Z" fill={TEAR} stroke={INK} strokeWidth="1" />
        </>
      );

    case 'locked':
      return (
        <>
          {/* calm, closed eyes: the bag is on guard, not upset */}
          <path d="M12.5 22.5 Q15 25.5 17.5 22.5" {...stroke} />
          <path d="M22.5 22.5 Q25 25.5 27.5 22.5" {...stroke} />
          <path d="M17 28.5 Q20 31 23 28.5" {...stroke} />
          {/* padlock badge */}
          <path d="M31 8 V6.2 a2.5 2.5 0 0 1 5 0 V8" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="29" y="7.5" width="9" height="7.5" rx="1.8" fill={YELLOW} stroke={INK} strokeWidth="1.5" />
          <circle cx="33.5" cy="10.8" r="1" fill={INK} />
          <path d="M33.5 11 L33.5 13" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );

    case 'celebrating':
      return (
        <>
          <path d="M12.5 24 Q15 19.5 17.5 24" {...stroke} />
          <path d="M22.5 24 Q25 19.5 27.5 24" {...stroke} />
          <path d="M15 27.5 Q20 36 25 27.5 Z" fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          {/* confetti */}
          <rect x="3" y="7" width="3.4" height="1.8" rx="0.6" fill={PINK} transform="rotate(30 4.7 7.9)" />
          <circle cx="8" cy="3.5" r="1.3" fill={YELLOW} />
          <rect x="33" y="3" width="3.4" height="1.8" rx="0.6" fill={GREEN} transform="rotate(-25 34.7 3.9)" />
          <circle cx="37" cy="10" r="1.3" fill={PINK} />
          <rect x="2" y="16" width="3.4" height="1.8" rx="0.6" fill={GREEN} transform="rotate(-35 3.7 16.9)" />
          <circle cx="36.5" cy="18" r="1.2" fill={YELLOW} />
          <rect x="29.5" y="8" width="3" height="1.6" rx="0.5" fill={YELLOW} transform="rotate(50 31 8.8)" />
        </>
      );

    case 'thinking':
      return (
        <>
          {/* eyes glance up and to the right */}
          <circle cx="16" cy="22" r="2.4" fill={INK} />
          <circle cx="26" cy="22" r="2.4" fill={INK} />
          <circle cx="16.9" cy="21" r="0.8" fill="#fff" />
          <circle cx="26.9" cy="21" r="0.8" fill="#fff" />
          <path d="M17 30 L23 30" {...stroke} />
          <circle cx="30" cy="9" r="1.1" fill={INK} />
          <circle cx="33.5" cy="7" r="1.5" fill={INK} />
          <circle cx="37" cy="4.5" r="1.9" fill={INK} />
        </>
      );
  }
}

/** Product character for empty states, onboarding, feedback and error moments. */
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : LABELS[mood]}
      aria-hidden={decorative ? true : undefined}
    >
      <g transform={`rotate(${TILT[mood]} 20 37)`}>
        <path d="M13 13 Q13 4 20 4 Q27 4 27 13" fill="none" stroke={PINK} strokeWidth="3" strokeLinecap="round" />
        <rect x="5" y="13" width="30" height="24" rx="9" fill={MANGO} stroke={INK} strokeWidth="2" />
        <circle cx="11" cy="28" r="2.5" fill={PINK} />
        <circle cx="29" cy="28" r="2.5" fill={PINK} />
        <Face mood={mood} />
      </g>
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
