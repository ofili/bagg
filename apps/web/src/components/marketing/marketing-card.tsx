import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type MarketingCardTone = 'surface' | 'mango' | 'pink' | 'sun';

interface MarketingCardProps extends HTMLAttributes<HTMLDivElement> {
    tone?: MarketingCardTone;
    featured?: boolean;
    interactive?: boolean;
}

const toneClasses: Record<MarketingCardTone, string> = {
    surface: 'bg-surface text-text',
    mango: 'bg-mango text-on-mango',
    pink: 'bg-pink text-on-pink',
    sun: 'bg-sun text-on-sun',
};

export function MarketingCard({
                                  tone = 'surface',
                                  featured = false,
                                  interactive = false,
                                  className,
                                  children,
                                  ...props
                              }: MarketingCardProps) {
    return (
        <div
            className={cn(
                'border-brut border-ink p-5 sm:p-6',
                toneClasses[tone],
                featured ? 'shadow-brut-lg' : 'shadow-brut',
                interactive &&
                'transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
