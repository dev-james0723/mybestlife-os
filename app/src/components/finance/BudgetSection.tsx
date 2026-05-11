"use client";

import { useMemo, useState } from "react";
import { PiggyBank } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { AddBudgetModal } from "@/components/finance/AddBudgetModal";
import { EditBudgetModal } from "@/components/finance/EditBudgetModal";
import { BudgetCategoryRow } from "@/components/finance/BudgetCategoryRow";
import { useDeleteFinanceBudget } from "@/hooks/use-finance";
import { convertAmountToFxBase } from "@/lib/finance/convert-to-display";
import { transactionSourceCurrency } from "@/lib/finance/transaction-display";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import type { FinanceBudget, FinanceCategory } from "@/types/database";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type BudgetSectionProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined;
  fxReady: boolean;
  pageFrom: string;
  pageTo: string;
  budgets: FinanceBudget[] | undefined;
  categories: FinanceCategory[] | undefined;
  transactions: FinanceTransactionWithRelations[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && aTo >= bFrom;
}

function intersection(fromA: string, toA: string, fromB: string, toB: string): { from: string; to: string } {
  const from = fromA > fromB ? fromA : fromB;
  const to = toA < toB ? toA : toB;
  return { from, to };
}

export function BudgetSection({
  copy,
  language,
  displayCurrency,
  fx,
  fxReady,
  pageFrom,
  pageTo,
  budgets,
  categories,
  transactions,
  isLoading,
  isError,
}: BudgetSectionProps) {
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetModalNonce, setBudgetModalNonce] = useState(0);
  const [deleteBudgetTarget, setDeleteBudgetTarget] = useState<FinanceBudget | null>(null);
  const [editBudgetTarget, setEditBudgetTarget] = useState<{ budget: FinanceBudget; name: string } | null>(null);
  const [editBudgetNonce, setEditBudgetNonce] = useState(0);
  const deleteBudget = useDeleteFinanceBudget();

  const dc = displayCurrency.trim().toUpperCase();
  const catName = useMemo(() => {
    const m = new Map((categories ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? copy.budgetCategoryUnknown;
  }, [categories, copy.budgetCategoryUnknown]);

  const rows = useMemo(() => {
    if (!budgets?.length || !transactions) return [];
    const out: { budget: FinanceBudget; spent: number; limit: number; name: string }[] = [];
    for (const b of budgets) {
      if (!rangesOverlap(b.period_start, b.period_end, pageFrom, pageTo)) continue;
      const { from, to } = intersection(pageFrom, pageTo, b.period_start, b.period_end);
      let spent = 0;
      for (const t of transactions) {
        if (t.type !== "expense" || t.category_id !== b.category_id) continue;
        if (t.transaction_date < from || t.transaction_date > to) continue;
        const amt = Number(t.amount);
        const v = fxReady && fx ? convertAmountToFxBase(amt, transactionSourceCurrency(t, dc), fx) : amt;
        spent += v;
      }
      out.push({
        budget: b,
        spent,
        limit: Number(b.limit_amount),
        name: catName(b.category_id),
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, language));
    return out;
  }, [budgets, transactions, pageFrom, pageTo, dc, fx, fxReady, catName, language]);

  const handleConfirmDeleteBudget = async () => {
    if (!deleteBudgetTarget) return;
    try {
      await deleteBudget.mutateAsync(deleteBudgetTarget.id);
      setDeleteBudgetTarget(null);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.budgetsSectionTitle}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 px-3 text-sm font-medium"
            onClick={() => {
              setBudgetModalNonce((n) => n + 1);
              setBudgetModalOpen(true);
            }}
          >
            {copy.budgetAddButton}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="space-y-2" role="alert">
            <p className={cn(typography.body, "text-destructive")}>{copy.budgetError}</p>
            <p className={cn(typography.caption, "text-muted-foreground max-w-prose")}>{copy.budgetErrorHint}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={PiggyBank} title={copy.budgetEmptyTitle} description={copy.budgetEmptyDescription} />
        ) : (
          <ul className="space-y-3">
            {rows.map(({ budget, spent, limit, name }) => (
              <li key={budget.id}>
                <BudgetCategoryRow
                  copy={copy}
                  language={language}
                  displayCurrency={displayCurrency}
                  categoryName={name}
                  spent={spent}
                  limit={limit}
                  onRequestEdit={() => {
                    setEditBudgetTarget({ budget, name });
                    setEditBudgetNonce((n) => n + 1);
                  }}
                  onRequestDelete={() => setDeleteBudgetTarget(budget)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AddBudgetModal
        key={budgetModalNonce}
        open={budgetModalOpen}
        onOpenChange={setBudgetModalOpen}
        periodStart={pageFrom}
        periodEnd={pageTo}
        categories={categories}
        existingBudgets={budgets}
        copy={copy}
      />

      {editBudgetTarget ? (
        <EditBudgetModal
          key={`${editBudgetTarget.budget.id}-${editBudgetNonce}`}
          open
          onOpenChange={(o) => {
            if (!o) setEditBudgetTarget(null);
          }}
          budget={editBudgetTarget.budget}
          categoryName={editBudgetTarget.name}
          copy={copy}
        />
      ) : null}

      <AlertDialog
        open={!!deleteBudgetTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteBudgetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteBudgetTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteBudgetDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.deleteBudgetCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteBudget();
              }}
              disabled={deleteBudget.isPending}
            >
              {copy.deleteBudgetConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
