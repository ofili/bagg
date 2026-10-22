'use client';

interface MoneyProps {
  amountMinor: number;
  currency: string;
  variant?: 'total' | 'paid' | 'outstanding' | 'muted' | 'negative';
  className?: string;
  hideCurrencyCode?: boolean;
  nowrap?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, { symbol: string; decimals: number }> = {
  NGN: { symbol: '₦', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GHS: { symbol: 'GH₵', decimals: 2 },
  KES: { symbol: 'KSh', decimals: 2 },
  ZAR: { symbol: 'R', decimals: 2 },
};

export function Money({
  amountMinor,
  currency,
  variant = 'total',
  className = '',
  hideCurrencyCode = false,
  nowrap = true,
}: MoneyProps) {
  const conf = CURRENCY_SYMBOLS[currency] || { symbol: currency, decimals: 2 };
  const major = (amountMinor || 0) / 100;
  const isNegative = major < 0;
  const absMajor = Math.abs(major);

  const formatted = absMajor.toLocaleString(undefined, {
    minimumFractionDigits: conf.decimals,
    maximumFractionDigits: conf.decimals,
  });

  const sign = isNegative ? '−' : '';
  const currencyCode = hideCurrencyCode ? '' : ` ${currency}`;

  const variantClass =
    variant === 'negative'
      ? 'text-red-700'
      : variant === 'outstanding'
      ? 'text-emerald-700'
      : variant === 'muted'
      ? 'text-neutral-500'
      : 'text-neutral-900';

  return (
    <span
      className={`font-mono font-semibold tabular-nums ${nowrap ? 'whitespace-nowrap' : ''} ${variantClass} ${className}`}
    >
      {sign}{conf.symbol}{formatted}{currencyCode}
    </span>
  );
}
