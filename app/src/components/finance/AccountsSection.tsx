"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { AccountFormModal } from "@/components/finance/AccountFormModal";
import { useDeleteFinanceAccount } from "@/hooks/use-finance";
import { financeAccountTypeLabel } from "@/lib/finance/account-types";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { FinanceAccount } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type AccountsSectionProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  accounts: FinanceAccount[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

export function AccountsSection({ copy, language, accounts, isLoading, isError }: AccountsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNonce, setModalNonce] = useState(0);
  const [modalInitial, setModalInitial] = useState<FinanceAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceAccount | null>(null);
  const deleteAccount = useDeleteFinanceAccount();

  const sorted = useMemo(() => {
    const list = [...(accounts ?? [])];
    list.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name, language);
    });
    return list;
  }, [accounts, language]);

  const openAdd = () => {
    setModalInitial(null);
    setModalNonce((n) => n + 1);
    setModalOpen(true);
  };

  const openEdit = (a: FinanceAccount) => {
    setModalInitial(a);
    setModalNonce((n) => n + 1);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAccount.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Card className="ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className={typography.heading}>{copy.accountsSectionTitle}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="!h-11 shrink-0 px-4 text-sm font-medium sm:!h-9 sm:px-3"
            onClick={openAdd}
          >
            {copy.accountsAddButton}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className={cn(typography.body, "text-destructive")} role="alert">
            {copy.accountsError}
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={copy.accountsEmptyTitle}
            description={copy.accountsEmptyDescription}
            action={{ label: copy.accountsAddButton, onClick: openAdd }}
          />
        ) : (
          <ul className="space-y-3" role="list" aria-label={copy.accountsAriaList}>
            {sorted.map((a) => {
              const cur = a.currency.trim().toUpperCase();
              const bal = formatFinanceCurrency(Number(a.balance), cur, language);
              return (
                <li key={a.id}>
                  <div
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between",
                      a.is_active
                        ? "border-violet-200/65 bg-gradient-to-br from-violet-50/70 via-card/90 to-sky-50/50 dark:border-violet-800/40 dark:from-violet-950/30 dark:via-card/85 dark:to-sky-950/25"
                        : "border-muted-foreground/20 bg-muted/30 dark:bg-muted/15",
                      !a.is_active && "opacity-75",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn(typography.subheading, "truncate")}>{a.name}</p>
                        {!a.is_active ? (
                          <Badge variant="secondary" className="font-normal">
                            {copy.accountInactiveBadge}
                          </Badge>
                        ) : null}
                      </div>
                      <p className={cn(typography.caption, "mt-0.5 text-muted-foreground")}>
                        {financeAccountTypeLabel(copy, a.account_type)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <div className="text-right">
                        <p className={cn(typography.caption, "text-muted-foreground")}>{copy.accountsBalanceLabel}</p>
                        <p className={cn(typography.body, "font-medium tabular-nums")}>{bal}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" />}
                          aria-label={copy.actionsMenuAria}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(a)}>
                            <Pencil className="mr-2 h-4 w-4" aria-hidden />
                            {copy.actionsEdit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(a)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            {copy.actionsDelete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AccountFormModal
        key={modalNonce}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={modalInitial}
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
            <AlertDialogTitle>{copy.deleteAccountTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteAccountDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.deleteAccountCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteAccount.isPending}
            >
              {copy.deleteAccountConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
