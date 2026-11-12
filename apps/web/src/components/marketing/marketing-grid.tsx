
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface MarketingGridProps extends HTMLAttributes<HTMLDivElement> {
    columns?: 2 | 3;
    gap?: 'sm' | 'md' | 'lg';
}

const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
};

const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-5',
    lg: 'gap-5 sm:gap-6 lg:gap-8',
};

export function MarketingGrid({
                                  columns = 3,
                                  gap = 'md',
                                  className,
                                  children,
                                  ...props
                              }: MarketingGridProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-1 items-stretch',
                columnClasses[columns],
                gapClasses[gap],
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
