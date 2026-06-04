"use client";

import { useState } from "react";
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
import { SavingsGoalCard } from "@/components/finance/SavingsGoalCard";
import { SavingsGoalFormModal } from "@/components/finance/SavingsGoalFormModal";
import { useDeleteSavingsGoal } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SavingsGoal } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type SavingsGoalsSectionProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  goals: SavingsGoal[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

export function SavingsGoalsSection({
  copy,
  language,
  displayCurrency,
  goals,
  isLoading,
  isError,
}: SavingsGoalsSectionProps) {
  const list = goals ?? [];
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalModalNonce, setGoalModalNonce] = useState(0);
  const [goalModalInitial, setGoalModalInitial] = useState<SavingsGoal | null>(null);
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<SavingsGoal | null>(null);
  const deleteGoal = useDeleteSavingsGoal();

  const openAddGoal = () => {
    setGoalModalInitial(null);
    setGoalModalNonce((n) => n + 1);
    setGoalModalOpen(true);
  };

  const openEditGoal = (g: SavingsGoal) => {
    setGoalModalInitial(g);
    setGoalModalNonce((n) => n + 1);
    setGoalModalOpen(true);
  };

  const handleConfirmDeleteGoal = async () => {
    if (!deleteGoalTarget) return;
    try {
      await deleteGoal.mutateAsync(deleteGoalTarget.id);
      setDeleteGoalTarget(null);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.goalsSectionTitle}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="!h-11 shrink-0 px-4 text-sm font-medium sm:!h-9 sm:px-3"
            onClick={openAddGoal}
          >
            {copy.goalAddButton}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.goalsError}
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={copy.goalsEmptyTitle}
            description={copy.goalsEmptyDescription}
            action={{ label: copy.goalAddButton, onClick: openAddGoal }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((g) => (
              <li key={g.id}>
                <SavingsGoalCard
                  copy={copy}
                  language={language}
                  displayCurrency={displayCurrency}
                  goal={g}
                  onEdit={() => openEditGoal(g)}
                  onRequestDelete={() => setDeleteGoalTarget(g)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <SavingsGoalFormModal
        key={goalModalNonce}
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        initial={goalModalInitial}
        copy={copy}
      />

      <AlertDialog
        open={!!deleteGoalTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteGoalTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteGoalTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteGoalDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.deleteGoalCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteGoal();
              }}
              disabled={deleteGoal.isPending}
            >
              {copy.deleteGoalConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
