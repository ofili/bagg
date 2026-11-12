import { Money } from '@/components/money/Money';
import { cn } from '@/lib/cn';

export interface MoneyAmountProps {
  amountMinor: number;
  currency: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'paid' | 'muted' | 'negative';
  compact?: boolean;
  showCurrencyCode?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-body',
  md: 'text-body-l',
  lg: 'text-amount-m',
  xl: 'text-amount-l',
};

const TONE_VARIANTS = {
  default: 'total',
  paid: 'paid',
  muted: 'muted',
  negative: 'negative',
} as const;

export function MoneyAmount({
  amountMinor,
  currency,
  size = 'md',
  tone = 'default',
  compact = false,
  showCurrencyCode = false,
  className,
}: MoneyAmountProps) {
  return (
    <Money
      amountMinor={amountMinor}
      currency={currency}
      variant={TONE_VARIANTS[tone]}
      compact={compact}
      showCurrencyCode={showCurrencyCode}
      className={cn(SIZE_CLASSES[size], className)}
    />
  );
}