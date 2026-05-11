import type { AppLocale } from "@/lib/i18n/app-locale";
import { appLocaleToIntlNumberLocale } from "@/lib/finance/intl-number-locale";

export function formatFinanceCurrency(
  amount: number,
  currencyCode: string,
  locale: AppLocale,
  options?: { compact?: boolean },
): string {
  const cur = currencyCode.trim().toUpperCase();
  const nf = new Intl.NumberFormat(appLocaleToIntlNumberLocale(locale), {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: options?.compact ? "compact" : "standard",
    compactDisplay: options?.compact ? "short" : undefined,
  });
  return nf.format(amount);
}
