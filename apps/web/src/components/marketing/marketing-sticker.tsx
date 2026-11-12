
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type MarketingStickerTone = 'mango' | 'pink' | 'sun' | 'ink';

interface MarketingStickerProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: MarketingStickerTone;
    tilt?: 'left' | 'right' | 'none';
    size?: 'sm' | 'md';
}

const toneClasses: Record<MarketingStickerTone, string> = {
    mango: 'bg-mango text-on-mango',
    pink: 'bg-pink text-on-pink',
    sun: 'bg-sun text-on-sun',
    ink: 'bg-ink text-surface',
};

const tiltClasses = {
    left: '-rotate-3',
    right: 'rotate-3',
    none: 'rotate-0',
};

export function MarketingSticker({
                                     tone = 'mango',
                                     tilt = 'right',
                                     size = 'md',
                                     className,
                                     children,
                                     ...props
                                 }: MarketingStickerProps) {
    return (
        <span
            className={cn(
                'inline-flex w-fit items-center justify-center',
                'border-brut border-ink font-extrabold uppercase tracking-wide',
                'shadow-brut-sm',
                size === 'sm'
                    ? 'px-2 py-1 text-[10px]'
                    : 'px-3 py-1.5 text-caption',
                toneClasses[tone],
                tiltClasses[tilt],
                className,
            )}
            {...props}
        >
      {children}
    </span>
    );
}
