"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { DailyPlanQualityReport, PlanQualitySuggestedChange } from "@/types/database";

export function PlanQualityDrawer({
  copy,
  open,
  onOpenChange,
  report,
  onApplyChange,
  onApplyAllSafe,
}: {
  copy: DailyPlannerUiCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DailyPlanQualityReport | null | undefined;
  onApplyChange: (change: PlanQualitySuggestedChange) => void;
  onApplyAllSafe: () => void;
}) {
  const safeChanges = report?.suggested_changes.filter((change) => change.safeToAutoApply) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom-card" className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl">
        <SheetHeader className="border-b border-border/50 px-4 pt-4 pb-3 sm:px-6">
          <SheetTitle>{copy.planQualityDrawerTitle}</SheetTitle>
          <SheetDescription>
            {report?.summary ?? copy.planQualityUnchecked}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {report ? (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-4">
                <Metric label={copy.planQuality} value={String(report.score)} />
                <Metric label={copy.deepWorkLabel} value={copy.formatMinutes(report.focus_target_minutes)} />
                <Metric label={copy.breaksLabel} value={report.break_status} />
                <Metric label={copy.stimulationRisk} value={report.stimulation_risk} />
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{copy.detectedIssues}</h3>
                {report.issues.length > 0 ? (
                  <div className="space-y-2">
                    {report.issues.map((issue) => (
                      <div key={issue.id} className="rounded-lg border border-border/70 bg-card/50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{issue.title}</p>
                              <Badge variant="secondary" className="text-[10px]">
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {issue.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {copy.noQualityIssue}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{copy.recommendedChanges}</h3>
                {report.suggested_changes.length > 0 ? (
                  <div className="space-y-2">
                    {report.suggested_changes.map((change) => (
                      <div key={change.id} className="rounded-lg border border-border/70 bg-card/50 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <p className="text-sm font-semibold">{change.title}</p>
                              {change.safeToAutoApply ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {copy.safeChangeLabel}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {change.description}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-11 min-h-11 rounded-xl"
                            onClick={() => onApplyChange(change)}
                            disabled={!change.safeToAutoApply}
                          >
                            {copy.applyChange}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border/70 bg-card/50 p-3 text-sm text-muted-foreground">
                    {copy.noQualityIssue}
                  </p>
                )}
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.planQualityUnchecked}</p>
          )}
        </div>

        <SheetFooter className="border-t border-border/50 bg-popover/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            {copy.dialogClose}
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11 rounded-xl"
            onClick={onApplyAllSafe}
            disabled={safeChanges.length === 0}
          >
            {copy.applyAllSafeChanges}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
