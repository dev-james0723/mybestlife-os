"use client";

import { useId, useState, type ReactNode } from "react";
import type { Locale } from "date-fns";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  ListPlus,
  Loader2,
  MoreHorizontal,
  PlayCircle,
  ThumbsDown,
  ThumbsUp,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SignalActionKind, SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import {
  AiOverview,
  ConnectionStrip,
  ContentTypeChip,
  SourceIcon,
  SourceLine,
  TopicChip,
} from "./signal-chrome";
import { SignalThumbnail } from "./SignalThumbnail";

export type SignalCardVariant =
  | "hero"
  | "feature"
  | "topLead"
  | "ranked"
  | "preview"
  | "list"
  | "compact";

export type SignalCardCallbacks = {
  saving?: boolean;
  saved?: boolean;
  /** Whether this story is in the Follow-Up Tracker. */
  tracked?: boolean;
  /** Whether a Create-Task write is in flight for this card. */
  creatingTask?: boolean;
  onSave: (signal: SignalItem) => void;
  onDismiss: (signal: SignalItem) => void;
  onMore: (signal: SignalItem) => void;
  onLess: (signal: SignalItem) => void;
  onOpen: (signal: SignalItem) => void;
  onMuteSource?: (signal: SignalItem) => void;
  onFollowTopic?: (signal: SignalItem) => void;
  /** "Less of this" feedback (not relevant / too political / negative / shallow / known). */
  onFeedback?: (signal: SignalItem, kind: SignalActionKind) => void;
  /** Track / untrack a developing story (Follow-Up Tracker). */
  onTrack?: (signal: SignalItem) => void;
  /** Create a Task from this signal (Signals → Tasks write-path). */
  onCreateTask?: (signal: SignalItem) => void;
};

type Props = SignalCardCallbacks & {
  signal: SignalItem;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  variant?: SignalCardVariant;
  rank?: number;
};

export function SignalCard(props: Props) {
  const { variant = "list" } = props;
  if (variant === "compact") return <CompactCard {...props} />;
  if (variant === "topLead") return <TopLeadCard {...props} />;
  if (variant === "ranked") return <RankedCard {...props} />;
  if (variant === "preview") return <PreviewCard {...props} />;
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

function PrimaryActions(props: Props & { compact?: boolean }) {
  const { signal, copy, saving, saved, onSave, onDismiss, onOpen, compact } = props;
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
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDismiss(signal)}
          aria-label={copy.card.dismiss}
        >
          <X />
          {copy.card.dismiss}
        </Button>
      )}
      <MoreActionsMenu {...props} />
      <OpenLink signal={signal} copy={copy} onOpen={onOpen} className="ml-auto" />
    </div>
  );
}

/**
 * Overflow menu collecting the write-paths (Create task, Track) and the
 * "less of this" feedback (§17). Each item maps to a perceptible effect; the
 * feedback options are routed through `onFeedback` and logged to Signal Memory.
 */
