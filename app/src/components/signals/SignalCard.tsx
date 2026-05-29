"use client";

import { useId, useState } from "react";
import type { Locale } from "date-fns";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Loader2,
  PlayCircle,
  ThumbsDown,
  ThumbsUp,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import type { SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { AiOverview, ContentTypeChip, SourceLine, TopicChip } from "./signal-chrome";
import { SignalThumbnail } from "./SignalThumbnail";

export type SignalCardVariant = "hero" | "feature" | "list" | "compact";

export type SignalCardCallbacks = {
  saving?: boolean;
  saved?: boolean;
  onSave: (signal: SignalItem) => void;
  onDismiss: (signal: SignalItem) => void;
  onMore: (signal: SignalItem) => void;
  onLess: (signal: SignalItem) => void;
  onOpen: (signal: SignalItem) => void;
  onMuteSource?: (signal: SignalItem) => void;
  onFollowTopic?: (signal: SignalItem) => void;
};

type Props = SignalCardCallbacks & {
  signal: SignalItem;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  variant?: SignalCardVariant;
};

export function SignalCard(props: Props) {
  const { variant = "list" } = props;
  if (variant === "compact") return <CompactCard {...props} />;
  if (variant === "list") return <ListCard {...props} />;
  return <FeatureCard {...props} />;
}

// ── Shared bits ──

function Labels({ signal, copy }: { signal: SignalItem; copy: SignalsUiCopy }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ContentTypeChip type={signal.contentType} copy={copy} />
      <TopicChip label={signal.topic} />
      {signal.mediaType === "video" && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <PlayCircle className="h-3 w-3" /> {copy.filters.media.video}
        </span>
      )}
      {signal.isDemo && (
        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.header.demoBadge}
        </span>
      )}
    </div>
  );
}

