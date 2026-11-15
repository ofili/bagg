import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PageContainerWidth = 'form' | 'list' | 'wide' | 'full';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: PageContainerWidth;
  children: ReactNode;
  className?: string;
}

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
  form: 'max-w-[960px]',
  list: 'max-w-[1200px]',
  wide: 'max-w-[1280px]',
  full: 'max-w-full',
};

export function PageContainer({
  width = 'list',
  children,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6',
        WIDTH_CLASSES[width],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
