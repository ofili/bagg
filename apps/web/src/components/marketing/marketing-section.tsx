import type { ReactNode } from "react";

import { Container } from "@/components/marketing/container";
import { cn } from "@/lib/cn";

export type MarketingSectionSpacing = "compact" | "default" | "large";
export type MarketingSectionBorder = "none" | "top" | "bottom" | "both";

type MarketingSectionProps = {
  children: ReactNode;
  spacing?: MarketingSectionSpacing;
  border?: MarketingSectionBorder;
  contained?: boolean;
  className?: string;
  containerClassName?: string;
  id?: string;
};

const spacingClasses: Record<MarketingSectionSpacing, string> = {
  compact: "py-12 sm:py-16",
  default: "py-16 sm:py-20 lg:py-24",
  large: "py-20 sm:py-28 lg:py-32",
};

const borderClasses: Record<MarketingSectionBorder, string> = {
  none: "",
  top: "border-t-2 border-ink",
  bottom: "border-b-2 border-ink",
  both: "border-y-2 border-ink",
};

export function MarketingSection({
  children,
  spacing = "default",
  border = "none",
  contained = true,
  className,
  containerClassName,
  id,
}: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={cn(spacingClasses[spacing], borderClasses[border], className)}
    >
      {contained ? (
        <Container className={containerClassName}>{children}</Container>
      ) : (
        children
      )}
    </section>
  );
}
