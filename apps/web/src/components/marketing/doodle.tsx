/**
 * Doodle — approved decorative marks for the home page.
 * See DESIGN.md §7.2 (Doodle kit rules) for constraints.
 *
 * All variants:
 *   - aria-hidden + pointer-events-none — purely decorative
 *   - Hidden below the sm breakpoint
 *   - 2 px ink stroke with round caps; one accent fill from the brand palette
 *   - Never on pricing, security, legal or checkout pages
 */

import { cn } from "@/lib/cn";

const INK = "#3A1F0A";
const PINK = "#FF4F8B";
const MANGO = "#FF7A1A";
const YELLOW = "#FFC933";

type DoodleVariant =
  | "flow-path"
  | "curl-arrow"
  | "milestone-star"
  | "currency-glyphs";

interface DoodleProps {
  variant: DoodleVariant;
  className?: string;
}

export function Doodle({ variant, className }: DoodleProps) {
  const base =
    "pointer-events-none hidden select-none sm:block";

  switch (variant) {
    /**
     * flow-path — dashed arc that visually links the three How it Works
     * cards on desktop. Sits in the gutter between cards, aria-hidden.
     */
    case "flow-path":
      return (
        <svg
          viewBox="0 0 320 48"
          fill="none"
          aria-hidden="true"
          className={cn(base, "w-full", className)}
        >
          <path
            d="M10 36 C60 8, 140 8, 160 24 S260 42, 310 14"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 5"
          />
          {/* arrowhead at the end */}
          <path
            d="M304 10 L312 14 L306 20"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    /**
     * curl-arrow — hand-drawn curl pointing left toward the secondary CTA.
     */
    case "curl-arrow":
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className={cn(base, "h-12 w-12", className)}
        >
          <path
            d="M38 8 C38 8, 12 10, 10 28 C9 36, 16 42, 24 38"
            stroke={PINK}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* arrowhead */}
          <path
            d="M18 32 L24 38 L28 30"
            stroke={PINK}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    /**
     * milestone-star — four-point sparkle / star mark. Used in CtaBand.
     */
    case "milestone-star":
      return (
        <svg
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
          className={cn(base, "h-10 w-10", className)}
        >
          {/* outer star */}
          <path
            d="M20 2 L23 17 L38 20 L23 23 L20 38 L17 23 L2 20 L17 17 Z"
            fill={YELLOW}
            stroke={INK}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* centre dot */}
          <circle cx="20" cy="20" r="2.5" fill={INK} />
        </svg>
      );

    /**
     * currency-glyphs — tilted ₦ $ £ € characters beside the currency frame.
     */
    case "currency-glyphs":
      return (
        <svg
          viewBox="0 0 96 56"
          fill="none"
          aria-hidden="true"
          className={cn(base, "h-14 w-24", className)}
        >
          <text
            x="8"
            y="34"
            fontSize="22"
            fontWeight="800"
            fill={MANGO}
            stroke={INK}
            strokeWidth="0.5"
            transform="rotate(-12 8 34)"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            ₦
          </text>
          <text
            x="30"
            y="22"
            fontSize="20"
            fontWeight="800"
            fill={INK}
            transform="rotate(8 30 22)"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            $
          </text>
          <text
            x="52"
            y="38"
            fontSize="20"
            fontWeight="800"
            fill={PINK}
            stroke={INK}
            strokeWidth="0.4"
            transform="rotate(-6 52 38)"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            £
          </text>
          <text
            x="72"
            y="24"
            fontSize="20"
            fontWeight="800"
            fill={INK}
            transform="rotate(10 72 24)"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            €
          </text>
        </svg>
      );
  }
}
