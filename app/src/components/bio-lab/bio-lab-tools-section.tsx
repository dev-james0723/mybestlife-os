"use client";

import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { BioLabHistorySheet } from "@/components/bio-lab/bio-lab-history-sheet";
import { BioLabToolSheet } from "@/components/bio-lab/bio-lab-tool-sheet";
import { RecentActivityStrip } from "@/components/bio-lab/recent-activity-strip";
import { WeeklyInsightCard } from "@/components/bio-lab/weekly-insight-card";
import { BIO_LAB_TOOLS } from "@/lib/bio-lab/tools-metadata";
import { getBioLabToolsUiCopy } from "@/lib/i18n/bio-lab-tools-ui";
import { getBioLabHistoryCopy } from "@/lib/i18n/bio-lab-history-ui";
import { getBioLabWeeklyInsightCopy } from "@/lib/i18n/bio-lab-weekly-insight-ui";
import { useWeeklyInsight } from "@/hooks/use-weekly-insight";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";
import { typography } from "@/lib/constants/design-tokens";
import { BioLabToolCard } from "@/components/bio-lab/bio-lab-tool-card";
import { cn } from "@/lib/utils";
import {
  useBioLabFocusSprints,
  useBioLabMindSweeps,
  useBioLabStateScans,
  useBioLabSystemResets,
} from "@/hooks/use-bio-lab-history";
import {
  buildToolSparkline,
  formatLastUsedLabel,
  summariseBioLabHistory,
} from "@/lib/bio-lab/history-summary";
import { computeHubSuggestion } from "@/lib/bio-lab/hub-suggestion-rules";
import { getBioLabVisualTokens } from "@/lib/bio-lab/visual-tokens";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";

