"use client";

import { LayoutList, Plus } from "lucide-react";
import type { RoutineWithSteps } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { GlassPanel } from "@/components/ui/glass-panel";
import { OSIconControl } from "@/components/ui/os-primitives";
import { RoutineCard } from "./RoutineCard";

export interface RoutineStudioProps {
  routines: readonly RoutineWithSteps[];
  copy: HabitsUiCopy;
  onCreate: () => void;
  onOpen: (routine: RoutineWithSteps) => void;
  onStart: (routine: RoutineWithSteps) => void;
}

export function RoutineStudio({
  routines,
  copy,
  onCreate,
  onOpen,
  onStart,
}: RoutineStudioProps) {
  const visible = routines.filter((r) => !r.archived_at);

  return (
    <GlassPanel className="space-y-4 p-4 sm:p-5" variant="strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutList className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">{copy.routineStudioTitle}</h2>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {copy.routineStudioDescription}
          </p>
        </div>
        <OSIconControl
          type="button"
          osSize="compact"
          size="icon-sm"
          className="!h-11 !w-11 sm:!h-8 sm:!w-8"
          aria-label={copy.actionsAddRoutine}
          onClick={onCreate}
        >
          <Plus className="size-4" />
        </OSIconControl>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
          {copy.routinesEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.slice(0, 5).map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              copy={copy}
              expanded={routine.steps.length <= 3}
              onClick={onOpen}
              onStart={onStart}
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
