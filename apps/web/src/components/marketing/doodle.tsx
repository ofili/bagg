/**
 * Doodle — approved decorative marks for the home page.
 * See DESIGN.md §7.2 (Doodle kit rules) for constraints.
 *
 * All variants:
 *   - aria-hidden + pointer-events-none — purely decorative
 *   - Hidden below the lg breakpoint
 *   - 2 px stroke with round caps; colours come from theme tokens (stroke-ink, fill-sun...), never hex
 *   - Never on pricing, security, legal or checkout pages
 */

import { cn } from "@/lib/cn";

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
    "pointer-events-none hidden select-none lg:block";

  switch (variant) {
    /**
     * flow-path — dashed arc that visually links the three How it Works
     * cards on desktop across their top edge.
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
            className="stroke-ink"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 5"
          />
          {/* arrowhead at the end */}
          <path
            d="M304 10 L312 14 L306 20"
            className="stroke-ink"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    /**
     * curl-arrow — hand-drawn curl pointing down-right toward the secondary CTA.
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
            d="M8 10 C20 4, 34 8, 32 20 C30 28, 16 28, 18 20 C20 14, 30 16, 38 26"
            className="stroke-pink"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* arrowhead */}
          <path
            d="M30 24 L38 26 L36 18"
            className="stroke-pink"
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
            className="fill-sun stroke-ink"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* centre dot */}
          <circle cx="20" cy="20" r="2.5" className="fill-ink" />
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
            className="fill-mango stroke-ink"
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
            className="fill-ink"
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
            className="fill-pink stroke-ink"
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
            className="fill-ink"
            transform="rotate(10 72 24)"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            €
          </text>
        </svg>
      );
  }
}
