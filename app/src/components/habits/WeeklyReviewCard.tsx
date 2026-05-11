"use client";

import { RefreshCw } from "lucide-react";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WeeklyReviewCardProps {
  weekStart: string;
  body?: string;
  /** When true, show `copy.insightFailed` as an error line instead of body/empty. */
  error?: boolean;
  loading?: boolean;
  onGenerate?: () => void;
  isRefreshing?: boolean;
  cached?: boolean;
  copy: HabitsUiCopy;
}

export function WeeklyReviewCard({
  weekStart,
  body,
  error,
  loading,
  onGenerate,
  isRefreshing,
  cached,
  copy,
}: WeeklyReviewCardProps) {
  return (
    <Card
      data-testid="weekly-review-card"
      data-week-start={weekStart}
      className="overflow-hidden border-border/80 shadow-none"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/50 bg-muted/20 pb-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {weekStart}
          </p>
          <h3 className="text-base font-medium leading-tight">{copy.weeklyReviewTitle}</h3>
          {cached && (
            <Badge variant="outline" className="mt-1 w-fit text-[0.65rem] font-normal">
              {copy.insightCached}
            </Badge>
          )}
        </div>
        {onGenerate && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            disabled={loading || isRefreshing}
            onClick={() => onGenerate()}
          >
            <RefreshCw
              className={cn("size-3.5", (loading || isRefreshing) && "animate-spin")}
            />
            {copy.weeklyReviewRefresh}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-[94%] animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{copy.insightFailed}</p>
        ) : (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {body?.trim() ? body : copy.weeklyReviewEmpty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
