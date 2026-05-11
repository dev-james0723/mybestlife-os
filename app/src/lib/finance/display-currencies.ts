/** Curated ISO 4217 codes supported for Finance display (Frankfurter covers these). */
export const FINANCE_DISPLAY_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "TWD",
  "JPY",
  "CNY",
  "KRW",
  "HKD",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
  "SEK",
  "NOK",
  "NZD",
  "THB",
  "VND",
  "IDR",
  "MYR",
  "PHP",
] as const;

export type FinanceDisplayCurrencyCode = (typeof FINANCE_DISPLAY_CURRENCY_CODES)[number];

export function isFinanceDisplayCurrencyCode(value: string): value is FinanceDisplayCurrencyCode {
  return (FINANCE_DISPLAY_CURRENCY_CODES as readonly string[]).includes(value);
}

export function normalizeDisplayCurrencyCode(value: string): FinanceDisplayCurrencyCode {
  const upper = value.trim().toUpperCase();
  if (isFinanceDisplayCurrencyCode(upper)) return upper;
  return "USD";
}
