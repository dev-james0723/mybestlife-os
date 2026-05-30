"use client";

/**
 * Context Health (spec §18). Shows how much memory the app has to help the
 * user — NOT a score of the person. Displays the score + which factors are
 * still missing, so the user knows what to add.
 */

import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import {
  getHealthFactorLabel,
  getHealthScoreClassName,
} from "@/components/relationship/utils/intelligence-display";
import type { ContextHealth } from "@/lib/relationships/intelligence";

export function RelationshipContextHealth({ health }: { health: ContextHealth }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Gauge className="h-4 w-4" aria-hidden />
          {copy.modalContextHealth}
        </h3>
        <Badge
          variant="outline"
          className={`font-normal ${getHealthScoreClassName(health.score)}`}
        >
          {health.score}%
        </Badge>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={health.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${health.score}%` }}
        />
      </div>

      {health.missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {copy.healthMissingLabel}
          </p>
          <div className="flex flex-wrap gap-1">
            {health.missing.map((key) => (
              <Badge
                key={key}
                variant="outline"
                className="font-normal text-[10px] text-muted-foreground"
              >
                {getHealthFactorLabel(key, copy)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
