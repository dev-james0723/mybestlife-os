"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eachMonthOfInterval, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import { transactionSourceCurrency } from "@/lib/finance/transaction-display";
import { convertAmountToFxBase } from "@/lib/finance/convert-to-display";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type FinanceChartProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined;
  fxReady: boolean;
  transactions: FinanceTransactionWithRelations[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

type Row = { key: string; label: string; income: number; expense: number };

export const FinanceChart = memo(function FinanceChart({
  copy,
  language,
  displayCurrency,
  fx,
  fxReady,
  transactions,
  isLoading,
  isError,
}: FinanceChartProps) {
  const dc = displayCurrency.trim().toUpperCase();
  const monthLocale = getDateFnsLocale(language);

  const chartData = useMemo(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, 5));
    const months = eachMonthOfInterval({ start, end });
    const rows: Row[] = months.map((m) => ({
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM", { locale: monthLocale }),
      income: 0,
      expense: 0,
    }));
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const t of transactions ?? []) {
      if (t.type === "transfer") continue;
      const key = format(parseISO(t.transaction_date), "yyyy-MM");
      const row = byKey.get(key);
      if (!row) continue;
      const amt = Number(t.amount);
      const v = fxReady && fx ? convertAmountToFxBase(amt, transactionSourceCurrency(t, dc), fx) : amt;
      if (t.type === "income") row.income += v;
      if (t.type === "expense") row.expense += v;
    }
    return rows;
  }, [transactions, dc, fx, fxReady, monthLocale]);

  const hasMovement = chartData.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.chartLast6MonthsTitle}</CardTitle>
        <p className={cn(typography.caption, "text-muted-foreground")}>{copy.chartLast6MonthsSubtitle}</p>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.chartError}
          </p>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !hasMovement ? (
          <p className={cn(typography.body, "text-muted-foreground py-12 text-center")}>{copy.chartEmpty}</p>
        ) : (
          <figure className="h-64 w-full min-w-0" aria-label={copy.chartAriaLabel}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    formatFinanceCurrency(Number(v), dc, language, { compact: true })
                  }
                />
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    const label =
                      name === "income" ? copy.chartIncomeLegend : copy.chartExpenseLegend;
                    return [formatFinanceCurrency(n, dc, language), label];
                  }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as Row | undefined;
                    return p?.key ?? "";
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name={copy.chartIncomeLegend}
                  fill="oklch(0.65 0.17 155)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name={copy.chartExpenseLegend}
                  fill="oklch(0.62 0.2 25)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </figure>
        )}
      </CardContent>
    </Card>
  );
});

/** Matches live chart layout for `next/dynamic` loading and Suspense fallbacks. */
export function FinanceChartSkeleton() {
  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="mt-2 h-3 w-full max-w-md rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
