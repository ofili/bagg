import { CurrencyCode } from '@bagg/api-client';

export interface CurrencyDisplay {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  factor: number;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDisplay> = {
  NGN: { code: 'NGN', symbol: '₦', decimals: 2, factor: 100, locale: 'en-NG' },
  USD: { code: 'USD', symbol: '$', decimals: 2, factor: 100, locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, factor: 100, locale: 'en-GB' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, factor: 100, locale: 'de-DE' },
  GHS: { code: 'GHS', symbol: 'GH₵', decimals: 2, factor: 100, locale: 'en-GH' },
  KES: { code: 'KES', symbol: 'KSh', decimals: 2, factor: 100, locale: 'en-KE' },
  ZAR: { code: 'ZAR', symbol: 'R', decimals: 2, factor: 100, locale: 'en-ZA' },
};

export type MoneyContext = 'document' | 'list';

export function currencyDecimals(currency: string | CurrencyCode, context: MoneyContext = 'document') {
  if (context === 'list' && currency === 'NGN') return 0;
  return (CURRENCIES[currency as CurrencyCode] || CURRENCIES.NGN).decimals;
}

export function formatMoney(
  amountMinor: number,
  currency: string | CurrencyCode = 'NGN',
  context: MoneyContext = 'document',
): string {
  const conf = CURRENCIES[currency as CurrencyCode] || CURRENCIES.NGN;
  const decimals = currencyDecimals(currency, context);
  const major = (amountMinor || 0) / conf.factor;
  const formatted = new Intl.NumberFormat(conf.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
  return `${conf.symbol}${formatted}`;
}
