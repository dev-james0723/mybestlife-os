"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronDown,
  Loader2,
  RefreshCw,
  Compass,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import {
  useRoleModelPatterns,
  type PatternRosterEntry,
} from "@/hooks/use-role-model-intelligence";

type Props = {
  roster: PatternRosterEntry[];
  aboutMe?: { mission?: string | null; coreValues?: string | null; personality?: string | null } | null;
  onAddRoleModel?: () => void;
};

/**
 * Page-level analysis: "What Your Role Models Reveal About You". Lives above
 * the gallery, collapsible, and user-triggered (peeks cache first, never
 * blocks render or auto-burns the model).
 */
export function RoleModelPatternBanner({ roster, aboutMe, onAddRoleModel }: Props) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const { report, generate, isPeeking } = useRoleModelPatterns(roster, aboutMe);

  // Needs at least a couple of role models to find a pattern.
  if (roster.length < 2) return null;

  const generating = generate.isPending;

  const run = (forceRefresh: boolean) => {
    setExpanded(true);
    generate.mutate(
      { forceRefresh },
      { onError: () => toast.error("Could not analyze your role models.") },
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-500/5 via-card/40 to-sky-500/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">What Your Role Models Reveal About You</span>
          <span className="block truncate text-xs text-muted-foreground">
            {report?.buildingToward
              ? `Building toward: ${report.buildingToward}`
              : "A pattern analysis across your whole collection."}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border/50 p-4">
              {!report && !isPeeking && !generating ? (
                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Analyze all {roster.length} role models together to surface your recurring
                    admiration patterns, blind spots, and missing archetypes.
                  </p>
                  <Button onClick={() => run(false)} className="rounded-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze My Pattern
                  </Button>
                </div>
              ) : null}

              {(isPeeking || generating) && !report ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading your collection…
                </div>
              ) : null}

              {report ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {report.recurringTraits.length ? (
                      <Panel title="Recurring traits" icon={<Compass className="h-3.5 w-3.5" />}>
                        <ChipList items={report.recurringTraits} />
                      </Panel>
                    ) : null}
                    {report.dominantArchetypes.length ? (
                      <Panel title="Dominant archetypes">
                        <ChipList items={report.dominantArchetypes} />
                      </Panel>
                    ) : null}
                    {report.blindSpots.length ? (
                      <Panel title="Blind spots" icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}>
                        <ul className="space-y-1 text-xs text-foreground/90">
                          {report.blindSpots.map((b, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    ) : null}
                    {report.missingArchetypes.length ? (
                      <Panel title="Missing archetypes">
                        <ChipList items={report.missingArchetypes} />
                      </Panel>
                    ) : null}
                  </div>

                  {report.suggestedRoleModels.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Suggested next role models
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {report.suggestedRoleModels.map((s, i) => (
                          <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{s.archetype}</p>
                              {onAddRoleModel ? (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAddRoleModel}>
                                  <PlusCircle className="mr-1 h-3.5 w-3.5" />
                                  Add
                                </Button>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.reason}</p>
                            {s.exampleNames?.length ? (
                              <p className="mt-1 text-[11px] text-muted-foreground/80">e.g. {s.exampleNames.join(", ")}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => run(true)} disabled={generating}>
                      {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge key={i} variant="secondary" className="text-xs">
          {it}
        </Badge>
      ))}
    </div>
  );
}
