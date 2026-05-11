"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type BudgetCategoryRowProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  categoryName: string;
  spent: number;
  limit: number;
  onRequestEdit?: () => void;
  onRequestDelete?: () => void;
};

export function BudgetCategoryRow({
  copy,
  language,
  displayCurrency,
  categoryName,
  spent,
  limit,
  onRequestEdit,
  onRequestDelete,
}: BudgetCategoryRowProps) {
  const dc = displayCurrency.trim().toUpperCase();
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : spent > 0 ? 100 : 0;
  const over = limit > 0 && spent > limit;

  return (
    <div className="rounded-lg border border-amber-200/55 bg-gradient-to-br from-amber-50/50 via-card/90 to-violet-50/40 p-3 ring-1 ring-foreground/10 dark:border-amber-900/35 dark:from-amber-950/25 dark:via-card/85 dark:to-violet-950/20">
      <div className="flex items-center justify-between gap-2">
        <p className={cn(typography.subheading, "min-w-0 flex-1 truncate")}>{categoryName}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className={cn(typography.caption, "tabular-nums text-muted-foreground pr-1")}>
            {formatBudgetSpentLine(copy, language, dc, spent, limit)}
          </span>
          {onRequestEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={copy.actionsEdit}
              onClick={onRequestEdit}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
          {onRequestDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={copy.actionsDelete}
              onClick={onRequestDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <Progress value={pct} className="mt-2">
        <ProgressTrack>
          <ProgressIndicator
            className={cn(
              over
                ? "bg-gradient-to-r from-rose-500 to-orange-500"
                : "bg-gradient-to-r from-violet-500 to-sky-500",
            )}
            data-slot="progress-indicator"
          />
        </ProgressTrack>
      </Progress>
    </div>
  );
}

function formatBudgetSpentLine(
  copy: FinanceUiCopy,
  language: AppLocale,
  currency: string,
  spent: number,
  limit: number,
): string {
  const s = formatFinanceCurrency(spent, currency, language);
  const l = formatFinanceCurrency(limit, currency, language);
  return copy.budgetSpentOfTemplate.replace("{spent}", s).replace("{limit}", l);
}
