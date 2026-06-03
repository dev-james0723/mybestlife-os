"use client";

import { DollarSign } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { parseMonthlyCost, isRecurringActive } from "@/stores/vault-store";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { cn } from "@/lib/utils";
import { osGlassControlClassName } from "@/components/ui/os-glass";

type Props = {
  entries: SoftwareVaultEntry[];
};

/** Monthly spend pill: sums paid/subscription apps currently marked Active. */
export function VaultCostDashboard({ entries }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const monthly = entries.reduce(
    (sum, entry) => (isRecurringActive(entry) ? sum + parseMonthlyCost(entry) : sum),
    0,
  );
  const display = monthly === 0 ? "$0" : `$${monthly.toFixed(2)}`;
  const coreCount = entries.filter((e) => e.is_default_stack).length;

  return (
    <div className={cn(osGlassControlClassName, "flex min-h-9 items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium")}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{copy.gallery.monthlyTotal}</span>
      </div>
      <span className="font-semibold tabular-nums text-foreground">{display}</span>
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <span className="text-muted-foreground">
        {copy.gallery.coreCount}: <span className="font-semibold text-foreground">{coreCount}</span>
      </span>
      <span className="text-muted-foreground">
        {copy.gallery.totalCount}: <span className="font-semibold text-foreground">{entries.length}</span>
      </span>
    </div>
  );
}
