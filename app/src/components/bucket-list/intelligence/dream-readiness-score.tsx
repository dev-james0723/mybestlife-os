"use client";

import { useMemo } from "react";

import { Progress } from "@/components/ui/progress";
import { useDreamImages } from "@/hooks/use-bucket-list";
import { computeDreamReadiness } from "@/lib/bucket-list/readiness";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamIntelligenceReport,
  BucketItem,
} from "@/types/bucket-list";

/**
 * Deterministic, non-judgmental readiness score. Always available (no AI). If
 * an AI report exists, its short explanation + missing pieces are shown too.
 */
export function DreamReadinessScore({
  item,
  report,
  copy,
}: {
  item: BucketItem;
  report: BucketDreamIntelligenceReport | null;
  copy: BucketListUiCopy;
}) {
  const { data: images } = useDreamImages(item.id);
  const readiness = useMemo(
    () =>
      computeDreamReadiness(item, {
        imageCount: images?.length ?? 0,
        hasReport: Boolean(report),
      }),
    [item, images?.length, report],
  );

  const summary = useMemo(() => {
    const emotional =
      readiness.emotionalScore >= 50
        ? copy.readinessEmotionalClear
        : copy.readinessEmotionalForming;
    const logistics =
      readiness.logisticsScore >= 50
        ? copy.readinessLogisticsPlanned
        : copy.readinessLogisticsUnderplanned;
    const sentence = `${emotional}, ${logistics}.`;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }, [readiness, copy]);

  const missing = report?.dreamReadiness.missingPieces ?? [];

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{copy.readinessHeading}</h3>
        <span className="text-lg font-semibold tabular-nums">
          {readiness.score}%
        </span>
      </div>
      <Progress value={readiness.score} className="h-2" />
      <p className="mt-2 text-[13px] text-muted-foreground">{summary}</p>
      {report?.dreamReadiness.explanation ? (
        <p className="mt-1 text-[13px] text-foreground/80">
          {report.dreamReadiness.explanation}
        </p>
      ) : null}
      {missing.length > 0 ? (
        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {copy.readinessMissing}
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <li
                key={m}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
