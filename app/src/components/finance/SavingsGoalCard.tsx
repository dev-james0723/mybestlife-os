"use client";

import { format } from "date-fns";
import { parseISO } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFinanceCurrency } from "@/lib/finance/format-finance-currency";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SavingsGoal } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type SavingsGoalCardProps = {
  copy: FinanceUiCopy;
  language: AppLocale;
  displayCurrency: string;
  goal: SavingsGoal;
  onEdit?: () => void;
  onRequestDelete?: () => void;
};

export function SavingsGoalCard({
  copy,
  language,
  displayCurrency,
  goal,
  onEdit,
  onRequestDelete,
}: SavingsGoalCardProps) {
  const dc = displayCurrency.trim().toUpperCase();
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  const deadlineLabel =
    goal.deadline &&
    copy.goalsDeadlineLabel.replace(
      "{date}",
      format(parseISO(goal.deadline), "PP", { locale: getDateFnsLocale(language) }),
    );

  const showMenu = onEdit || onRequestDelete;

  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden ring-1 ring-violet-200/40 bg-gradient-to-br from-card via-violet-50/20 to-sky-50/30 dark:ring-violet-900/30 dark:from-card dark:via-violet-950/20 dark:to-sky-950/15",
        onEdit && "transition-shadow hover:shadow-md",
      )}
    >
      {showMenu ? (
        <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-sm" />}
              aria-label={copy.actionsMenuAria}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  {copy.actionsEdit}
                </DropdownMenuItem>
              ) : null}
              {onRequestDelete ? (
                <DropdownMenuItem
                  onSelect={onRequestDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {copy.actionsDelete}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <CardContent
        className={cn(
          "flex gap-4 p-4 pr-14",
          onEdit ? "cursor-pointer" : undefined,
        )}
        onClick={onEdit}
        onKeyDown={(e) => {
          if (!onEdit) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit();
          }
        }}
        role={onEdit ? "button" : undefined}
        tabIndex={onEdit ? 0 : undefined}
      >
        <div className="h-[4.5rem] w-[4.5rem] shrink-0" aria-hidden>
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r={r} fill="none" className="stroke-muted" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              className="stroke-violet-600 dark:stroke-violet-400"
              strokeWidth="3"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn(typography.subheading, "truncate")}>{goal.name}</p>
            <span className={cn(typography.caption, "shrink-0 tabular-nums text-violet-700 dark:text-violet-300")}>
              {copy.goalsPercentDone.replace("{pct}", String(pct))}
            </span>
          </div>
          <p className={cn(typography.caption, "tabular-nums text-muted-foreground")}>
            {formatFinanceCurrency(current, dc, language)} / {formatFinanceCurrency(target, dc, language)}
          </p>
          {deadlineLabel ? <p className={typography.caption}>{deadlineLabel}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
