"use client";

import { useCallback, useState } from "react";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import type {
  FutureSelfResponse,
  InnerConflictResponse,
  LifeChapterMapResponse,
  LifeCoherenceResponse,
  MemoryTimelineResponse,
} from "@/lib/life-agent/intelligence-types";
import {
  useFutureSelf,
  useInnerConflicts,
  useLifeChapters,
  useLifeCoherence,
  useMemoryTimeline,
} from "@/hooks/use-life-agent-intelligence";
import { LifeAgentWorkflowCard } from "@/components/life-agent/LifeAgentWorkflowCard";
import { LifeCoherencePanel } from "@/components/life-agent/LifeCoherencePanel";
import { InnerConflictPanel } from "@/components/life-agent/InnerConflictPanel";
import { LifeChapterMap } from "@/components/life-agent/LifeChapterMap";
import { MemoryTimeline } from "@/components/life-agent/MemoryTimeline";
import { FutureSelfConversation } from "@/components/life-agent/FutureSelfConversation";
import { cn } from "@/lib/utils";

export type IntelligenceFeatureId =
  | "lifeCoherence"
  | "innerConflicts"
  | "lifeChapterMap"
  | "memoryTimeline"
  | "futureSelf";

const FEATURE_ORDER: IntelligenceFeatureId[] = [
  "lifeCoherence",
  "innerConflicts",
  "lifeChapterMap",
  "memoryTimeline",
  "futureSelf",
];

type LifeAgentIntelligenceHubProps = {
  ui: LifeAgentUiCopy;
  onMemoryUsed: (items: LifeAgentMemoryUsedItem[]) => void;
  className?: string;
};

export function LifeAgentIntelligenceHub({
  ui,
  onMemoryUsed,
  className,
}: LifeAgentIntelligenceHubProps) {
  const [active, setActive] = useState<IntelligenceFeatureId>("lifeCoherence");
  const [coherence, setCoherence] = useState<LifeCoherenceResponse | null>(null);
  const [conflicts, setConflicts] = useState<InnerConflictResponse | null>(null);
  const [chapters, setChapters] = useState<LifeChapterMapResponse | null>(null);
  const [timeline, setTimeline] = useState<MemoryTimelineResponse | null>(null);
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lifeCoherence = useLifeCoherence();
  const innerConflicts = useInnerConflicts();
  const lifeChapters = useLifeChapters();
  const memoryTimeline = useMemoryTimeline();
  const futureSelfMutation = useFutureSelf();

  const isLoading =
    lifeCoherence.isPending ||
    innerConflicts.isPending ||
    lifeChapters.isPending ||
    memoryTimeline.isPending ||
    futureSelfMutation.isPending;

  const runFeature = useCallback(
    async (id: IntelligenceFeatureId) => {
      setError(null);
      try {
        switch (id) {
          case "lifeCoherence": {
            const r = await lifeCoherence.mutateAsync();
            setCoherence(r);
            onMemoryUsed(r.memoryUsed);
            break;
          }
          case "innerConflicts": {
            const r = await innerConflicts.mutateAsync();
            setConflicts(r);
            onMemoryUsed(r.memoryUsed);
            break;
          }
          case "lifeChapterMap": {
            const r = await lifeChapters.mutateAsync();
            setChapters(r);
            onMemoryUsed(r.memoryUsed);
            break;
          }
          case "memoryTimeline": {
            const r = await memoryTimeline.mutateAsync();
            setTimeline(r);
            onMemoryUsed(r.memoryUsed);
            break;
          }
          case "futureSelf": {
            const r = await futureSelfMutation.mutateAsync(2027);
            setFutureSelf(r);
            onMemoryUsed(r.memoryUsed);
            break;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : ui.workflowError);
      }
    },
    [
      futureSelfMutation,
      innerConflicts,
      lifeChapters,
      lifeCoherence,
      memoryTimeline,
      onMemoryUsed,
      ui.workflowError,
    ],
  );

  const handleSelect = useCallback(
    (id: IntelligenceFeatureId) => {
      setActive(id);
      const cached =
        (id === "lifeCoherence" && coherence) ||
        (id === "innerConflicts" && conflicts) ||
        (id === "lifeChapterMap" && chapters) ||
        (id === "memoryTimeline" && timeline) ||
        (id === "futureSelf" && futureSelf);
      if (!cached) void runFeature(id);
    },
    [chapters, coherence, conflicts, futureSelf, runFeature, timeline],
  );

  const panelTitle = ui.intelligenceFeatures[active].title;

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="life-agent-intelligence-heading">
      <div>
        <h2 id="life-agent-intelligence-heading" className="text-sm font-semibold">
          {ui.intelligenceTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{ui.intelligenceSubtitle}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {FEATURE_ORDER.map((id, index) => (
          <LifeAgentWorkflowCard
            key={id}
            title={ui.intelligenceFeatures[id].title}
            description={ui.intelligenceFeatures[id].description}
            isActive={active === id}
            isLoading={active === id && isLoading}
            index={index}
            onClick={() => handleSelect(id)}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/20 p-1">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <h3 className="text-sm font-semibold">{panelTitle}</h3>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            disabled={isLoading}
            onClick={() => void runFeature(active)}
          >
            {isLoading ? ui.workflowLoading : ui.workflowRun}
          </button>
        </div>

        {error && (
          <p className="px-3 pb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="px-3 pb-3">
          {isLoading && !coherence && !conflicts && !chapters && !timeline && !futureSelf && (
            <p className="text-sm text-muted-foreground">{ui.workflowLoading}</p>
          )}

          {active === "lifeCoherence" && coherence && (
            <LifeCoherencePanel ui={ui} data={coherence} />
          )}
          {active === "innerConflicts" && conflicts && (
            <InnerConflictPanel ui={ui} data={conflicts} />
          )}
          {active === "lifeChapterMap" && chapters && (
            <LifeChapterMap ui={ui} data={chapters} />
          )}
          {active === "memoryTimeline" && timeline && (
            <MemoryTimeline ui={ui} data={timeline} />
          )}
          {active === "futureSelf" && futureSelf && (
            <FutureSelfConversation ui={ui} data={futureSelf} />
          )}
        </div>
      </div>
    </section>
  );
}
