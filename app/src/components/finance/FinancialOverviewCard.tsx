"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { convertAmountToFxBase } from "@/lib/finance/convert-to-display";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import { transactionSourceCurrency } from "@/lib/finance/transaction-display";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import type { FinanceAccount } from "@/types/database";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type FinancialOverviewCardProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined;
  fxReady: boolean;
  overviewLens: "month" | "year";
  onOverviewLensChange: (lens: "month" | "year") => void;
  accounts: FinanceAccount[] | undefined;
  transactions: FinanceTransactionWithRelations[] | undefined;
  accountsLoading: boolean;
  transactionsLoading: boolean;
  accountsError: boolean;
  transactionsError: boolean;
};

export function FinancialOverviewCard({
  copy,
  language,
  displayCurrency,
  fx,
  fxReady,
  overviewLens,
  onOverviewLensChange,
  accounts,
  transactions,
  accountsLoading,
  transactionsLoading,
  accountsError,
  transactionsError,
}: FinancialOverviewCardProps) {
  const dc = displayCurrency.trim().toUpperCase();

  const netWorth = useMemo(() => {
    if (!accounts?.length) return 0;
    let sum = 0;
    for (const a of accounts) {
      if (!a.is_active) continue;
      const bal = Number(a.balance);
      const cur = (a.currency ?? dc).trim().toUpperCase();
      if (fxReady && fx) {
        sum += convertAmountToFxBase(bal, cur, fx);
      } else {
        sum += bal;
      }
    }
    return sum;
  }, [accounts, dc, fx, fxReady]);

  const { income, expense } = useMemo(() => {
    if (!transactions?.length) return { income: 0, expense: 0 };
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (t.type === "transfer") continue;
      const amt = Number(t.amount);
      const converted = fxReady && fx ? convertAmountToFxBase(amt, transactionSourceCurrency(t, dc), fx) : amt;
      if (t.type === "income") inc += converted;
      if (t.type === "expense") exp += converted;
    }
    return { income: inc, expense: exp };
  }, [transactions, dc, fx, fxReady]);

  const loading = accountsLoading || transactionsLoading;
  const error = accountsError || transactionsError;
  const lensItems = [
    { id: "month" as const, label: copy.overviewLensMonth },
    { id: "year" as const, label: copy.overviewLensYear },
  ];

  return (
    <Card className="overflow-hidden ring-1 ring-foreground/10">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className={typography.heading}>{copy.overviewSectionTitle}</CardTitle>
          <p className={cn(typography.caption, "mt-1 max-w-prose")}>{copy.overviewSubtitle}</p>
        </div>
        <OSSegmentedControl
          items={lensItems}
          value={overviewLens}
          onValueChange={onOverviewLensChange}
          ariaLabel={copy.overviewSectionTitle}
          className="w-full shrink-0 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          layoutId="finance-overview-lens-active-pill"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {!fxReady && !loading && (
          <p className={cn(typography.caption, "text-muted-foreground")} role="status">
            {copy.overviewFxUnavailable}
          </p>
        )}
        {error ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.sectionLoadError}
          </p>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricBlock
              label={copy.overviewNetWorthLabel}
              value={formatFinanceCurrency(netWorth, dc, language)}
              icon={Wallet}
              emphasize
            />
            <MetricBlock
              label={copy.overviewIncomeLabel}
              value={formatFinanceCurrency(income, dc, language)}
              icon={TrendingUp}
              valueClassName="text-emerald-700 dark:text-emerald-400"
            />
            <MetricBlock
              label={copy.overviewExpenseLabel}
              value={formatFinanceCurrency(expense, dc, language)}
              icon={TrendingDown}
              valueClassName="text-rose-700 dark:text-rose-400"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBlock({
  label,
  value,
  icon: Icon,
  emphasize,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  emphasize?: boolean;
  valueClassName?: string;
}) {
  return (
    <div data-slot="project-surface" className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn(typography.caption, "font-medium text-muted-foreground")}>{label}</p>
          <p
            className={cn(
              emphasize ? typography.display : typography.subheading,
              "mt-1.5 tabular-nums tracking-tight",
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
