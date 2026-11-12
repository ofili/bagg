
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface KeyValueItem {
  key: string;
  label: string;
  value: ReactNode;
  className?: string;
}

export interface KeyValueListProps {
  items: readonly KeyValueItem[];
  layout?: 'stacked' | 'inline';
  className?: string;
}

export function KeyValueList({
  items,
  layout = 'inline',
  className,
}: KeyValueListProps) {
  return (
    <dl
      className={cn(
        layout === 'stacked'
          ? 'space-y-3'
          : 'divide-y divide-line-subtle',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            'flex gap-4',
            layout === 'stacked'
              ? 'flex-col gap-1'
              : 'items-start justify-between py-3 first:pt-0 last:pb-0',
            item.className,
          )}
        >
          <dt className="shrink-0 text-body text-text-muted">
            {item.label}
          </dt>
          <dd
            className={cn(
              'min-w-0 text-body font-semibold text-text',
              layout === 'inline' && 'text-right',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
