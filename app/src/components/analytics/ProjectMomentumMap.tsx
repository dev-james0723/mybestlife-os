"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FolderKanban } from "lucide-react";

import { GlassEntityCard } from "@/components/dashboard/glass-entity-card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import type {
  ProjectMomentumCard,
  ProjectMomentumState,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<ProjectMomentumState, string> = {
  accelerating: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  steady: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  quiet: "bg-muted text-muted-foreground",
  stuck: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  overloaded: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
  ready_to_finish: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
};

function ProgressRing({ value, state }: { value: number; state: ProjectMomentumState }) {
  const color =
    state === "overloaded" || state === "stuck"
      ? "hsl(38 90% 52%)"
      : state === "ready_to_finish"
        ? "hsl(265 75% 62%)"
        : "hsl(155 70% 44%)";
  return (
    <div
      className="grid size-11 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, hsl(var(--muted)) 0deg)`,
      }}
      aria-label={`${value}% complete`}
    >
      <div className="grid size-8 place-items-center rounded-full bg-background/90 text-[0.65rem] font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function ProjectMomentumMap({
  projects,
  interpretation,
}: {
  projects: ProjectMomentumCard[];
  interpretation: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Project Momentum Map</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
          Link tasks to projects to see which projects are accelerating, quiet, stuck, or ready to finish.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.slice(0, 9).map((project, index) => (
            <motion.div
              key={project.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <GlassEntityCard
                title={project.name}
                subtitle={`${project.status} · ${project.priority} priority`}
                icon={<FolderKanban className="size-5" />}
                actions={<ProgressRing value={project.progressPercent} state={project.state} />}
                className={cn(
                  "h-full",
                  project.state === "accelerating" &&
                    "shadow-[0_0_0_1px_hsl(155_70%_44%_/_0.08),0_18px_46px_-34px_hsl(155_70%_44%_/_0.7)]",
                  project.state === "overloaded" &&
                    "shadow-[0_0_0_1px_hsl(12_80%_52%_/_0.08),0_18px_46px_-34px_hsl(12_80%_52%_/_0.7)]",
                )}
                badges={
                  <>
                    <Badge className={STATE_STYLE[project.state]}>
                      {project.stateLabel}
                    </Badge>
                    <Badge variant="outline">{project.linkedTasksCount} linked</Badge>
                  </>
                }
                meta={`Last activity: ${project.lastMeaningfulActivityLabel}`}
              >
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/35 p-2">
                    <p className="text-base font-semibold tabular-nums">
                      {project.completedInRange}
                    </p>
                    <p className="text-muted-foreground">done</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-2">
                    <p className="text-base font-semibold tabular-nums">
                      {project.overdueTasks}
                    </p>
                    <p className="text-muted-foreground">overdue</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-2">
                    <p className="text-base font-semibold tabular-nums">
                      {project.plannedMentions}
                    </p>
                    <p className="text-muted-foreground">planned</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">
                  {project.interpretation}
                </p>
              </GlassEntityCard>
            </motion.div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
