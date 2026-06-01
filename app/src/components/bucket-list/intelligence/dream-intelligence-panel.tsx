"use client";

import { Info, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDreamReport } from "@/hooks/use-bucket-list";
import { useAnalyzeDream } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamActionType,
  BucketItem,
} from "@/types/bucket-list";

import { DreamReadinessScore } from "./dream-readiness-score";
import { DreamIdentityMeaning } from "./dream-identity-meaning";
import { DreamObstaclePanel } from "./dream-obstacle-panel";
import { DreamSmallVersions } from "./dream-small-versions";
import { DreamNextStepPanel } from "./dream-next-step-panel";
import { DreamConnectionsPanel } from "./dream-connections-panel";

/**
 * Dream Intelligence Hub panel. Always shows the deterministic readiness score;
 * the deeper AI report (why it matters, blockers, smallest version, next step,
 * connections) is generated on demand and cached. Suggested actions open
 * existing confirm-first flows — they never auto-execute.
 */
export function DreamIntelligencePanel({
  item,
  copy,
  onActivate,
  onReflect,
  onReframe,
  onNavigateTab,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
  onActivate: () => void;
  onReflect: () => void;
  onReframe: () => void;
  onNavigateTab: (tab: "travel" | "visuals") => void;
}) {
  const { data: reportRow, isLoading } = useDreamReport(item.id);
  const analyze = useAnalyzeDream();
  const report = reportRow?.report_json ?? null;

  function runAction(actionType: BucketDreamActionType | null) {
    switch (actionType) {
      case "reflect":
        onReflect();
        break;
      case "reframe":
        onReframe();
        break;
      case "generate_brief":
      case "generate_trip_plan":
        onNavigateTab("travel");
        break;
      case "generate_cover":
      case "upload_image":
        onNavigateTab("visuals");
        break;
      // create_task / create_project / create_savings_goal / schedule /
      // research → the confirm-first Activate flow.
      default:
        onActivate();
    }
  }

  return (
    <div className="space-y-4">
      <DreamReadinessScore item={item} report={report} copy={copy} />

      {!report ? (
        <section className="rounded-xl border border-dashed p-4 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-lime-500" />
          <p className="mt-2 text-sm font-medium">{copy.intelGenerateTitle}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{copy.intelIntro}</p>
          <Button
            className="mt-3 bg-lime-400 text-black hover:bg-lime-300"
            disabled={analyze.isPending || isLoading}
            onClick={() => analyze.mutate({ bucketItemId: item.id })}
          >
            {analyze.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {analyze.isPending ? copy.intelGenerating : copy.intelGenerate}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Info className="h-3 w-3" />
            {copy.intelDisclaimer}
          </p>
        </section>
      ) : (
        <>
          <DreamIdentityMeaning report={report} copy={copy} />
          <DreamSmallVersions smallestVersion={report.smallestVersion} copy={copy} />
          <DreamNextStepPanel
            nextStep={report.nextBestStep}
            copy={copy}
            onRunAction={runAction}
          />
          <DreamObstaclePanel blockers={report.blockers} copy={copy} />
          <DreamConnectionsPanel
            connections={report.connections}
            item={item}
            copy={copy}
            onConnect={onActivate}
          />

          {report.suggestedActions.length > 0 ? (
            <section className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">
                {copy.suggestedActionsHeading}
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.suggestedActions.map((a, i) => (
                  <Button
                    key={`${a.label}-${i}`}
                    size="sm"
                    variant="outline"
                    title={a.description ?? undefined}
                    onClick={() => runAction(a.actionType)}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Info className="h-3 w-3" />
                {copy.actionConfirmNote}
              </p>
            </section>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              {copy.intelDisclaimer}
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={analyze.isPending}
              onClick={() => analyze.mutate({ bucketItemId: item.id, forceRefresh: true })}
            >
              {analyze.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {copy.intelRefresh}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