function MoreActionsMenu({
  signal,
  copy,
  tracked,
  creatingTask,
  onCreateTask,
  onTrack,
  onMuteSource,
  onFeedback,
}: Props) {
  const hasFeedback = !!onFeedback;
  if (!onCreateTask && !onTrack && !onMuteSource && !hasFeedback) return null;
  const fb = (kind: SignalActionKind) => () => onFeedback?.(signal, kind);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label={copy.card.moreActions} title={copy.card.moreActions}>
            {creatingTask ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        {onCreateTask && (
          <DropdownMenuItem onClick={() => onCreateTask(signal)} disabled={creatingTask}>
            <ListPlus />
            {copy.card.createTask}
          </DropdownMenuItem>
        )}
        {onTrack && (
          <DropdownMenuItem onClick={() => onTrack(signal)}>
            {tracked ? <EyeOff /> : <Eye />}
            {tracked ? copy.card.untrack : copy.card.track}
          </DropdownMenuItem>
        )}
        {hasFeedback && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{copy.card.lessOfThis}</DropdownMenuLabel>
              <DropdownMenuItem onClick={fb("not_relevant")}>{copy.card.notRelevant}</DropdownMenuItem>
              <DropdownMenuItem onClick={fb("too_political")}>{copy.card.tooPolitical}</DropdownMenuItem>
              <DropdownMenuItem onClick={fb("too_negative")}>{copy.card.tooNegative}</DropdownMenuItem>
              <DropdownMenuItem onClick={fb("too_shallow")}>{copy.card.tooShallow}</DropdownMenuItem>
              <DropdownMenuItem onClick={fb("already_known")}>{copy.card.alreadyKnown}</DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {onMuteSource && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onMuteSource(signal)}>
              <VolumeX />
              {copy.card.muteSource}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RankBadge({ rank }: { rank?: number }) {
  if (!rank) return null;
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[0.45rem] bg-lime-300 text-xs font-black tabular-nums text-slate-950 shadow-[0_10px_24px_rgba(190,242,100,0.22)]">
      {rank}
    </span>
  );
}

function DetailsDisclosure({
  signal,
  copy,
  className,
  children,
  compactActions = false,
  ...props
}: Props & {
  className?: string;
  children?: ReactNode;
  compactActions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const relevanceLine = signal.whyRelevantToUser ?? signal.whyItMatters;

  return (
    <div className={cn("border-t border-border/40 pt-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold text-lime-700 transition-colors hover:text-lime-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 dark:text-lime-300 dark:hover:text-lime-200"
      >
        {open ? copy.card.collapse : copy.card.whyThisSignal}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={detailsId} className="space-y-3 pt-2">
          {children}
          <div className="grid gap-2 sm:grid-cols-2">
            <RelevanceBlock label={copy.card.whyItMatters} value={signal.whyItMatters} />
            {signal.whyRelevantToUser && (
              <RelevanceBlock label={copy.card.whyForYou} value={signal.whyRelevantToUser} />
            )}
          </div>
          <ConnectionStrip signal={signal} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {signal.isDemo
              ? copy.card.sampleNote
              : relevanceLine}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => props.onMore(signal)}
              aria-label={copy.card.moreLikeThis}
              title={copy.card.moreLikeThis}
            >
              <ThumbsUp />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => props.onLess(signal)}
              aria-label={copy.card.lessLikeThis}
              title={copy.card.lessLikeThis}
            >
              <ThumbsDown />
            </Button>
            {props.onFollowTopic && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => props.onFollowTopic?.(signal)}
                aria-label={copy.card.followTopic}
                title={copy.card.followTopic}
              >
                {copy.card.followTopic}
              </Button>
            )}
          </div>
          <PrimaryActions {...props} signal={signal} copy={copy} compact={compactActions} />
        </div>
      )}
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

function CompactSummary({
  signal,
  copy,
  className,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  className?: string;
}) {
  const text = signal.aiOverview ?? signal.summary;
  if (!text) return null;
  return (
    <div className={cn("space-y-1", className)}>
      <p className="line-clamp-2 text-xs leading-relaxed text-foreground/75">{text}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {copy.card.overview}
      </p>
    </div>
  );
}

// ── Daily Top 3 lead card ──

function TopLeadCard(props: Props) {
  const { signal, copy, dateLocale, rank } = props;

  return (
    <GlassPanel
      data-signal-id={signal.id}
      variant="default"
      className="calendar-specular-highlight overflow-hidden p-3 scroll-mt-24 sm:p-4 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60"
    >
      <article
        aria-label={signal.headline}
        className="grid grid-cols-[minmax(7rem,0.82fr)_minmax(0,1.18fr)] gap-3 sm:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.1fr)] sm:gap-4 lg:grid-cols-[minmax(0,1.36fr)_minmax(300px,0.86fr)]"
      >
        <div className="relative min-w-0">
          <SignalThumbnail
            signal={signal}
            copy={copy}
            className="h-full min-h-44 w-full lg:min-h-[21rem]"
            rounded="rounded-xl"
          />
          <div className="absolute left-2 top-2">
            <RankBadge rank={rank} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 py-0.5">
          <Labels signal={signal} copy={copy} />
          <h3 className="line-clamp-4 text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl lg:text-2xl">
            {signal.headline}
          </h3>
          <SourceLine signal={signal} copy={copy} dateLocale={dateLocale} showDomain={false} />
          <AiOverview signal={signal} copy={copy} clamp={3} />
          <DetailsDisclosure {...props} className="mt-auto" />
        </div>
      </article>
    </GlassPanel>
  );
}

// ── Ranked Daily Top 3 secondary cards ──

function RankedCard(props: Props) {
  const { signal, copy, dateLocale, rank } = props;

  return (
    <GlassPanel
      data-signal-id={signal.id}
      variant="strong"
      className="h-full overflow-hidden p-3 scroll-mt-24 sm:p-3.5 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60"
    >
      <article aria-label={signal.headline} className="flex h-full gap-3">
        <SignalThumbnail
          signal={signal}
          copy={copy}
          className="size-24 shrink-0 sm:size-28 lg:size-28"
          rounded="rounded-lg"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <RankBadge rank={rank} />
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
              {signal.headline}
            </h3>
          </div>
          <SourceLine
            signal={signal}
            copy={copy}
            dateLocale={dateLocale}
            showDomain={false}
            className="text-[11px]"
          />
          <CompactSummary signal={signal} copy={copy} className="hidden lg:block" />
          <DetailsDisclosure {...props} compactActions className="mt-auto" />
        </div>
      </article>
    </GlassPanel>
  );
}

// ── Lower section preview cards ──

function PreviewCard(props: Props) {
  const { signal, copy, dateLocale } = props;

  return (
    <GlassPanel
      data-signal-id={signal.id}
      variant="strong"
      className="h-full overflow-hidden p-3 scroll-mt-24 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60"
    >
      <article aria-label={signal.headline} className="flex h-full gap-3">
        <SignalThumbnail signal={signal} copy={copy} className="size-20 shrink-0" rounded="rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {signal.headline}
          </h3>
          <SourceLine
            signal={signal}
            copy={copy}
            dateLocale={dateLocale}
            showDomain={false}
            className="text-[11px]"
          />
          <CompactSummary signal={signal} copy={copy} className="hidden lg:block" />
          <DetailsDisclosure {...props} compactActions className="mt-auto" />
        </div>
      </article>
    </GlassPanel>
  );
}

// ── Feature / hero (thumbnail on top) ──

function FeatureCard(props: Props) {
  const { signal, copy, dateLocale, variant } = props;
  const isHero = variant === "hero";
  return (
    <GlassPanel
      data-signal-id={signal.id}
      variant="default"
      className={cn(
        "calendar-specular-highlight flex flex-col overflow-hidden p-0 scroll-mt-24 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60",
        !isHero && "h-full",
      )}
    >
      <SignalThumbnail
        signal={signal}
        copy={copy}
        rounded="rounded-none"
        className={cn("w-full", isHero ? "aspect-[16/9]" : "aspect-[16/10]")}
      />
      <div className={cn("flex flex-1 flex-col gap-3", isHero ? "p-4 sm:p-5" : "p-4")}>
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
        <ConnectionStrip signal={signal} />
        <AiOverview signal={signal} copy={copy} clamp={isHero ? undefined : 3} />
        <DetailsDisclosure {...props} className={cn("pt-2", !isHero && "mt-auto")} />
      </div>
    </GlassPanel>
  );
}

// ── List (horizontal thumbnail + text) ──

function ListCard(props: Props) {
  const { signal, copy, dateLocale } = props;
  return (
    <GlassPanel
      data-signal-id={signal.id}
      variant="strong"
      interactive
      className="h-full overflow-hidden p-3 scroll-mt-24 sm:p-4 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60"
    >
      <article aria-label={signal.headline} className="flex h-full gap-3 sm:gap-4">
        <SignalThumbnail
          signal={signal}
          copy={copy}
          className="size-20 shrink-0 sm:size-24"
        />
        <div className="flex min-w-0 flex-1 flex-col space-y-2">
          <Labels signal={signal} copy={copy} />
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-base">
            {signal.headline}
          </h3>
          <SourceLine signal={signal} copy={copy} dateLocale={dateLocale} showDomain={false} />
          <AiOverview signal={signal} copy={copy} clamp={2} />
          <DetailsDisclosure {...props} className="mt-auto" />
        </div>
      </article>
    </GlassPanel>
  );
}

// ── Compact (dense row) ──

function CompactCard(props: Props) {
  const { signal, copy, onOpen } = props;
  return (
    <div
      data-signal-id={signal.id}
      className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/50 px-3 py-2 scroll-mt-24 transition-colors hover:bg-muted/30 [&.signal-focused]:ring-2 [&.signal-focused]:ring-primary/60"
    >
      <SignalThumbnail signal={signal} copy={copy} rounded="rounded-md" className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{signal.headline}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <TopicChip label={signal.topic} className="py-0" />
          <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
            <SourceIcon source={signal.source} size={14} />
            {signal.source.name}
          </span>
        </div>
      </div>
      <OpenLink signal={signal} copy={copy} onOpen={onOpen} />
    </div>
  );
}
