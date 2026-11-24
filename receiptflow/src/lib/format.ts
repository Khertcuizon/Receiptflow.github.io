import { parseLocalDate } from './dates';

export const DEFAULT_CURRENCY = 'PHP';
export const DEFAULT_LOCALE = 'en-PH';

export interface Formatters {
  currency: string;
  locale: string;
  money: (value: number | string | null | undefined) => string;
  /** Money without the currency symbol/fraction noise, for compact chart axes. */
  moneyCompact: (value: number) => string;
  date: (value: string | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  percent: (value: number) => string;
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

function safe<T>(factory: () => T, fallback: () => T): T {
  try {
    return factory();
  } catch {
    return fallback();
  }
}

export function createFormatters(currency: string = DEFAULT_CURRENCY, locale: string = DEFAULT_LOCALE): Formatters {
  const money = safe(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency }),
    () => new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }),
  );
  const compact = safe(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
    () => new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY, notation: 'compact' }),
  );
  const dateLocale = safe(
    () => Intl.DateTimeFormat.supportedLocalesOf(locale)[0] ?? DEFAULT_LOCALE,
    () => DEFAULT_LOCALE,
  );

  return {
    currency,
    locale,
    money: (value) => money.format(Number(value ?? 0) || 0),
    moneyCompact: (value) => compact.format(Number(value) || 0),
    date: (value, options = DEFAULT_DATE_OPTIONS) => {
      const parsed = parseLocalDate(value);
      if (!parsed) return '—';
      return new Intl.DateTimeFormat(dateLocale, options).format(parsed);
    },
    percent: (value) => `${Math.round(value)}%`,
  };
}

export const CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: 'PHP', label: 'PHP — Philippine Peso (₱)' },
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
];
