
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MarketingFrameProps extends HTMLAttributes<HTMLElement> {
    label?: string;
    meta?: string;
    caption?: ReactNode;
    children: ReactNode;
}

export function MarketingFrame({
                                   label,
                                   meta,
                                   caption,
                                   className,
                                   children,
                                   ...props
                               }: MarketingFrameProps) {
    return (
        <figure
            className={cn(
                'overflow-hidden border-brut border-ink',
                'bg-surface shadow-brut-lg',
                className,
            )}
            {...props}
        >
            {(label || meta) && (
                <div className="flex min-h-12 items-center justify-between gap-3 border-b-brut border-ink bg-cream px-4 py-3">
                    <p className="min-w-0 truncate text-label font-extrabold text-ink">
                        {label}
                    </p>
                    {meta && (
                        <span className="shrink-0 text-caption font-bold text-text-soft">
              {meta}
            </span>
                    )}
                </div>
            )}

            <div className="min-w-0">{children}</div>

            {caption && (
                <figcaption className="border-t border-line bg-surface px-4 py-3 text-caption text-text-soft">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
