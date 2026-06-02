"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Radar, RotateCw, Settings2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import { GlassPanel } from "@/components/ui/glass-panel";
import { OSActionRow, OSControl, OSIconControl } from "@/components/ui/os-primitives";
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
import { SignalsViewSwitcher } from "./SignalsViewSwitcher";
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
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {copy.pageTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{copy.pageSubtitle}</p>
            </div>
          </div>

          <OSActionRow className="sm:justify-start">
            <SignalsViewSwitcher value={viewMode} onChange={setViewMode} copy={copy} />
            <OSControl
              osSize="compact"
              onClick={regenerateTop3}
              disabled={regenerating || data.status !== "ok"}
              aria-label={copy.header.regenerateTop3}
              title={copy.header.regenerateTop3}
            >
              <Wand2 className={cn(regenerating && "animate-pulse")} />
              <span className="hidden md:inline">{copy.header.regenerateTop3}</span>
            </OSControl>
            <OSControl
              osSize="compact"
              onClick={refreshSources}
              disabled={refreshing}
              aria-label={copy.header.refreshSources}
              title={copy.header.refreshSources}
            >
              <RotateCw className={cn(refreshing && "animate-spin")} />
              <span className="hidden md:inline">
                {refreshing ? copy.header.refreshing : copy.header.refreshSources}
              </span>
            </OSControl>
            <OSIconControl
              osSize="compact"
              onClick={() => setSettingsOpen(true)}
              aria-label={copy.header.settings}
            >
              <Settings2 />
            </OSIconControl>
          </OSActionRow>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{format(new Date(), "EEEE, MMMM d", { locale: dateLocale })}</span>
          {updatedLabel && (
            <>
              <span aria-hidden className="opacity-50">·</span>
              <span>{updatedLabel}</span>
            </>
          )}
          <span aria-hidden className="opacity-50">·</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              data.dataSource === "live"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            {data.dataSource === "live" ? copy.header.liveBadge : copy.header.demoBadge}
          </span>
        </div>
      </header>

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

                {world.length > 0 && (
                  <SignalsSection
                    title={copy.sections.worldTitle}
                    subtitle={copy.sections.worldSubtitle}
                    items={world}
                    copy={copy}
                    dateLocale={dateLocale}
                    handlers={handlers}
                    initialCount={4}
                  />
                )}

                {markets.length > 0 && (
                  <SignalsSection
                    title={copy.markets.title}
                    subtitle={copy.markets.subtitle}
                    items={markets}
                    copy={copy}
                    dateLocale={dateLocale}
                    variant="feature"
                    layout="carousel"
                    handlers={handlers}
                    note={
                      <p className="text-[11px] text-muted-foreground">{copy.markets.disclaimer}</p>
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
                    variant="feature"
                    layout="carousel"
                    handlers={handlers}
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
                  handlers={handlers}
                  initialCount={4}
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
                  handlers={handlers}
                  initialCount={4}
                  note={
                    personal.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {copy.sections.personalEmpty}
                      </p>
                    ) : null
                  }
                />

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

/** Daily Top 3 editorial hero: one large feature + two smaller. */
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
    <div data-stagger className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SignalCardWithHandlers
          signal={lead}
          copy={copy}
          dateLocale={dateLocale}
          variant="hero"
          handlers={handlers}
        />
      </div>
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {rest.slice(0, 2).map((signal) => (
            <SignalCardWithHandlers
              key={signal.id}
              signal={signal}
              copy={copy}
              dateLocale={dateLocale}
              variant="feature"
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl space-y-6 pb-24">{children}</div>;
}
