"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { PageShell } from "@/components/shared/page-shell";
import { AccountsSection } from "@/components/finance/AccountsSection";
import { BudgetSection } from "@/components/finance/BudgetSection";
import { CategoriesSection } from "@/components/finance/CategoriesSection";
import { FinanceChartSkeleton } from "@/components/finance/FinanceChart";

const FinanceChartLazy = dynamic(
  () => import("@/components/finance/FinanceChart").then((m) => ({ default: m.FinanceChart })),
  {
    ssr: false,
    loading: () => <FinanceChartSkeleton />,
  },
);
import { FinanceDisplayCurrencySelect } from "@/components/finance/FinanceDisplayCurrencySelect";
import { FinancePeriodSelector } from "@/components/finance/FinancePeriodSelector";
import { FinancialOverviewCard } from "@/components/finance/FinancialOverviewCard";
import { QuickAddButton } from "@/components/finance/QuickAddButton";
import { SavingsGoalsSection } from "@/components/finance/SavingsGoalsSection";
import { TransactionFormModal } from "@/components/finance/TransactionFormModal";
import { TransactionList } from "@/components/finance/TransactionList";
import { useBudgets } from "@/hooks/use-budgets";
import { useDisplayFxRates } from "@/hooks/use-display-fx-rates";
import { useFinanceAccounts, useFinanceCategories, useFinanceTransactions } from "@/hooks/use-finance";
import { useFinanceCategorySeed } from "@/hooks/use-finance-category-seed";
import { computeFinancePeriodRange, useFinancePeriod } from "@/hooks/use-finance-period";
import { useProfile } from "@/hooks/use-settings";
import { useSavingsGoals } from "@/hooks/use-savings-goals";
import { useTransactions } from "@/hooks/use-transactions";
import { spacing } from "@/lib/constants/design-tokens";
import { getLastSixMonthsInclusiveRange } from "@/lib/finance/last-six-months-range";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { formatFinanceFxAsOf, getFinanceUiCopy } from "@/lib/i18n/finance-ui";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";

