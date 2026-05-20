"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

export function plannerTaskSyncTooltip(
  status: string | undefined,
  copy: DailyPlannerUiCopy,
): string | null {
  if (!status) return null;
  switch (status) {
    case "synced":
      return copy.calendarSyncTooltipSynced;
    case "pending":
    case "local_pending":
    case "remote_pending":
      return copy.calendarSyncTooltipPending;
    case "error":
      return copy.calendarSyncTooltipError;
    case "conflict":
      return copy.calendarSyncTooltipConflict;
    case "remote_deleted":
      return copy.calendarSyncTooltipRemoteDeleted;
    default:
      return null;
  }
}

export function PlannerGoogleSyncDot({
  plannerTaskId,
  syncStatus,
  copy,
  className,
}: {
  plannerTaskId?: string | null;
  syncStatus?: string | null;
  copy: DailyPlannerUiCopy;
  className?: string;
}) {
  if (!plannerTaskId?.trim() || !syncStatus) return null;
  const tip = plannerTaskSyncTooltip(syncStatus, copy);
  if (!tip) return null;
  const color =
    syncStatus === "synced"
      ? "bg-emerald-500"
      : syncStatus === "conflict"
        ? "bg-amber-500"
        : syncStatus === "remote_deleted"
          ? "bg-orange-500"
          : syncStatus === "error"
            ? "bg-red-500"
            : "bg-sky-500";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={cn(
            "inline-flex h-2 w-2 shrink-0 rounded-full ring-2 ring-background",
            color,
            className,
          )}
          aria-label={tip}
          onClick={(e) => e.stopPropagation()}
        />
        <TooltipContent side="top" className="max-w-[14rem] text-xs">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
