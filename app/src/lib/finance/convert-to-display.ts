import type { FrankfurterLatestResponse } from "@/lib/fx/types";

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Convert `amount` in `sourceCurrency` into Frankfurter `fx.base` (display currency)
 * using `rates[source]` as units of source per 1 base (e.g. TWD per 1 USD).
 */
export function convertAmountToFxBase(
  amount: number,
  sourceCurrency: string,
  fx: Pick<FrankfurterLatestResponse, "base" | "rates">,
): number {
  const src = sourceCurrency.trim().toUpperCase();
  const base = fx.base.trim().toUpperCase();
  if (!Number.isFinite(amount)) return 0;
  if (src === base) return round2(amount);
  const r = fx.rates[src];
  if (typeof r !== "number" || !Number.isFinite(r) || r === 0) return round2(amount);
  return round2(amount / r);
}
