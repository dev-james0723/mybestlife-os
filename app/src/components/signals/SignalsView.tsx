"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  MoreHorizontal,
  Radar,
  RotateCw,
  Settings2,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import { GlassPanel } from "@/components/ui/glass-panel";
import { OSControl } from "@/components/ui/os-primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignalsPreferences } from "@/hooks/signals/use-signals-preferences";
import { useLifeOsContext } from "@/hooks/signals/use-life-os-context";
import { useSignalsPage } from "@/hooks/signals/use-signals-page";
import { useSignalMemory } from "@/hooks/signals/use-signal-memory";
import { useSignalFollowUps } from "@/hooks/signals/use-signal-followups";
import { createTaskFromSignal, saveSignalToBrain } from "@/lib/signals/brain-adapter";
import { computeWeeklyReflection, summarizeMemory } from "@/lib/signals/behavior";
import {
  detectSignalsLocation,
  resolveSignalsLocation,
  weatherLocationToLocalLocation,
} from "@/lib/signals/location";
import {
  applySignalFilters,
  DEFAULT_FILTER_STATE,
  isDefaultFilter,
} from "@/lib/signals/filters";
import type {
  SignalActionKind,
  SignalItem,
  SignalsFilterState,
  SignalsViewMode,
} from "@/lib/signals/types";
import { SignalsOnboarding } from "./SignalsOnboarding";
import { SignalsFollowUps } from "./SignalsFollowUps";
import {
  SignalsSection,
  SignalCardWithHandlers,
  type SignalCardHandlers,
} from "./SignalsSection";
import {
  SignalsBusyBanner,
  SignalsCaughtUp,
  SignalsEmpty,
  SignalsError,
  SignalsFilteredEmpty,
  SignalsLoading,
} from "./SignalsStates";
import { SignalsLocationControl } from "./SignalsLocationControl";
import { SignalsSettingsSheet } from "./SignalsSettingsSheet";
import { SignalsFilterBar } from "./SignalsFilterBar";
import { SignalsFilterDrawer } from "./SignalsFilterDrawer";
import { VIEW_ORDER } from "./SignalsViewSwitcher";
import { SignalsGridView } from "./SignalsGridView";
import { SignalsTableView } from "./SignalsTableView";
import { SignalsCompactView } from "./SignalsCompactView";
import { SignalsGalleryView } from "./SignalsGalleryView";