export function BioLabToolsSection() {
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();
  const copy = getBioLabToolsUiCopy(language);
  const historyCopy = getBioLabHistoryCopy(language);
  const weeklyCopy = getBioLabWeeklyInsightCopy(language);
  const openTool = useBioLabStore((s) => s.openTool);
  const tools = BIO_LAB_TOOLS;
  const eyebrow = copy.sectionEyebrowByTheme[uiTheme];

  // ============================================================
  // History data — drives both the activity strip and the per-card
  // "last used" pill. One round trip per tool, cached by React Query
  // (see use-bio-lab-history.ts). The dedicated history sheet reads
  // from the same query cache, so opening it does not refetch.
  // ============================================================
  const stateScansQuery = useBioLabStateScans();
  const mindSweepsQuery = useBioLabMindSweeps();
  const focusSprintsQuery = useBioLabFocusSprints();
  const systemResetsQuery = useBioLabSystemResets();

  const isHistoryLoading =
    stateScansQuery.isLoading ||
    mindSweepsQuery.isLoading ||
    focusSprintsQuery.isLoading ||
    systemResetsQuery.isLoading;

  const summary = useMemo(
    () =>
      summariseBioLabHistory({
        stateScans: stateScansQuery.data ?? [],
        mindSweeps: mindSweepsQuery.data ?? [],
        focusSprints: focusSprintsQuery.data ?? [],
        systemResets: systemResetsQuery.data ?? [],
        windowDays: 7,
      }),
    [
      stateScansQuery.data,
      mindSweepsQuery.data,
      focusSprintsQuery.data,
      systemResetsQuery.data,
    ],
  );

  const [historyOpen, setHistoryOpen] = useState(false);

  // Hub-level "what next?" nudge — derived from the freshest timeline entry
  // (and whether it crosses one of the rule thresholds). Quiet by design:
  // returns null in the boring middle of the distribution.
  const suggestion = useMemo(
    () =>
      computeHubSuggestion({
        mostRecent: summary.unifiedTimeline[0] ?? null,
      }),
    [summary.unifiedTimeline],
  );

  // ============================================================
  // Weekly insight (LLM-rolled, Sunday-only auto-fetch).
  // We only auto-fetch when the user has any recent activity at all —
  // there's nothing to reflect on for an empty week and the route would
  // short-circuit anyway, so we save the round trip.
  // ============================================================
  const weekly = useWeeklyInsight({
    enabled: summary.hasAnyHistory,
    sundayOnly: true,
  });
  // Off-Sunday, we still surface a calm CTA card *if* the user has been
  // active — clicking "Reflect" calls refresh() which bypasses the Sunday
  // gate (it's a forced refresh, not the auto-fetch).
  const showIdleCta =
    !weekly.isSunday && summary.hasAnyHistory && weekly.data === undefined;

  // Per-tool 7-day sparkline cells. We only show sparklines once history has
  // loaded *and* something exists, so a brand-new user sees a clean card.
  const sparklinesByTool = useMemo<Record<BioLabToolId, ReturnType<typeof buildToolSparkline> | null>>(() => {
    if (!summary.hasAnyHistory) {
      return {
        "state-scan": null,
        "mind-sweep": null,
        "focus-sprint": null,
        "system-reset": null,
      };
    }
    return {
      "state-scan": buildToolSparkline(stateScansQuery.data ?? []),
      "mind-sweep": buildToolSparkline(mindSweepsQuery.data ?? []),
      "focus-sprint": buildToolSparkline(focusSprintsQuery.data ?? []),
      "system-reset": buildToolSparkline(systemResetsQuery.data ?? []),
    };
  }, [
    summary.hasAnyHistory,
    stateScansQuery.data,
    mindSweepsQuery.data,
    focusSprintsQuery.data,
    systemResetsQuery.data,
  ]);

  if (tools.length === 0) {
    return (
      <>
      <section
        className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8"
        aria-labelledby="bio-lab-tools-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.06] via-transparent to-muted/30"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border/60">
            <FlaskConical className="size-7 stroke-[1.5]" aria-hidden />
          </span>
          <h2
            id="bio-lab-tools-heading"
            className={cn(typography.heading, "text-foreground")}
          >
            {copy.emptyStateTitle}
          </h2>
          <p className={cn(typography.body, "max-w-md text-muted-foreground")}>
            {copy.emptyStateDescription}
          </p>
        </div>
      </section>
      <BioLabToolSheet />
      </>
    );
  }

  return (
    <>
    <section
      className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-6"
      aria-labelledby="bio-lab-tools-heading"
      role="region"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.07] via-transparent to-muted/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent"
        aria-hidden
      />

      <div className="relative space-y-5 sm:space-y-6">
        <header className="space-y-3 sm:space-y-3.5">
          <p
            className={cn(
              "text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
            )}
          >
            {eyebrow}
          </p>
          <div className="h-px w-10 rounded-full bg-primary/35" aria-hidden />
          <h2
            id="bio-lab-tools-heading"
            className={cn(
              "text-balance text-lg font-semibold tracking-tight sm:text-xl",
              typography.heading,
            )}
          >
            {copy.sectionTitle}
          </h2>
          <p className={cn(typography.body, "max-w-prose text-pretty text-muted-foreground")}>
            {copy.sectionLead}
          </p>
          <p className={cn(typography.caption, "max-w-prose text-pretty text-muted-foreground/90")}>
            {copy.futureSlotHint}
          </p>
        </header>

        <RecentActivityStrip
          summary={summary}
          copy={historyCopy}
          isLoading={isHistoryLoading && !summary.hasAnyHistory}
          onOpenHistory={() => setHistoryOpen(true)}
          suggestion={suggestion}
          onAcceptSuggestion={
            suggestion ? () => openTool(suggestion.toolId) : undefined
          }
          uiTheme={uiTheme}
          suggestionToolTitle={
            suggestion ? copy.toolTitles[suggestion.toolId] : undefined
          }
        />

        <WeeklyInsightCard
          copy={weeklyCopy}
          data={weekly.data}
          isLoading={weekly.isLoading}
          isRefreshing={weekly.isRefreshing}
          error={weekly.error}
          onReflect={() => weekly.refresh()}
          showIdleCta={showIdleCta}
        />

        <ul className="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2 sm:gap-4">
          {tools.map((tool) => {
            const surface = tool.themeSurfaces[uiTheme];
            const lastUsedLabel = formatLastUsedLabel(
              summary.lastUsedByTool[tool.id],
              {
                today: historyCopy.toolBadge.today,
                yesterday: historyCopy.toolBadge.yesterday,
                daysAgo: historyCopy.toolBadge.daysAgo,
                longAgo: historyCopy.toolBadge.longAgo,
              },
            );
            const sparklineCells = sparklinesByTool[tool.id];
            const visualTokens = getBioLabVisualTokens(tool.id, uiTheme);
            const sparklineSessionCount =
              sparklineCells?.reduce((acc, cell) => acc + cell.count, 0) ?? 0;
            const sparklineAriaLabel = sparklineCells
              ? sparklineSessionCount === 0
                ? historyCopy.sparkline.emptyAria
                : historyCopy.sparkline.summaryAria(sparklineSessionCount)
              : undefined;
            return (
              <li key={tool.id} className="p-0">
                <BioLabToolCard
                  toolId={tool.id}
                  title={copy.toolTitles[tool.id]}
                  subtitle={surface.subtitle}
                  icon={tool.icon}
                  onOpen={() => openTool(tool.id)}
                  lastUsedLabel={lastUsedLabel}
                  lastUsedAriaLabel={
                    lastUsedLabel
                      ? historyCopy.toolBadge.ariaLabel(lastUsedLabel)
                      : undefined
                  }
                  sparklineCells={sparklineCells ?? undefined}
                  sparklineAriaLabel={sparklineAriaLabel}
                  sparklineAccentClassName={visualTokens.iconForeground}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
    <BioLabToolSheet />
    <BioLabHistorySheet
      open={historyOpen}
      onOpenChange={setHistoryOpen}
      entries={summary.unifiedTimeline}
      copy={historyCopy}
      uiTheme={uiTheme}
    />
    </>
  );
}
