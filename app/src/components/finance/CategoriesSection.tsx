"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Tags, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinanceSegmentedTab, FinanceSegmentedTabsList } from "@/components/finance/FinanceSegmentedTabs";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryFormModal } from "@/components/finance/CategoryFormModal";
import { useDeleteFinanceCategory } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FinanceCategory } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type CategoriesSectionProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  categories: FinanceCategory[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

function CategoryList({
  items,
  copy,
  language,
  listVariant,
  ariaLabel,
  emptyCopy,
  onEdit,
  onRequestDelete,
}: {
  items: FinanceCategory[];
  copy: FinanceUiCopy;
  language: AppLocale;
  listVariant: "income" | "expense";
  ariaLabel: string;
  emptyCopy: string;
  onEdit: (c: FinanceCategory) => void;
  onRequestDelete: (c: FinanceCategory) => void;
}) {
  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name, language)), [items, language]);

  if (sorted.length === 0) {
    return <p className={cn(typography.body, "text-muted-foreground py-2")}>{emptyCopy}</p>;
  }

  const rowShell =
    listVariant === "income"
      ? "border-emerald-200/70 bg-gradient-to-r from-emerald-50/70 via-card/80 to-card/60 dark:border-emerald-800/45 dark:from-emerald-950/35 dark:via-card/90 dark:to-card/70"
      : "border-rose-200/60 bg-gradient-to-r from-rose-50/60 via-card/80 to-card/60 dark:border-rose-800/40 dark:from-rose-950/30 dark:via-card/90 dark:to-card/70";

  return (
    <ul className="space-y-2" role="list" aria-label={ariaLabel}>
      {sorted.map((c) => (
        <li key={c.id}>
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ring-1 ring-foreground/10",
              rowShell,
            )}
          >
            <p className={cn(typography.body, "min-w-0 flex-1 truncate")}>{c.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" />}
                aria-label={copy.actionsMenuAria}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  {copy.actionsEdit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onRequestDelete(c)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {copy.actionsDelete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CategoriesSection({ copy, language, categories, isLoading, isError }: CategoriesSectionProps) {
  const [tab, setTab] = useState<"income" | "expense">("expense");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNonce, setModalNonce] = useState(0);
  const [modalInitial, setModalInitial] = useState<FinanceCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategory | null>(null);
  const deleteCategory = useDeleteFinanceCategory();

  const income = useMemo(() => (categories ?? []).filter((c) => c.type === "income"), [categories]);
  const expense = useMemo(() => (categories ?? []).filter((c) => c.type === "expense"), [categories]);

  const openAdd = () => {
    setModalInitial(null);
    setModalNonce((n) => n + 1);
    setModalOpen(true);
  };

  const openEdit = (c: FinanceCategory) => {
    setModalInitial(c);
    setModalNonce((n) => n + 1);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* toast in hook */
    }
  };

  const emptyBoth =
    !isLoading && !isError && (categories?.length ?? 0) === 0;

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.categoriesSectionTitle}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 px-3 text-sm font-medium"
            onClick={openAdd}
          >
            {copy.categoriesAddButton}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.categoriesError}
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : emptyBoth ? (
          <EmptyState
            icon={Tags}
            title={copy.categoriesSectionTitle}
            description={copy.categoriesEmptyExpense}
            action={{ label: copy.categoriesAddButton, onClick: openAdd }}
          />
        ) : (
          <Tabs
            value={tab}
            onValueChange={(v) => {
              if (v === "income" || v === "expense") setTab(v);
            }}
            className="w-full"
          >
            <FinanceSegmentedTabsList className="mb-3 sm:w-auto">
              <FinanceSegmentedTab value="income">{copy.categoriesIncomeTab}</FinanceSegmentedTab>
              <FinanceSegmentedTab value="expense">{copy.categoriesExpenseTab}</FinanceSegmentedTab>
            </FinanceSegmentedTabsList>
            <TabsContent value="income">
              <CategoryList
                items={income}
                copy={copy}
                language={language}
                listVariant="income"
                ariaLabel={copy.categoriesAriaListIncome}
                emptyCopy={copy.categoriesEmptyIncome}
                onEdit={openEdit}
                onRequestDelete={setDeleteTarget}
              />
            </TabsContent>
            <TabsContent value="expense">
              <CategoryList
                items={expense}
                copy={copy}
                language={language}
                listVariant="expense"
                ariaLabel={copy.categoriesAriaListExpense}
                emptyCopy={copy.categoriesEmptyExpense}
                onEdit={openEdit}
                onRequestDelete={setDeleteTarget}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <CategoryFormModal
        key={modalNonce}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={modalInitial}
        defaultType={tab}
        copy={copy}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteCategoryTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteCategoryDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.deleteCategoryCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteCategory.isPending}
            >
              {copy.deleteCategoryConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
