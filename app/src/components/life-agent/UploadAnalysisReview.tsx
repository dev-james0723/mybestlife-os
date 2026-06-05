"use client";

import { AlertTriangle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { AnalyzeUploadResponse, LifeAgentUploadIntent } from "@/lib/life-agent/upload-types";
import { UploadIntentPicker } from "@/components/life-agent/UploadIntentPicker";
import { cn } from "@/lib/utils";

type UploadAnalysisReviewProps = {
  ui: LifeAgentUiCopy;
  result: AnalyzeUploadResponse;
  selectedIntent: LifeAgentUploadIntent | null;
  onSelectIntent: (intent: LifeAgentUploadIntent) => void;
  onConfirmIntent: () => void;
  onDismiss: () => void;
  isRouting?: boolean;
  routeError?: string | null;
  className?: string;
};

export function UploadAnalysisReview({
  ui,
  result,
  selectedIntent,
  onSelectIntent,
  onConfirmIntent,
  onDismiss,
  isRouting = false,
  routeError = null,
  className,
}: UploadAnalysisReviewProps) {
  const { analysis } = result;
  const typeLabel =
    ui.uploadDetectedTypeLabels[analysis.detectedType] ?? analysis.detectedType;

  return (
    <article
      className={cn(
        "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{result.fileName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {ui.uploadConfidenceLabel(Math.round(analysis.confidence * 100))}
            </span>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          {ui.uploadDismiss}
        </Button>
      </header>

      {result.previewUrl && (
        <img
          src={result.previewUrl}
          alt=""
          className="max-h-48 w-full rounded-lg border border-border/50 object-contain bg-muted/30"
        />
      )}

      <div className="flex gap-2 rounded-lg bg-muted/30 p-3 text-sm">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-foreground/90">{analysis.summary}</p>
      </div>

      {analysis.extractedTasks && analysis.extractedTasks.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {ui.uploadExtractedTasks}
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {analysis.extractedTasks.map((t) => (
              <li key={t.title}>{t.title}</li>
            ))}
          </ul>
        </section>
      )}

      {analysis.warnings.length > 0 && (
        <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
          {analysis.warnings.map((w) => (
            <li key={w} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{ui.uploadReviewDisclaimer}</p>

      <UploadIntentPicker
        ui={ui}
        selectedIntent={selectedIntent}
        onSelect={onSelectIntent}
        disabled={isRouting}
      />

      {routeError && (
        <p className="text-xs text-destructive" role="alert">
          {routeError}
        </p>
      )}

      <Button
        type="button"
        className="w-full rounded-2xl sm:w-auto"
        disabled={!selectedIntent || isRouting}
        onClick={onConfirmIntent}
      >
        {isRouting ? ui.uploadCreatingPreviews : ui.uploadCreatePreviews}
      </Button>
    </article>
  );
}
