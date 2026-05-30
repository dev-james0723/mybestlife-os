"use client";

import type { Locale } from "date-fns";
import { Check, ExternalLink, Eye, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { SignalFollowUp, SignalFollowUpStatus } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { TopicChip, formatRelative } from "./signal-chrome";

type Props = {
  followUps: SignalFollowUp[];
  copy: SignalsUiCopy;
  dateLocale: Locale;
  onSetStatus: (signalId: string, status: SignalFollowUpStatus) => void;
  onRemove: (signalId: string) => void;
  onOpen: (signalId: string) => void;
};

/**
 * Follow-Up Tracker (§7/§21) — the calm "developing stories you're watching"
 * surface. Source-grounded: every row links to the real article, and the
 * "developed N times" count comes from real fresh items seen during refreshes
 * (never fabricated). Shows watched stories first, then recently-closed ones.
 */
export function SignalsFollowUps({
  followUps,
  copy,
  dateLocale,
  onSetStatus,
  onRemove,
  onOpen,
}: Props) {
  if (followUps.length === 0) return null;

  const watching = followUps.filter((f) => f.status === "watching");
  const done = followUps.filter((f) => f.status === "done");

  return (
    <section aria-label={copy.followUps.title} className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
          {copy.followUps.title}
        </h2>
        <p className="text-xs text-muted-foreground">
          {watching.length > 0
            ? copy.followUps.trackedCount(watching.length)
            : copy.followUps.subtitle}
        </p>
      </div>

      <div className="space-y-2">
        {[...watching, ...done].map((f) => (
          <FollowUpRow
            key={f.signalId}
            followUp={f}
            copy={copy}
            dateLocale={dateLocale}
            onSetStatus={onSetStatus}
            onRemove={onRemove}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function FollowUpRow({
  followUp: f,
  copy,
  dateLocale,
  onSetStatus,
  onRemove,
  onOpen,
}: {
  followUp: SignalFollowUp;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  onSetStatus: (signalId: string, status: SignalFollowUpStatus) => void;
  onRemove: (signalId: string) => void;
  onOpen: (signalId: string) => void;
}) {
  const isDone = f.status === "done";
  return (
    <GlassPanel
      variant="strong"
      className={cn("flex items-start gap-3 p-3", isDone && "opacity-70")}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TopicChip label={f.topic} className="py-0" />
          {f.updateCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
              {copy.followUps.updates(f.updateCount)}
            </span>
          )}
          {isDone && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.followUps.statusDone}
            </span>
          )}
        </div>
        <p className={cn("text-sm font-medium leading-snug text-foreground", isDone && "line-through")}>
          {f.headline}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{f.sourceName}</span>
          <span aria-hidden className="opacity-50">·</span>
          <span>{copy.followUps.trackedSince(formatRelative(f.createdAt, dateLocale))}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <a
          href={f.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpen(f.signalId)}
          aria-label={copy.card.openSource}
          title={copy.card.openSource}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {isDone ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onSetStatus(f.signalId, "watching")}
            aria-label={copy.followUps.reopen}
            title={copy.followUps.reopen}
          >
            <RotateCcw />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onSetStatus(f.signalId, "done")}
            aria-label={copy.followUps.markDone}
            title={copy.followUps.markDone}
          >
            <Check />
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onRemove(f.signalId)}
          aria-label={copy.followUps.remove}
          title={copy.followUps.remove}
        >
          <X />
        </Button>
      </div>
    </GlassPanel>
  );
}
