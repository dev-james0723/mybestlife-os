"use client";

import { Info, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateBucketItem, useUpdateDreamImage } from "@/hooks/use-bucket-list";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketInspirationAnalysis,
  BucketItem,
} from "@/types/bucket-list";

/**
 * Review pane for an AI image analysis. Suggestions only — the user explicitly
 * chooses to apply the caption and/or the suggested dream updates. Nothing is
 * written automatically.
 */
export function DreamImageAnalysisReview({
  analysis,
  imageId,
  item,
  copy,
  onClose,
}: {
  analysis: BucketInspirationAnalysis;
  imageId: string;
  item: BucketItem;
  copy: BucketListUiCopy;
  onClose: () => void;
}) {
  const updateImage = useUpdateDreamImage();
  const updateBucket = useUpdateBucketItem();

  const hints = analysis.extractedDreamHints;
  const hintEntries: [string, string][] = [
    ["destination", hints.destination ?? ""],
    ["activity", hints.activity ?? ""],
    ["mood", hints.mood ?? ""],
    ["season", hints.season ?? ""],
    ["style", hints.style ?? ""],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  const updates = analysis.suggestedBucketUpdates ?? null;
  const updateKeys = updates ? Object.keys(updates) : [];

  return (
    <section className="space-y-3 rounded-xl border border-lime-400/30 bg-lime-400/5 p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-lime-500" />
          {copy.visualsAnalysisTitle}
        </h4>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label={copy.visualsAnalysisClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {copy.visualsAnalysisUnverified}
      </p>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {copy.visualsAnalysisCaption}
        </p>
        <p className="rounded-lg bg-background/60 px-3 py-2 text-sm">
          {analysis.suggestedCaption}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={updateImage.isPending}
          onClick={() =>
            updateImage.mutate({
              id: imageId,
              bucketItemId: item.id,
              data: {
                caption: analysis.suggestedCaption,
                ai_caption: analysis.suggestedCaption,
              },
            })
          }
        >
          {copy.visualsAnalysisApplyCaption}
        </Button>
      </div>

      {hintEntries.length > 0 || (hints.tags && hints.tags.length > 0) ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {copy.visualsAnalysisHints}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hintEntries.map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[11px]">
                {k}: {v}
              </Badge>
            ))}
            {(hints.tags ?? []).map((t) => (
              <Badge key={t} variant="outline" className="text-[11px]">
                #{t}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {updates && updateKeys.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {copy.visualsAnalysisSuggestedUpdates}
          </p>
          <ul className="space-y-0.5 text-[13px]">
            {updateKeys.map((k) => (
              <li key={k} className="text-muted-foreground">
                <span className="font-medium text-foreground">{k}:</span>{" "}
                {String((updates as Record<string, unknown>)[k])}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="bg-lime-400 text-black hover:bg-lime-300"
            disabled={updateBucket.isPending}
            onClick={() => {
              updateBucket.mutate({ id: item.id, data: updates });
              onClose();
            }}
          >
            {copy.visualsAnalysisApplyUpdates}
          </Button>
        </div>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-amber-600 dark:text-amber-400">
          {analysis.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
