"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface InsightCalloutProps {
  title: string;
  body?: ReactNode;
  loading?: boolean;
  fallback?: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  cached?: boolean;
  /** Optional short label shown next to the title (e.g. “Patterns”). */
  eyebrow?: string;
  refreshLabel: string;
  cachedLabel: string;
}

export function InsightCallout({
  title,
  body,
  loading,
  fallback,
  onRefresh,
  isRefreshing,
  cached,
  eyebrow,
  refreshLabel,
  cachedLabel,
}: InsightCalloutProps) {
  return (
    <Card
      data-testid="insight-callout"
      className="border-primary/15 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent shadow-none"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h3 className="text-base font-medium leading-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {cached && (
              <Badge variant="outline" className="text-[0.65rem] font-normal">
                {cachedLabel}
              </Badge>
            )}
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            disabled={loading || isRefreshing}
            onClick={() => onRefresh()}
          >
            <RefreshCw
              className={cn("size-3.5", (loading || isRefreshing) && "animate-spin")}
            />
            {refreshLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2 py-1">
            <div className="h-3 w-full max-w-md animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 max-w-sm animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 max-w-xs animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-muted-foreground">
            {body ?? fallback ?? null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
