"use client";

import { DollarSign } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { summarizeRecordedCosts } from "@/lib/vault/recorded-cost";
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
  const { totals, excluded, unchecked } = summarizeRecordedCosts(entries);
  const display = totals.map(([currency, total]) => `${currency} ${total.toFixed(2)}`).join(" · ") || "—";
  const coreCount = entries.filter((e) => e.is_default_stack).length;

  return (
    <div className={cn(osGlassControlClassName, "flex min-h-9 flex-wrap items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium")}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{language.startsWith("zh") ? "每月費用估計" : "Estimated monthly cost"}</span>
      </div>
      <span className="font-semibold tabular-nums text-foreground">{display}</span>
      <span className="basis-full text-xs font-normal text-muted-foreground">{language.startsWith("zh") ? `按你記錄的金額及週期換算；不換匯或核對最新定價。未計入（金額、幣別或週期不完整／非定期）：${excluded}。定價超過 90 天未核對或無核對日期：${unchecked}。` : `Based on your recorded amounts and billing periods; no currency conversion or live price check. Excluded (missing amount, currency or recurring period): ${excluded}. Pricing unchecked or older than 90 days: ${unchecked}.`}</span>
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
