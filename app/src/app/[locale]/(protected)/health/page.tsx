"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { HealthHero } from "@/components/health/HealthHero";
import { PillarCard } from "@/components/health/PillarCard";
import { PillarLogModal } from "@/components/health/PillarLogModal";
import { VitalsGrid } from "@/components/health/VitalsGrid";
import { HydrationStrip } from "@/components/health/HydrationStrip";
import { TrendsSection } from "@/components/health/TrendsSection";
import { CorrelationsPanel } from "@/components/health/CorrelationsPanel";
import { WeeklyReport } from "@/components/health/WeeklyReport";
import { HealthGoalsPanel } from "@/components/health/HealthGoalsPanel";
import { AppleHealthSyncBanner } from "@/components/health/AppleHealthSyncBanner";
import {
  useHealthDailyLog,
  useHealthDailyLogsRange,
  useHealthMetricsRange,
  useLatestHealthMetric,
} from "@/hooks/use-health-v2";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import {
  highStressStreak,
  pillarDelta,
  pillarValue,
  type PillarKey,
} from "@/lib/health/pillarUtils";
import { bucketByDay } from "@/lib/health/metricsDerived";

export default function HealthPage() {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language), [language]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [focusPillar, setFocusPillar] = useState<PillarKey>("sleep");
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(false);

  const dateKey = useMemo(() => toLocalDate(selectedDate), [selectedDate]);
  const isToday = useMemo(() => dateKey === toLocalDate(new Date()), [dateKey]);

  const todayISO = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toISOString();
  }, [selectedDate]);

  // 14 day range for pillar trends + baselines
  const range14 = useMemo(() => {
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    return {
      fromDate: toLocalDate(start),
      toDate: toLocalDate(end),
      fromISO: start.toISOString(),
      toISO: end.toISOString(),
    };
  }, [selectedDate]);

  const dailyLog = useHealthDailyLog(dateKey);
  const logs14 = useHealthDailyLogsRange(range14.fromDate, range14.toDate);

  // Baseline metrics for readiness
  const sleepRange = useHealthMetricsRange("sleep_duration", range14.fromISO, range14.toISO);
  const hrvRange = useHealthMetricsRange("hrv", range14.fromISO, range14.toISO);
  const rhrRange = useHealthMetricsRange("rhr", range14.fromISO, range14.toISO);

  const latestSleep = useLatestHealthMetric("sleep_duration");
  const latestHrv = useLatestHealthMetric("hrv");
  const latestRhr = useLatestHealthMetric("rhr");
  const latestSteps = useLatestHealthMetric("steps");

  const baselines = useMemo(() => {
    const sleepBuckets = bucketByDay(sleepRange.data ?? []);
    const hrvBuckets = bucketByDay(hrvRange.data ?? []);
    const rhrBuckets = bucketByDay(rhrRange.data ?? []);
    return {
      sleepDurationHours: averageExceptLast(sleepBuckets.map((b) => b.value)),
      hrv: averageExceptLast(hrvBuckets.map((b) => b.value)),
      rhr: averageExceptLast(rhrBuckets.map((b) => b.value)),
    };
  }, [sleepRange.data, hrvRange.data, rhrRange.data]);

  const latestSleepValue = latestSleep.data?.value ?? null;
  const hrvValue = latestHrv.data?.value ?? null;
  const stressStreak = useMemo(() => highStressStreak(logs14.data ?? []), [logs14.data]);

  function openModal(pillar: PillarKey) {
    setFocusPillar(pillar);
    setModalOpen(true);
  }

  function pillarTrend(pillar: PillarKey): number[] {
    const logs = logs14.data ?? [];
    return fillPillarTrend(logs, pillar, 14, dateKey);
  }

  function supportingValue(pillar: PillarKey): { label?: string; value?: string } {
    if (pillar === "sleep") {
      if (latestSleepValue === null) return {};
      return { label: ui.pillars.sleep.duration, value: `${latestSleepValue.toFixed(1)}h` };
    }
    if (pillar === "energy") {
      if (hrvValue === null || baselines.hrv === null) return {};
      const pct = baselines.hrv > 0 ? ((hrvValue - baselines.hrv) / baselines.hrv) * 100 : 0;
      const signed = `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
      return { label: "HRV", value: `${signed} ${ui.pillars.energy.hrvSuffix}` };
    }
    if (pillar === "stress") {
      if (stressStreak === 0) return {};
      return { label: "", value: ui.pillars.stress.streak(stressStreak) };
    }
    return {};
  }

  const pillarsConfig: Array<{ key: PillarKey; label: string }> = [
    { key: "sleep", label: ui.pillars.sleep.label },
    { key: "energy", label: ui.pillars.energy.label },
    { key: "mood", label: ui.pillars.mood.label },
    { key: "stress", label: ui.pillars.stress.label },
  ];

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
      actions={
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={ui.previousDay}
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {isToday ? new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : dateKey}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={ui.nextDay}
            disabled={isToday}
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {!syncBannerDismissed && (
        <AppleHealthSyncBanner onDismiss={() => setSyncBannerDismissed(true)} />
      )}

      <HealthHero
        today={dailyLog.data ?? null}
        baseline14d={baselines}
        latestMetrics={{
          sleep_duration: latestSleep.data ?? null,
          hrv: latestHrv.data ?? null,
          rhr: latestRhr.data ?? null,
          steps: latestSteps.data ?? null,
        }}
      />

      <section aria-label="Pillars" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillarsConfig.map(({ key, label }) => {
          const support = supportingValue(key);
          return (
            <PillarCard
              key={key}
              pillar={key}
              label={label}
              value={pillarValue(dailyLog.data ?? null, key)}
              delta={pillarDelta(dailyLog.data ?? null, logs14.data ?? [], key)}
              trend={pillarTrend(key)}
              supportingLabel={support.label}
              supportingValue={support.value}
              tapToLog={ui.pillars[key === "mood" ? "mood" : key].label}
              deltaLabel={ui.pillars.deltaVsAverage}
              logNow={ui.pillars.logNow}
              onClick={() => openModal(key)}
            />
          );
        })}
      </section>

      <VitalsGrid
        todayISO={todayISO}
        rangeStartISO={range14.fromISO}
        rangeEndISO={range14.toISO}
      />

      <HydrationStrip todayISO={todayISO} />

      <TrendsSection />

      <WeeklyReport todayISO={todayISO} />

      <CorrelationsPanel fromDate={range14.fromDate} toDate={range14.toDate} />

      <HealthGoalsPanel />

      <div className="pt-4 text-center text-xs text-muted-foreground">
        <p>{ui.notMedicalAdvice}</p>
      </div>

      <PillarLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        logDate={dateKey}
        initialPillar={focusPillar}
        existing={dailyLog.data ?? null}
      />
    </PageShell>
  );
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function averageExceptLast(values: number[]): number | null {
  if (values.length < 2) return null;
  const slice = values.slice(0, -1);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function fillPillarTrend(
  logs: { log_date: string; sleep_quality: number | null; energy_level: number | null; mood_valence: number | null; stress_level: number | null }[],
  pillar: PillarKey,
  days: number,
  todayKey: string,
): number[] {
  const map = new Map<string, number | null>();
  logs.forEach((l) => {
    switch (pillar) {
      case "sleep":
        map.set(l.log_date, l.sleep_quality);
        break;
      case "energy":
        map.set(l.log_date, l.energy_level);
        break;
      case "mood":
        map.set(l.log_date, l.mood_valence);
        break;
      case "stress":
        map.set(l.log_date, l.stress_level);
        break;
    }
  });
  const out: number[] = [];
  const today = new Date(todayKey + "T00:00:00");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDate(d);
    const v = map.get(key);
    out.push(v ?? NaN);
  }
  return out;
}
