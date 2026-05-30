"use client";

import { useState, type ReactNode } from "react";
import type { Locale } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SignalActionKind, SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { SignalCard, type SignalCardVariant } from "./SignalCard";

export type SignalCardHandlers = {
  savingId: string | null;
  savedIds: Set<string>;
  /** Write-in-flight id for Create-Task. */
  creatingTaskId?: string | null;
  /** Per-card "is this story tracked?" predicate. */
  isTracked?: (signalId: string) => boolean;
  onSave: (signal: SignalItem) => void;
  onDismiss: (signal: SignalItem) => void;
  onMore: (signal: SignalItem) => void;
  onLess: (signal: SignalItem) => void;
  onOpen: (signal: SignalItem) => void;
  onMuteSource?: (signal: SignalItem) => void;
  onFollowTopic?: (signal: SignalItem) => void;
  onFeedback?: (signal: SignalItem, kind: SignalActionKind) => void;
  onTrack?: (signal: SignalItem) => void;
  onCreateTask?: (signal: SignalItem) => void;
};

/** Shared card renderer — spreads the handler bundle onto a SignalCard. */
export function SignalCardWithHandlers({
  signal,
  copy,
  dateLocale,
  variant,
  handlers,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  variant: SignalCardVariant;
  handlers: SignalCardHandlers;
}) {
  return (
    <SignalCard
      signal={signal}
      copy={copy}
      dateLocale={dateLocale}
      variant={variant}
      saving={handlers.savingId === signal.id}
      saved={handlers.savedIds.has(signal.id)}
      creatingTask={handlers.creatingTaskId === signal.id}
      tracked={handlers.isTracked?.(signal.id) ?? false}
      onSave={handlers.onSave}
      onDismiss={handlers.onDismiss}
      onMore={handlers.onMore}
      onLess={handlers.onLess}
      onOpen={handlers.onOpen}
      onMuteSource={handlers.onMuteSource}
      onFollowTopic={handlers.onFollowTopic}
      onFeedback={handlers.onFeedback}
      onTrack={handlers.onTrack}
      onCreateTask={handlers.onCreateTask}
    />
  );
}

type Props = {
  title: string;
  subtitle?: string;
  items: SignalItem[];
  copy: SignalsUiCopy;
  dateLocale: Locale;
  variant?: SignalCardVariant;
  layout?: "stack" | "grid" | "carousel";
  headerRight?: ReactNode;
  note?: ReactNode;
  handlers: SignalCardHandlers;
  /** Initial cap; a "Show more" button reveals the rest (never infinite). */
  initialCount?: number;
};

export function SignalsSection({
  title,
  subtitle,
  items,
  copy,
  dateLocale,
  variant = "list",
  layout = "grid",
  headerRight,
  note,
  handlers,
  initialCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const cap = initialCount ?? items.length;
  const visible = expanded ? items : items.slice(0, cap);
  const hasMore = items.length > visible.length;

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight}
      </div>

      {note}

      {visible.length > 0 && (
        <div
          data-stagger
          className={cn(
            layout === "stack" && "space-y-4",
            layout === "grid" && "grid auto-rows-fr gap-3 md:grid-cols-2",
            layout === "carousel" &&
              "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]",
          )}
        >
          {visible.map((signal) => (
            <div
              key={signal.id}
              className={cn(
                layout === "grid" && "h-full",
                layout === "carousel" && "w-[78%] shrink-0 snap-start sm:w-[42%] lg:w-[31%]",
              )}
            >
              <SignalCardWithHandlers
                signal={signal}
                copy={copy}
                dateLocale={dateLocale}
                variant={variant}
                handlers={handlers}
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
            {copy.filters.showMoreFromTopic(title)}
          </Button>
        </div>
      )}
    </section>
  );
}
