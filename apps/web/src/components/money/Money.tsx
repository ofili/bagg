
import { CURRENCIES, formatCompactNumber } from '@/lib/money';
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
    ? formatCompactNumber(absolute, locale)
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(absolute);

  const variantClass = {
    inherit: '',
    negative: 'text-status-late-fg',
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
