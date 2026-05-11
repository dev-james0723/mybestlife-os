import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import { convertAmountToFxBase } from "@/lib/finance/convert-to-display";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";

export function transactionSourceCurrency(
  tx: FinanceTransactionWithRelations,
  displayCurrency: string,
): string {
  const c = tx.account?.currency?.trim().toUpperCase();
  return c && c.length === 3 ? c : displayCurrency.trim().toUpperCase();
}

export function convertTransactionAmountToDisplay(
  tx: FinanceTransactionWithRelations,
  displayCurrency: string,
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined,
): number {
  const amt = Number(tx.amount);
  if (!Number.isFinite(amt)) return 0;
  if (!fx) return amt;
  const base = fx.base.trim().toUpperCase();
  const disp = displayCurrency.trim().toUpperCase();
  if (base !== disp) return amt;
  const src = transactionSourceCurrency(tx, displayCurrency);
  return convertAmountToFxBase(amt, src, fx);
}
