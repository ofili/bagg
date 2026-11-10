'use client';

interface MoneyProps {
  amountMinor: number;
  currency: string;
  variant?: 'total' | 'paid' | 'outstanding' | 'muted' | 'negative' | 'inherit';
  className?: string;
  hideCurrencyCode?: boolean;
  showCurrencyCode?: boolean;
  compact?: boolean;
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

function formatCompact(major: number): string {
  const abs = Math.abs(major);
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 2).replace(/\.00$/, '');
    return `${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 2).replace(/\.00$/, '');
    return `${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1).replace(/\.0$/, '');
    return `${val}K`;
  }
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function Money({
  amountMinor,
  currency,
  variant = 'total',
  className = '',
  hideCurrencyCode = true,
  showCurrencyCode = false,
  compact = false,
  nowrap = true,
}: MoneyProps) {
  const conf = CURRENCY_SYMBOLS[currency] || { symbol: currency ? `${currency} ` : '', decimals: 2 };
  const major = (amountMinor || 0) / 100;
  const isNegative = major < 0;
  const absMajor = Math.abs(major);

  // Fixed locale so server and client render the same string (no hydration mismatch)
  const fullFormatted = absMajor.toLocaleString('en-US', {
    minimumFractionDigits: conf.decimals,
    maximumFractionDigits: conf.decimals,
  });

  const formatted = compact ? formatCompact(absMajor) : fullFormatted;
  const sign = isNegative ? '−' : '';
  const currencyCode = showCurrencyCode ? ` ${currency}` : '';

  // Green means paid, nothing else. Outstanding amounts stay in the normal text colour.
  const variantClass =
    variant === 'inherit'
      ? ''
      : variant === 'negative'
      ? 'text-danger dark:text-[#FFB3A8]'
      : variant === 'paid'
      ? 'text-[#0F6B45] dark:text-[#3DD598]'
      : variant === 'muted'
      ? 'text-text-muted'
      : 'text-text';

  return (
    <span
      title={compact ? `${sign}${conf.symbol}${fullFormatted}` : undefined}
      className={`tabular-nums font-extrabold ${nowrap ? 'whitespace-nowrap' : ''} ${variantClass} ${className}`}
    >
      {sign}{conf.symbol}{formatted}{currencyCode}
    </span>
  );
}
