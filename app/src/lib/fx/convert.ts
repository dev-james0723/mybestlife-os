import type { FrankfurterLatestResponse } from "@/lib/fx/types";

/**
 * Convert `amount` from `data.base` into `toCurrency` using Frankfurter `rates`
 * (each rate is units of quote currency per 1 unit of base).
 */
export function convertFromBase(
  amount: number,
  toCurrency: string,
  data: Pick<FrankfurterLatestResponse, "base" | "rates">,
): number {
  const to = toCurrency.trim().toUpperCase();
  if (to === data.base.trim().toUpperCase()) return amount;
  const rate = data.rates[to];
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error("FX_MISSING_RATE");
  }
  const out = amount * rate;
  return Math.round(out * 100) / 100;
}
