"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import { convertTransactionAmountToDisplay } from "@/lib/finance/transaction-display";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

export type TransactionRowProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined;
  fxReady: boolean;
  transaction: FinanceTransactionWithRelations;
  onEdit: (transactionId: string) => void;
  onRequestDelete: (transactionId: string) => void;
};

export const TransactionRow = memo(function TransactionRow({
  copy,
  language,
  displayCurrency,
  fx,
  fxReady,
  transaction: t,
  onEdit,
  onRequestDelete,
}: TransactionRowProps) {
  const dc = displayCurrency.trim().toUpperCase();
  const amount = fxReady ? convertTransactionAmountToDisplay(t, dc, fx) : Number(t.amount);
  const formatted = formatFinanceCurrency(Math.abs(amount), dc, language);
  const dateStr = format(parseISO(t.transaction_date), "PP", { locale: getDateFnsLocale(language) });
  const title = t.description?.trim() || copy.transactionNoNote;
  const subtitle = [t.account?.name, t.category?.name].filter(Boolean).join(" · ");

  const typeLabel =
    t.type === "income" ? copy.typeIncome : t.type === "expense" ? copy.typeExpense : copy.typeTransfer;

  const signed =
    t.type === "income" ? (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <Plus className="h-4 w-4 shrink-0" aria-hidden />
        {formatted}
      </span>
    ) : t.type === "expense" ? (
      <span className="inline-flex items-center gap-1 text-destructive">
        <Minus className="h-4 w-4 shrink-0" aria-hidden />
        {formatted}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
        {formatted}
      </span>
    );

  const accent =
    t.type === "income"
      ? "border-l-emerald-500"
      : t.type === "expense"
        ? "border-l-rose-500"
        : "border-l-violet-400 dark:border-l-violet-500";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-l-4 bg-card/60 p-3 pl-2.5 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between",
        accent,
        t.type === "income" &&
          "bg-gradient-to-r from-emerald-50/50 via-card/80 to-card/60 dark:from-emerald-950/20 dark:via-card/90 dark:to-card/70",
        t.type === "expense" &&
          "bg-gradient-to-r from-rose-50/45 via-card/80 to-card/60 dark:from-rose-950/18 dark:via-card/90 dark:to-card/70",
        t.type === "transfer" &&
          "bg-gradient-to-r from-violet-50/40 via-card/80 to-sky-50/35 dark:from-violet-950/15 dark:via-card/90 dark:to-sky-950/15",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {typeLabel}
          </Badge>
          <p className={cn(typography.subheading, "truncate")}>{title}</p>
        </div>
        {subtitle ? (
          <p className={cn(typography.caption, "mt-0.5 truncate text-muted-foreground")}>{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="flex flex-col items-end justify-center gap-0.5 sm:text-right">
          <span className={cn(typography.body, "font-medium tabular-nums")}>{signed}</span>
          <time className={typography.caption} dateTime={t.transaction_date}>
            {dateStr}
          </time>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" />}
            aria-label={copy.actionsMenuAria}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(t.id)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              {copy.actionsEdit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onRequestDelete(t.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              {copy.actionsDelete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