function OpenLink({
  signal,
  copy,
  onOpen,
  className,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  onOpen: (s: SignalItem) => void;
  className?: string;
}) {
  const isVideo = signal.mediaType === "video";
  const href = isVideo ? signal.videoUrl ?? signal.sourceUrl : signal.sourceUrl;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onOpen(signal)}
      aria-label={`${isVideo ? copy.video.watch : copy.card.openSource}: ${signal.source.name}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      {isVideo ? copy.video.watch : copy.card.openSource}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function PrimaryActions({
  signal,
  copy,
  saving,
  saved,
  onSave,
  onDismiss,
  onOpen,
  compact,
}: Props & { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        size="sm"
        variant={saved ? "secondary" : "default"}
        onClick={() => onSave(signal)}
        disabled={saving || saved}
        aria-label={saved ? copy.card.saved : copy.card.save}
      >
        {saving ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />}
        {!compact && (saved ? copy.card.saved : copy.card.save)}
      </Button>
      {!compact && (
        <Button size="sm" variant="ghost" onClick={() => onDismiss(signal)} aria-label={copy.card.dismiss}>
          <X />
          {copy.card.dismiss}
        </Button>
      )}
      <OpenLink signal={signal} copy={copy} onOpen={onOpen} className="ml-auto" />
    </div>
  );
}

function ExpandedExtras({
  signal,
  copy,
  onMore,
  onLess,
  onMuteSource,
  onFollowTopic,
}: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = useId();
  const relevanceLine = signal.whyRelevantToUser ?? signal.whyItMatters;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <RelevanceBlock label={copy.card.whyItMatters} value={signal.whyItMatters} />
        {signal.whyRelevantToUser && (
          <RelevanceBlock label={copy.card.whyForYou} value={signal.whyRelevantToUser} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => onMore(signal)} aria-label={copy.card.moreLikeThis} title={copy.card.moreLikeThis}>
          <ThumbsUp />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onLess(signal)} aria-label={copy.card.lessLikeThis} title={copy.card.lessLikeThis}>
          <ThumbsDown />
        </Button>
        {onMuteSource && (
          <Button size="sm" variant="ghost" onClick={() => onMuteSource(signal)} aria-label={copy.card.muteSource} title={copy.card.muteSource}>
            <VolumeX />
            {copy.card.muteSource}
          </Button>
        )}
        {onFollowTopic && (
          <Button size="sm" variant="ghost" onClick={() => onFollowTopic(signal)} aria-label={copy.card.followTopic} title={copy.card.followTopic}>
            {copy.card.followTopic}
          </Button>
        )}
      </div>

      <div className="border-t border-border/40 pt-2">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          aria-expanded={whyOpen}
          aria-controls={whyId}
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {copy.card.whyThisSignal}
          <ChevronDown className={cn("h-3 w-3 transition-transform", whyOpen && "rotate-180")} />
        </button>
        {whyOpen && (
          <div id={whyId} className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="text-foreground/80">{relevanceLine}</p>
            <p>
              {signal.isDemo
                ? copy.card.sampleNote
                : "Ranked by importance, freshness, source quality, and fit to your topics — not by an AI guess."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RelevanceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{value}</p>
    </div>
  );
}

// ── Feature / hero (thumbnail on top) ──

function FeatureCard(props: Props) {
  const { signal, copy, dateLocale, variant } = props;
  const isHero = variant === "hero";
  return (
    <GlassPanel
      variant="default"
      className="calendar-specular-highlight flex h-full flex-col overflow-hidden p-0"
    >
      <SignalThumbnail
        signal={signal}
        copy={copy}
        rounded="rounded-none"
        className={cn("w-full", isHero ? "aspect-[16/9]" : "aspect-[16/10]")}
      />
      <div className={cn("flex flex-1 flex-col gap-3", isHero ? "p-5 sm:p-6" : "p-4")}>
        <Labels signal={signal} copy={copy} />
        <h3
          className={cn(
            "font-semibold leading-snug tracking-tight text-foreground",
            isHero ? "text-xl sm:text-2xl" : "text-base",
          )}
        >
          {signal.headline}
        </h3>
        <SourceLine signal={signal} copy={copy} dateLocale={dateLocale} />
        <AiOverview signal={signal} copy={copy} clamp={isHero ? undefined : 3} />
        <div className="mt-auto pt-1">
          <PrimaryActions {...props} />
        </div>
        {isHero && <ExpandedExtras {...props} />}
      </div>
    </GlassPanel>
  );
}

// ── List (horizontal thumbnail + text, expand/collapse) ──

function ListCard(props: Props) {
  const { signal, copy, dateLocale } = props;
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <GlassPanel variant="strong" interactive className="overflow-hidden p-3 sm:p-4">
      <article aria-label={signal.headline} className="flex gap-3 sm:gap-4">
        <SignalThumbnail
          signal={signal}
          copy={copy}
          className="size-20 shrink-0 sm:size-28"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Labels signal={signal} copy={copy} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="group flex w-full items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground sm:text-base">
              {signal.headline}
            </span>
            <ChevronDown
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
          <SourceLine signal={signal} copy={copy} dateLocale={dateLocale} />
          <AiOverview signal={signal} copy={copy} clamp={expanded ? undefined : 2} />
          <div id={detailsId} className="space-y-3">
            <PrimaryActions {...props} />
            {expanded && <ExpandedExtras {...props} />}
          </div>
        </div>
      </article>
    </GlassPanel>
  );
}

// ── Compact (dense row) ──

function CompactCard(props: Props) {
  const { signal, copy, dateLocale, onOpen } = props;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/50 px-3 py-2 transition-colors hover:bg-muted/30">
      <SignalThumbnail signal={signal} copy={copy} rounded="rounded-md" className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{signal.headline}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <TopicChip label={signal.topic} className="py-0" />
          <span className="font-medium text-foreground/70">{signal.source.name}</span>
        </div>
      </div>
      <OpenLink signal={signal} copy={copy} onOpen={onOpen} />
    </div>
  );
}
