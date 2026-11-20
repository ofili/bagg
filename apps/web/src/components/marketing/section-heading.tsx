import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  copy?: ReactNode;
  align?: "left" | "center";
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  copyClassName?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
  className,
  eyebrowClassName,
  titleClassName,
  copyClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "w-full",
        align === "center" && "mx-auto max-w-2xl text-center",
        align === "left" && "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            "mb-3 text-caption font-extrabold uppercase tracking-[0.16em] text-link",
            eyebrowClassName,
          )}
        >
          {eyebrow}
        </div>
      )}

      <h2
        className={cn(
          "text-[clamp(1.5rem,4vw,2rem)] font-extrabold leading-tight tracking-tight text-ink",
          titleClassName,
        )}
      >
        {title}
      </h2>

      {copy && (
        <div
          className={cn(
            "mt-3 text-body-l leading-relaxed text-text-soft",
            copyClassName,
          )}
        >
          {copy}
        </div>
      )}
    </div>
  );
}
