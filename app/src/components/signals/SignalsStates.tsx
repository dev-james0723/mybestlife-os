"use client";

import { CheckCircle2, Loader2, Radar, RotateCw, SignalZero, TriangleAlert } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

/** Loading — "Finding today's strongest signals…" */
export function SignalsLoading({ copy }: { copy: SignalsUiCopy }) {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Radar className="h-4 w-4 animate-pulse" />
        <span>{copy.states.loadingTitle}</span>
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <GlassPanel key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

/** Empty — no strong signals found. */
export function SignalsEmpty({
  copy,
  onRetry,
}: {
  copy: SignalsUiCopy;
  onRetry: () => void;
}) {
  return (
    <GlassPanel className="p-8 text-center">
      <SignalZero className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium text-foreground">{copy.states.emptyTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.states.emptyHint}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCw />
        {copy.states.retry}
      </Button>
    </GlassPanel>
  );
}

/** Error — could not update. */
export function SignalsError({
  copy,
  onRetry,
}: {
  copy: SignalsUiCopy;
  onRetry: () => void;
}) {
  return (
    <GlassPanel className="p-8 text-center">
      <TriangleAlert className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium text-foreground">{copy.states.errorTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.states.errorHint}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCw />
        {copy.states.retry}
      </Button>
    </GlassPanel>
  );
}

/** Filtered-empty — no signals for the current filters; offer a clear-all. */
export function SignalsFilteredEmpty({
  copy,
  onClear,
}: {
  copy: SignalsUiCopy;
  onClear: () => void;
}) {
  return (
    <GlassPanel className="p-8 text-center">
      <SignalZero className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium text-foreground">{copy.states.filteredEmptyTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.states.filteredEmptyHint}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onClear}>
        {copy.filters.clearAll}
      </Button>
    </GlassPanel>
  );
}

/** Inline busy banner for the two refresh actions (refreshing / regenerating). */
export function SignalsBusyBanner({ label }: { label: string }) {
  return (
    <GlassPanel
      variant="strong"
      className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </GlassPanel>
  );
}

/** Caught-up — the deliberate calm terminal state. No "load more". */
export function SignalsCaughtUp({ copy }: { copy: SignalsUiCopy }) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <CheckCircle2 className="h-6 w-6 text-emerald-500/80" />
      <p className="text-sm font-medium text-foreground">{copy.states.caughtUpTitle}</p>
      <p className="text-xs text-muted-foreground">{copy.states.caughtUpSubtitle}</p>
    </div>
  );
}