export function SignalsView() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getSignalsUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);

  const { prefs, ready, update, reset } = useSignalsPreferences();
  const memory = useSignalMemory();
  const followUps = useSignalFollowUps();
  const ctx = useLifeOsContext(prefs, memory.behavior);
  const enabled = ready && prefs.onboardingCompleted;
  const { data, refreshSources, regenerateTop3, refreshing, regenerating } = useSignalsPage(
    prefs,
    ctx,
    enabled,
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<SignalsFilterState>(DEFAULT_FILTER_STATE);
  const [detecting, setDetecting] = useState(false);
  const silentLocateRef = useRef(false);

  const { record } = memory;
  const { track: trackFollowUp, reconcile: reconcileFollowUps } = followUps;

  // Signal Memory read models for the Settings control surface (§17).
  const memorySummary = useMemo(
    () => summarizeMemory(memory.actions, prefs),
    [memory.actions, prefs],
  );
  const weeklyReflection = useMemo(
    () => computeWeeklyReflection(memory.actions),
    [memory.actions],
  );

  const setViewMode = useCallback(
    (viewMode: SignalsViewMode) => update({ viewMode }),
    [update],
  );

  // Follow-Up Tracker: count fresh, similar items against watched stories
  // whenever a new candidate pool arrives (source-grounded, never fabricated).
  useEffect(() => {
    if (data.status === "ok" && data.pool.length > 0) reconcileFollowUps(data.pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.generatedAt, data.status]);

  // Dashboard deep-link: /signals?focus=<id> scrolls to + briefly highlights it.
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  useEffect(() => {
    if (!focusId || data.status !== "ok") return;
    const el = document.querySelector<HTMLElement>(`[data-signal-id="${CSS.escape(focusId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("signal-focused");
    const timer = window.setTimeout(() => el.classList.remove("signal-focused"), 2400);
    return () => window.clearTimeout(timer);
  }, [focusId, data.status, data.generatedAt]);

  // Silent best-effort location (no prompt) once, if consented and not yet set.
  useEffect(() => {
    if (!enabled || !prefs.useLocation || prefs.localLocation || silentLocateRef.current) return;
    silentLocateRef.current = true;
    void resolveSignalsLocation().then((loc) => {
      if (loc) update({ localLocation: weatherLocationToLocalLocation(loc, "city") });
    });
  }, [enabled, prefs.useLocation, prefs.localLocation, update]);

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    try {
      const loc = await detectSignalsLocation();
      if (loc) {
        update({
          useLocation: true,
          localLocation: weatherLocationToLocalLocation(loc, "gps"),
        });
        toast.success(copy.toast.locationDetected(loc.displayLabel || loc.city));
      } else {
        toast.error(copy.toast.locationDenied);
      }
    } finally {
      setDetecting(false);
    }
  }, [copy, update]);

  const handlers: SignalCardHandlers = useMemo(
    () => ({
      savingId,
      savedIds,
      creatingTaskId,
      isTracked: followUps.isTracked,
      onSave: async (signal: SignalItem) => {
        if (savingId || savedIds.has(signal.id)) return;
        if (signal.isDemo) {
          toast.error(copy.toast.demoCannotSave);
          return;
        }
        setSavingId(signal.id);
        const result = await saveSignalToBrain(signal);
        if (result.status === "saved") {
          setSavedIds((prev) => new Set(prev).add(signal.id));
          record(signal, "save");
          toast.success(
            result.embedded ? copy.toast.savedToBrain : copy.toast.savedToBrainNoEmbed,
          );
        } else {
          toast.error(result.message || copy.toast.saveFailed);
        }
        setSavingId(null);
      },
      onDismiss: (signal: SignalItem) => {
        setDismissed((prev) => new Set(prev).add(signal.id));
        record(signal, "dismiss");
        toast(copy.toast.dismissed);
      },
      onMore: (signal: SignalItem) => {
        if (!prefs.followedTopics.includes(signal.topic)) {
          update({
            followedTopics: [...prefs.followedTopics, signal.topic],
            hiddenTopics: prefs.hiddenTopics.filter((t) => t !== signal.topic),
          });
        }
        record(signal, "more_like_this");
        toast(copy.toast.moreAck);
      },
      onLess: (signal: SignalItem) => {
        setDismissed((prev) => new Set(prev).add(signal.id));
        if (!prefs.hiddenTopics.includes(signal.topic)) {
          update({
            hiddenTopics: [...prefs.hiddenTopics, signal.topic],
            followedTopics: prefs.followedTopics.filter((t) => t !== signal.topic),
          });
        }
        record(signal, "less_like_this");
        toast(copy.toast.lessAck);
      },
      onOpen: (signal: SignalItem) => {
        record(signal, "open");
      },
      onMuteSource: (signal: SignalItem) => {
        const domain = signal.source.domain;
        if (domain && !prefs.mutedSources.includes(domain)) {
          update({ mutedSources: [...prefs.mutedSources, domain] });
        }
        setDismissed((prev) => new Set(prev).add(signal.id));
        record(signal, "mute_source");
        toast(copy.toast.sourceMuted);
      },
      onFollowTopic: (signal: SignalItem) => {
        if (!prefs.followedTopics.includes(signal.topic)) {
          update({ followedTopics: [...prefs.followedTopics, signal.topic] });
        }
        record(signal, "follow_topic");
        toast(copy.toast.topicFollowed);
      },
      onFeedback: (signal: SignalItem, kind: SignalActionKind) => {
        // "Less of this": hide the card now (perceptible) + log for learning.
        setDismissed((prev) => new Set(prev).add(signal.id));
        record(signal, kind);
        toast(copy.toast.feedbackAck);
      },
      onTrack: (signal: SignalItem) => {
        if (signal.isDemo) {
          toast.error(copy.toast.demoCannotSave);
          return;
        }
        trackFollowUp(signal);
        record(signal, "track");
        toast.success(copy.toast.tracked);
      },
      onCreateTask: async (signal: SignalItem) => {
        if (creatingTaskId) return;
        if (signal.isDemo) {
          toast.error(copy.toast.demoCannotSave);
          return;
        }
        setCreatingTaskId(signal.id);
        const result = await createTaskFromSignal(signal);
        if (result.status === "created") {
          record(signal, "to_task");
          toast.success(copy.toast.taskCreated);
        } else {
          toast.error(result.message || copy.toast.taskFailed);
        }
        setCreatingTaskId(null);
      },
    }),
    [
      savingId,
      savedIds,
      creatingTaskId,
      copy,
      prefs.followedTopics,
      prefs.hiddenTopics,
      prefs.mutedSources,
      update,
      record,
      trackFollowUp,
      followUps.isTracked,
    ],
  );

  // ── Render gates ──
  if (!ready) {
    return (
      <PageContainer>
        <SignalsLoading copy={copy} />
      </PageContainer>
    );
  }

  if (!prefs.onboardingCompleted) {
    return (
      <PageContainer>
        <SignalsOnboarding copy={copy} onComplete={(patch) => update(patch)} />
      </PageContainer>
    );
  }

  const notDismissed = (s: SignalItem) => !dismissed.has(s.id);
  const top3 = data.top3.filter(notDismissed);
  const world = data.world.filter(notDismissed);
  const local = data.local.filter(notDismissed);
  const personal = data.personal.filter(notDismissed);
  const markets = data.markets.filter(notDismissed);
  const video = data.video.filter(notDismissed);

  const filtered = applySignalFilters(data.pool, filter, {
    prefs,
    savedIds,
    dismissedIds: dismissed,
    selectedCity: prefs.localLocation?.city,
  });

  const filtersActive = !isDefaultFilter(filter);
  const viewMode = prefs.viewMode;
  const showSections = viewMode === "editorial" && !filtersActive;
  const sectionsTotal =
    top3.length + world.length + local.length + personal.length + markets.length + video.length;

  const updatedLabel = data.generatedAt
    ? copy.header.lastUpdated(format(parseISO(data.generatedAt), "HH:mm", { locale: dateLocale }))
    : null;
  const dateLabel = format(new Date(), "EEE, MMMM d", { locale: dateLocale });

  const clearFilters = () => setFilter(DEFAULT_FILTER_STATE);

  const renderPoolView = () => {
    if (filtered.length === 0) {
      return <SignalsFilteredEmpty copy={copy} onClear={clearFilters} />;
    }
    switch (viewMode) {
      case "table":
        return (
          <SignalsTableView items={filtered} copy={copy} dateLocale={dateLocale} handlers={handlers} />
        );
      case "compact":
        return (
          <SignalsCompactView items={filtered} copy={copy} dateLocale={dateLocale} handlers={handlers} />
        );
      case "gallery":
        return (
          <SignalsGalleryView
            items={filtered}
            gallery={prefs.gallery}
            copy={copy}
            dateLocale={dateLocale}
            handlers={handlers}
          />
        );
      case "grid":
      case "editorial":
      default:
        return (
          <SignalsGridView items={filtered} copy={copy} dateLocale={dateLocale} handlers={handlers} />
        );
    }
  };

  return (
    <PageContainer>
      <SignalsPageHeader
        copy={copy}
        dateLabel={dateLabel}
        updatedLabel={updatedLabel}
        dataSource={data.dataSource}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={refreshSources}
        onRegenerate={regenerateTop3}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenFilters={() => setFilterOpen(true)}
        refreshing={refreshing}
        regenerating={regenerating}
        canRegenerate={data.status === "ok"}
        canOpenFilters={data.status === "ok"}
        filtersActive={filtersActive}
      />

      {/* Filter bar (hidden until data is present) */}
      {data.status === "ok" && (
        <SignalsFilterBar
          filter={filter}
          onChange={setFilter}
          onClear={clearFilters}
          onOpenDrawer={() => setFilterOpen(true)}
          copy={copy}
        />
      )}

      {/* Busy banners for the two refresh actions */}
      {refreshing && <SignalsBusyBanner label={copy.states.refreshingTitle} />}
      {regenerating && <SignalsBusyBanner label={copy.states.regeneratingTitle} />}

      {/* Body */}
      {data.status === "loading" && <SignalsLoading copy={copy} />}
      {data.status === "error" && <SignalsError copy={copy} onRetry={refreshSources} />}

      {data.status === "ok" && (
        <>
          {data.dataSource !== "live" && (
            <GlassPanel variant="strong" className="px-4 py-2.5 text-xs text-muted-foreground">
              {copy.states.demoBanner}
            </GlassPanel>
          )}

          {showSections ? (
            sectionsTotal === 0 ? (
              <SignalsEmpty copy={copy} onRetry={refreshSources} />
            ) : (
              <div className="space-y-8">
                {top3.length > 0 && (
                  <section aria-label={copy.sections.top3Title} className="space-y-3">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">
                        {copy.sections.top3Title}
                      </h2>
                      <p className="text-xs text-muted-foreground">{copy.sections.top3Subtitle}</p>
                    </div>
                    <HeroBlock
                      items={top3}
                      copy={copy}
                      dateLocale={dateLocale}
                      handlers={handlers}
                    />
                  </section>
                )}

                <div className="grid gap-5 xl:grid-cols-3">
                  {world.length > 0 && (
                    <SignalsSection
                      title={copy.sections.worldTitle}
                      subtitle={copy.sections.worldSubtitle}
                      items={world}
                      copy={copy}
                      dateLocale={dateLocale}
                      variant="preview"
                      layout="stack"
                      handlers={handlers}
                      initialCount={2}
                    />
                  )}

                  <SignalsSection
                    title={
                      data.location
                        ? copy.sections.localCity(data.location.displayLabel || data.location.city)
                        : copy.sections.localTitle
                    }
                    subtitle={copy.sections.localSubtitle}
                    items={local}
                    copy={copy}
                    dateLocale={dateLocale}
                    variant="preview"
                    layout="stack"
                    handlers={handlers}
                    initialCount={2}
                    headerRight={
                      <SignalsLocationControl
                        copy={copy}
                        location={data.location}
                        detecting={detecting}
                        onDetect={handleDetect}
                        onPick={(loc) =>
                          update({ localLocation: weatherLocationToLocalLocation(loc, "manual") })
                        }
                      />
                    }
                    note={
                      local.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {data.location
                            ? copy.sections.localPrecisionNote
                            : copy.sections.localNoLocation}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          {copy.sections.localPrecisionNote}
                        </p>
                      )
                    }
                  />

                  <SignalsSection
                    title={copy.sections.personalTitle}
                    subtitle={copy.sections.personalSubtitle}
                    items={personal}
                    copy={copy}
                    dateLocale={dateLocale}
                    variant="preview"
                    layout="stack"
                    handlers={handlers}
                    initialCount={2}
                    note={
                      personal.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {copy.sections.personalEmpty}
                        </p>
                      ) : null
                    }
                  />
                </div>

                {(markets.length > 0 || video.length > 0) && (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {markets.length > 0 && (
                      <SignalsSection
                        title={copy.markets.title}
                        subtitle={copy.markets.subtitle}
                        items={markets}
                        copy={copy}
                        dateLocale={dateLocale}
                        variant="preview"
                        layout="stack"
                        handlers={handlers}
                        initialCount={2}
                        note={
                          <p className="text-[11px] text-muted-foreground">
                            {copy.markets.disclaimer}
                          </p>
                        }
                      />
                    )}

                    {video.length > 0 && (
                      <SignalsSection
                        title={copy.video.title}
                        subtitle={copy.video.subtitle}
                        items={video}
                        copy={copy}
                        dateLocale={dateLocale}
                        variant="preview"
                        layout="stack"
                        handlers={handlers}
                        initialCount={2}
                      />
                    )}
                  </div>
                )}

                <SignalsFollowUps
                  followUps={followUps.followUps}
                  copy={copy}
                  dateLocale={dateLocale}
                  onSetStatus={followUps.setStatus}
                  onRemove={followUps.remove}
                  onOpen={(id) => {
                    const item = data.pool.find((s) => s.id === id);
                    if (item) record(item, "open");
                  }}
                />

                <SignalsCaughtUp copy={copy} />
              </div>
            )
          ) : (
            renderPoolView()
          )}
        </>
      )}

      <SignalsFilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        prefs={prefs}
        copy={copy}
      />

      <SignalsSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        copy={copy}
        prefs={prefs}
        update={update}
        reset={reset}
        memory={memorySummary}
        reflection={weeklyReflection}
        onClearHistory={memory.clearHistory}
      />
    </PageContainer>
  );
}

function SignalsPageHeader({
  copy,
  dateLabel,
  updatedLabel,
  dataSource,
  viewMode,
  onViewModeChange,
  onRefresh,
  onRegenerate,
  onOpenSettings,
  onOpenFilters,
  refreshing,
  regenerating,
  canRegenerate,
  canOpenFilters,
  filtersActive,
}: {
  copy: ReturnType<typeof getSignalsUiCopy>;
  dateLabel: string;
  updatedLabel: string | null;
  dataSource: "live" | "demo" | "mixed";
  viewMode: SignalsViewMode;
  onViewModeChange: (mode: SignalsViewMode) => void;
  onRefresh: () => void;
  onRegenerate: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
  refreshing: boolean;
  regenerating: boolean;
  canRegenerate: boolean;
  canOpenFilters: boolean;
  filtersActive: boolean;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radar className="h-7 w-7 sm:h-6 sm:w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {copy.pageTitle}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {copy.pageSubtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <OSControl
            osSize="compact"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={copy.header.refreshSources}
            title={copy.header.refreshSources}
            className="hidden sm:inline-flex"
          >
            <RotateCw className={cn(refreshing && "animate-spin")} />
            <span>{refreshing ? copy.header.refreshing : copy.header.refresh}</span>
          </OSControl>
          <SignalsHeaderMenu
            copy={copy}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onRefresh={onRefresh}
            onRegenerate={onRegenerate}
            onOpenSettings={onOpenSettings}
            onOpenFilters={onOpenFilters}
            refreshing={refreshing}
            regenerating={regenerating}
            canRegenerate={canRegenerate}
            canOpenFilters={canOpenFilters}
            filtersActive={filtersActive}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:text-xs">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
          {dateLabel}
        </span>
        {updatedLabel && (
          <>
            <span aria-hidden className="opacity-50">·</span>
            <span>{updatedLabel}</span>
          </>
        )}
        <span
          className={cn(
            "ml-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            dataSource === "live"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border/60 bg-muted/40 text-muted-foreground",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              dataSource === "live" ? "bg-emerald-400" : "bg-muted-foreground/60",
            )}
          />
          {dataSource === "live" ? copy.header.liveBadge : copy.header.demoBadge}
        </span>
      </div>
    </header>
  );
}

function SignalsHeaderMenu({
  copy,
  viewMode,
  onViewModeChange,
  onRefresh,
  onRegenerate,
  onOpenSettings,
  onOpenFilters,
  refreshing,
  regenerating,
  canRegenerate,
  canOpenFilters,
  filtersActive,
}: {
  copy: ReturnType<typeof getSignalsUiCopy>;
  viewMode: SignalsViewMode;
  onViewModeChange: (mode: SignalsViewMode) => void;
  onRefresh: () => void;
  onRegenerate: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
  refreshing: boolean;
  regenerating: boolean;
  canRegenerate: boolean;
  canOpenFilters: boolean;
  filtersActive: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <OSControl osSize="compact" aria-label={copy.filters.more} title={copy.filters.more}>
            <MoreHorizontal />
            <span className="hidden sm:inline">{copy.filters.more}</span>
          </OSControl>
        }
      />
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuItem className="sm:hidden" onClick={onRefresh} disabled={refreshing}>
          <RotateCw className={cn(refreshing && "animate-spin")} />
          {refreshing ? copy.header.refreshing : copy.header.refreshSources}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onRegenerate}
          disabled={regenerating || !canRegenerate}
        >
          <Wand2 className={cn(regenerating && "animate-pulse")} />
          {copy.header.regenerateTop3}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenFilters} disabled={!canOpenFilters}>
          <SlidersHorizontal />
          {copy.header.filters}
          {filtersActive && (
            <span className="ml-auto size-1.5 rounded-full bg-lime-300" aria-hidden />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenSettings}>
          <Settings2 />
          {copy.header.settings}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{copy.header.view}</DropdownMenuLabel>
          {VIEW_ORDER.map((mode) => (
            <DropdownMenuItem key={mode} onClick={() => onViewModeChange(mode)}>
              <Check
                className={cn("size-4", viewMode === mode ? "opacity-100" : "opacity-0")}
              />
              {copy.views.modes[mode]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Daily Top 3 editorial layout: ranked lead + two compact secondaries. */
function HeroBlock({
  items,
  copy,
  dateLocale,
  handlers,
}: {
  items: SignalItem[];
  copy: ReturnType<typeof getSignalsUiCopy>;
  dateLocale: ReturnType<typeof getDateFnsLocale>;
  handlers: SignalCardHandlers;
}) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  return (
    <div
      data-stagger
      className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]"
    >
      <div className="min-w-0">
        <SignalCardWithHandlers
          signal={lead}
          copy={copy}
          dateLocale={dateLocale}
          variant="topLead"
          rank={1}
          handlers={handlers}
        />
      </div>
      {rest.length > 0 && (
        <div className="grid min-w-0 gap-3">
          {rest.slice(0, 2).map((signal, index) => (
            <SignalCardWithHandlers
              key={signal.id}
              signal={signal}
              copy={copy}
              dateLocale={dateLocale}
              variant="ranked"
              rank={index + 2}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:pb-24 xl:pr-20 2xl:pr-0">
      {children}
    </div>
  );
}
