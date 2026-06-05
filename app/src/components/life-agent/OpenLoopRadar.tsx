"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { OpenLoopDisposition, OpenLoopRadarGroup } from "@/lib/life-agent/workflow-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISPOSITIONS: OpenLoopDisposition[] = [
  "do_now",
  "schedule",
  "delegate",
  "clarify",
  "waiting",
  "drop",
];

type OpenLoopRadarProps = {
  ui: LifeAgentUiCopy;
  groups: OpenLoopRadarGroup[];
  summary?: string;
  compact?: boolean;
  className?: string;
};

export function OpenLoopRadar({ ui, groups, summary, compact = false, className }: OpenLoopRadarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!groups.length) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{ui.noOpenLoops}</p>;
  }

  return (
    <section className={cn("space-y-3", className)} aria-label={ui.openLoopRadarTitle}>
      {summary && <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {ui.openLoopRadarTitle}
      </h3>
      <ul className="space-y-2">
        {groups.map((group) => {
          const label = ui.openLoopCategoryLabels[group.category] ?? group.label;
          const isOpen = expanded[group.category] ?? !compact;
          return (
            <li key={group.category} className="rounded-xl border border-border/50 bg-muted/20">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [group.category]: !isOpen }))
                }
                aria-expanded={isOpen}
              >
                <span>{ui.loopGroupLine(group.count, label)}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <ul className="space-y-1 border-t border-border/40 px-3 py-2">
                  {group.loops.map((loop) => (
                    <li key={loop.id} className="text-xs text-muted-foreground">
                      <span className="text-foreground/90">{loop.title}</span>
                      {loop.detail ? <span> — {loop.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type ClearOpenLoopsEditorProps = {
  ui: LifeAgentUiCopy;
  groups: OpenLoopRadarGroup[];
  assignments: Record<string, OpenLoopDisposition>;
  onAssignmentChange: (loopId: string, disposition: OpenLoopDisposition) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  className?: string;
};

export function ClearOpenLoopsEditor({
  ui,
  groups,
  assignments,
  onAssignmentChange,
  onSubmit,
  isSubmitting,
  className,
}: ClearOpenLoopsEditorProps) {
  const loops = groups.flatMap((g) => g.loops);

  if (!loops.length) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{ui.noOpenLoops}</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm text-muted-foreground">{ui.clearOpenLoopsSubtitle}</p>
      <ul className="space-y-2">
        {loops.map((loop) => (
          <li
            key={loop.id}
            className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{loop.title}</p>
              {loop.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">{loop.detail}</p>
              )}
            </div>
            <Select
              value={assignments[loop.id] ?? "clarify"}
              onValueChange={(v) => onAssignmentChange(loop.id, v as OpenLoopDisposition)}
            >
              <SelectTrigger className="w-full sm:w-40" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPOSITIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {ui.dispositionLabels[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="w-full rounded-2xl sm:w-auto"
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {ui.createPreviewsFromLoops}
      </Button>
    </div>
  );
}
