
import { CURRENCIES } from '@/lib/money';
import { cn } from '@/lib/cn';

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

function compactNumber(value: number, locale: string): string {
  const abs = Math.abs(value);
  const formatter = (maximumFractionDigits: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits });

  if (abs >= 1_000_000_000) return `${formatter(2).format(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${formatter(2).format(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${formatter(1).format(value / 1_000)}K`;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function Money({
  amountMinor,
  currency,
  variant = 'total',
  className,
  hideCurrencyCode = false,
  showCurrencyCode = false,
  compact = false,
  nowrap = true,
}: MoneyProps) {
  const config = CURRENCIES[currency as keyof typeof CURRENCIES];

  const symbol = config?.symbol ?? `${currency} `;
  const locale = config?.locale ?? 'en-US';
  const factor = config?.factor ?? 100;
  const decimals = config?.decimals ?? 2;

  const safeAmount = Number.isFinite(amountMinor) ? amountMinor : 0;
  const major = safeAmount / factor;
  const negative = major < 0;
  const absolute = Math.abs(major);

  const formatted = compact
    ? compactNumber(absolute, locale)
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(absolute);

  const variantClass = {
    inherit: '',
    negative: 'text-danger dark:text-[#FFB3A8]',
    paid: 'text-status-paid-fg',
    muted: 'text-text-muted',
    total: 'text-text',
    outstanding: 'text-text',
  }[variant];

  const currencySuffix =
    showCurrencyCode && !hideCurrencyCode ? ` ${currency}` : '';

  return (
    <span
      title={
        compact
          ? `${negative ? '−' : ''}${symbol}${new Intl.NumberFormat(locale, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(absolute)}${currencySuffix}`
          : undefined
      }
      className={cn(
        'tabular-nums font-extrabold',
        nowrap && 'whitespace-nowrap',
        variantClass,
        className,
      )}
    >
      {negative ? '−' : ''}
      {symbol}
      {formatted}
      {currencySuffix}
    </span>
  );
}
