"use client";

import { useMemo } from "react";
import { Check, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import { useGoals } from "@/hooks/use-goals";
import { useLinkQuoteToGoal } from "@/hooks/use-quote-library-sdk";
import type { Goal } from "@/types/database";

interface QuoteGoalPickerProps {
  quoteId: string;
  currentGoalId: string | null;
  triggerClassName?: string;
}

export function QuoteGoalPicker({
  quoteId,
  currentGoalId,
  triggerClassName,
}: QuoteGoalPickerProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const { data: goals } = useGoals();
  const link = useLinkQuoteToGoal();

  const currentGoal = useMemo<Goal | null>(
    () =>
      (goals ?? []).find((g) => g.id === currentGoalId) ?? null,
    [goals, currentGoalId],
  );

  const handlePick = async (goalId: string | null) => {
    try {
      await link.mutateAsync({ quoteId, goalId });
      toast.success(
        goalId ? copy.linkedQuoteToGoal : copy.unlinkedQuoteFromGoal,
      );
    } catch {
      toast.error(copy.errorGeneric);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-2", triggerClassName)}
            title={currentGoal?.name ?? undefined}
          >
            <Target className="size-4" aria-hidden />
            {currentGoal ? copy.cardLinkedGoal : copy.detailLinkGoal}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-2">
        <ul className="flex flex-col" role="listbox">
          <li>
            <button
              type="button"
              onClick={() => void handlePick(null)}
              disabled={link.isPending}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              )}
              role="option"
              aria-selected={currentGoalId === null}
            >
              <span className="flex-1 italic text-muted-foreground">
                {copy.goalPickerNone}
              </span>
              {currentGoalId === null ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : null}
            </button>
          </li>
          {(goals?.length ?? 0) === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              {copy.emptyAllTitle}
            </li>
          ) : (
            (goals ?? []).map((goal) => {
              const active = goal.id === currentGoalId;
              return (
                <li key={goal.id}>
                  <button
                    type="button"
                    onClick={() => void handlePick(goal.id)}
                    disabled={link.isPending}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    )}
                    role="option"
                    aria-selected={active}
                  >
                    <Target
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{goal.name}</span>
                    {active ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
