"use client";

import { useCallback, useMemo, useState } from "react";
import { ListOrdered } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionRow } from "@/components/finance/TransactionRow";
import { useDeleteFinanceTransaction } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FrankfurterLatestResponse } from "@/lib/fx/types";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

const MAX_ROWS = 50;

export type TransactionListProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  fx: Pick<FrankfurterLatestResponse, "base" | "rates"> | undefined;
  fxReady: boolean;
  transactions: FinanceTransactionWithRelations[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onEditTransaction: (t: FinanceTransactionWithRelations) => void;
};

export function TransactionList({
  copy,
  language,
  displayCurrency,
  fx,
  fxReady,
  transactions,
  isLoading,
  isError,
  onEditTransaction,
}: TransactionListProps) {
  const slice = useMemo(() => (transactions ?? []).slice(0, MAX_ROWS), [transactions]);
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransactionWithRelations | null>(null);
  const deleteTx = useDeleteFinanceTransaction();

  const handleEditById = useCallback(
    (id: string) => {
      const t = (transactions ?? []).find((x) => x.id === id);
      if (t) onEditTransaction(t);
    },
    [transactions, onEditTransaction],
  );

  const handleDeleteById = useCallback((id: string) => {
    const t = (transactions ?? []).find((x) => x.id === id);
    if (t) setDeleteTarget(t);
  }, [transactions]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTx.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.transactionsSectionTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.transactionError}
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : slice.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title={copy.transactionEmptyTitle}
            description={copy.transactionEmptyDescription}
          />
        ) : (
          <ScrollArea className="max-h-[22rem] pr-3">
            <ul className="space-y-3" role="list" aria-label={copy.transactionAriaList}>
              {slice.map((t) => (
                <li key={t.id}>
                  <TransactionRow
                    copy={copy}
                    language={language}
                    displayCurrency={displayCurrency}
                    fx={fx}
                    fxReady={fxReady}
                    transaction={t}
                    onEdit={handleEditById}
                    onRequestDelete={handleDeleteById}
                  />
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTxTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteTxDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.deleteTxCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteTx.isPending}
            >
              {copy.deleteTxConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