export default function FinancePage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getFinanceUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);

  const { preset, setPreset, range } = useFinancePeriod();
  const [overviewLens, setOverviewLens] = useState<"month" | "year">("month");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalNonce, setTxModalNonce] = useState(0);
  const [txModalInitial, setTxModalInitial] = useState<FinanceTransactionWithRelations | null>(null);

  const openAddTransaction = useCallback(() => {
    setTxModalInitial(null);
    setTxModalNonce((n) => n + 1);
    setTxModalOpen(true);
  }, []);

  const openEditTransaction = useCallback((t: FinanceTransactionWithRelations) => {
    setTxModalInitial(t);
    setTxModalNonce((n) => n + 1);
    setTxModalOpen(true);
  }, []);

  const overviewRange = useMemo(
    () => computeFinancePeriodRange(overviewLens === "month" ? "this_month" : "this_year"),
    [overviewLens],
  );

  const chartRange = useMemo(() => getLastSixMonthsInclusiveRange(), []);

  const { data: profile, isLoading: profileLoading } = useProfile();
  useFinanceCategorySeed();

  const txFilters = useMemo(
    () => ({
      from: range.from,
      to: range.to,
    }),
    [range.from, range.to],
  );

  const overviewTxFilters = useMemo(
    () => ({
      from: overviewRange.from,
      to: overviewRange.to,
    }),
    [overviewRange.from, overviewRange.to],
  );

  const chartTxFilters = useMemo(
    () => ({
      from: chartRange.from,
      to: chartRange.to,
    }),
    [chartRange.from, chartRange.to],
  );

  const txPage = useTransactions(txFilters);
  const txOverview = useFinanceTransactions(overviewTxFilters);
  const txChart = useFinanceTransactions(chartTxFilters);
  const budgetsQuery = useBudgets(range);
  const goalsQuery = useSavingsGoals();
  const accountsQuery = useFinanceAccounts();
  const categoriesQuery = useFinanceCategories();

  const displayCurrency = profile?.display_currency ?? "USD";
  const fxQuery = useDisplayFxRates(displayCurrency);
  const fxPayload = fxQuery.data;
  const fxReady = fxQuery.isSuccess && !!fxPayload;

  const fxWhen = useMemo(() => {
    const fetchedAt = fxPayload?.fetchedAt;
    if (!fetchedAt) return "";
    try {
      return format(parseISO(fetchedAt), "PPp", { locale: dateLocale });
    } catch {
      return fetchedAt;
    }
  }, [fxPayload?.fetchedAt, dateLocale]);

  const toolbarDisabled = profileLoading || !profile;

  return (
    <PageShell title={copy.pageTitle} description={copy.pageDescription}>
      <div className="rounded-xl border border-foreground/10 bg-gradient-to-br from-violet-50/50 via-card/90 to-sky-50/45 p-4 ring-1 ring-foreground/10 shadow-sm dark:from-violet-950/25 dark:via-card/80 dark:to-sky-950/20 sm:p-5">
        <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", spacing.cardGap)}>
          <div className={cn("flex flex-col gap-4 sm:flex-row sm:flex-wrap", spacing.cardGap)}>
            <FinancePeriodSelector value={preset} onChange={setPreset} copy={copy} />
            {toolbarDisabled ? (
              <div className="flex flex-col gap-2 min-w-[10rem]" aria-busy="true">
                <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-10 w-44 max-w-full rounded-md bg-muted animate-pulse" />
              </div>
            ) : (
              <FinanceDisplayCurrencySelect value={profile.display_currency} copy={copy} />
            )}
          </div>
          <div className="min-h-[2.75rem] flex flex-col justify-end">
            {fxQuery.isSuccess && fxWhen ? (
              <p className="text-xs text-muted-foreground" role="status">
                {formatFinanceFxAsOf(copy.fxRatesAsOf, fxWhen)}
              </p>
            ) : fxQuery.isError ? (
              <p className="text-xs text-destructive" role="alert">
                {copy.fxLoadError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground" aria-hidden>
                {"\u00a0"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-28 sm:pb-24">
        <FinancialOverviewCard
          copy={copy}
          language={language}
          displayCurrency={displayCurrency}
          fx={fxPayload}
          fxReady={fxReady}
          overviewLens={overviewLens}
          onOverviewLensChange={setOverviewLens}
          accounts={accountsQuery.data}
          transactions={txOverview.data}
          accountsLoading={accountsQuery.isLoading}
          transactionsLoading={txOverview.isLoading}
          accountsError={accountsQuery.isError}
          transactionsError={txOverview.isError}
        />

        <FinanceChartLazy
          copy={copy}
          language={language}
          displayCurrency={displayCurrency}
          fx={fxPayload}
          fxReady={fxReady}
          transactions={txChart.data}
          isLoading={txChart.isLoading}
          isError={txChart.isError}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AccountsSection
            copy={copy}
            language={language}
            accounts={accountsQuery.data}
            isLoading={accountsQuery.isLoading}
            isError={accountsQuery.isError}
          />
          <CategoriesSection
            copy={copy}
            language={language}
            categories={categoriesQuery.data}
            isLoading={categoriesQuery.isLoading}
            isError={categoriesQuery.isError}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BudgetSection
            copy={copy}
            language={language}
            displayCurrency={displayCurrency}
            fx={fxPayload}
            fxReady={fxReady}
            pageFrom={range.from}
            pageTo={range.to}
            budgets={budgetsQuery.data}
            categories={categoriesQuery.data}
            transactions={txPage.data}
            isLoading={budgetsQuery.isLoading || categoriesQuery.isLoading || txPage.isLoading}
            isError={budgetsQuery.isError || categoriesQuery.isError || txPage.isError}
          />
          <TransactionList
            copy={copy}
            language={language}
            displayCurrency={displayCurrency}
            fx={fxPayload}
            fxReady={fxReady}
            transactions={txPage.data}
            isLoading={txPage.isLoading}
            isError={txPage.isError}
            onEditTransaction={openEditTransaction}
          />
        </div>

        <SavingsGoalsSection
          copy={copy}
          language={language}
          displayCurrency={displayCurrency}
          goals={goalsQuery.data}
          isLoading={goalsQuery.isLoading}
          isError={goalsQuery.isError}
        />
      </div>

      <QuickAddButton copy={copy} onClick={openAddTransaction} />

      <TransactionFormModal
        key={txModalNonce}
        open={txModalOpen}
        onOpenChange={setTxModalOpen}
        initial={txModalInitial}
        accounts={accountsQuery.data}
        categories={categoriesQuery.data}
        copy={copy}
      />
    </PageShell>
  );
}
