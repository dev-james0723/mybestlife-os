"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Crosshair,
  Edit3,
  Home,
  Info,
  NotebookPen,
  Plus,
  Rocket,
  Settings,
  Sprout,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveGarden, useGardenTodayLog } from "@/hooks/use-garden";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useTodayContext } from "@/hooks/use-today-context";
import { useWeather } from "@/hooks/use-weather";
import { WeatherLottie } from "@/components/weather/WeatherLottie";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import { resolveWeatherAnimationKey } from "@/lib/weather/lottie-animation";
import {
  OS_BUDDY_RESTING_SPACE_DROPZONE_ID,
  type OSBuddyRestingState,
} from "@/lib/os-buddy/os-buddy-resting-space";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useIdeaCaptureStore } from "@/stores/ideaCaptureStore";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import type { CalendarItem } from "@/lib/calendar/types";
import type { AppLocale } from "@/lib/i18n/app-locale";

type QuickLaunchId =
  | "daily-planner"
  | "tasks"
  | "brain"
  | "calendar"
  | "goals"
  | "journal"
  | "knowledge"
  | "relationships"
  | "career"
  | "projects"
  | "garden";

type QuickLaunchOption = {
  id: QuickLaunchId;
  href: string;
  label: string;
  zhLabel: string;
  icon: LucideIcon;
};

type TodayMetricId =
  | "focus"
  | "next"
  | "garden"
  | "task-count"
  | "career"
  | "health"
  | "bucket-list"
  | "journal";

type TodayMetricOption = {
  id: TodayMetricId;
  label: string;
  zhLabel: string;
  icon: LucideIcon;
  tone: "default" | "green" | "blue" | "amber";
};

const QUICK_LAUNCH_STORAGE_KEY = "mblos:sidebar-quick-launch";
const QUICK_LAUNCH_VISITS_KEY = "mblos:sidebar-route-visits";
const TODAY_PANEL_STORAGE_KEY = "mblos:sidebar-today-metrics";
const DEFAULT_QUICK_LAUNCH: QuickLaunchId[] = ["daily-planner", "tasks", "brain"];
const DEFAULT_TODAY_METRICS: TodayMetricId[] = ["focus", "next", "garden"];
const RESTING_ROOM_BACKGROUND = "/assets/os-buddy/resting-space/resting-room-pixel.png";

const QUICK_LAUNCH_OPTIONS: QuickLaunchOption[] = [
  { id: "daily-planner", href: "/daily-planner", label: "Planner", zhLabel: "Planner", icon: CalendarDays },
  { id: "tasks", href: "/tasks", label: "Tasks", zhLabel: "Tasks", icon: CheckSquare },
  { id: "brain", href: "/brain", label: "Brain", zhLabel: "Brain", icon: Brain },
  { id: "calendar", href: "/calendar", label: "Calendar", zhLabel: "Calendar", icon: CalendarDays },
  { id: "goals", href: "/goals", label: "Goals", zhLabel: "Goals", icon: Target },
  { id: "journal", href: "/journal", label: "Journal", zhLabel: "Journal", icon: NotebookPen },
  { id: "knowledge", href: "/knowledge-base", label: "Knowledge", zhLabel: "Knowledge", icon: BookOpen },
  { id: "relationships", href: "/relationships", label: "People", zhLabel: "People", icon: Users },
  { id: "career", href: "/career", label: "Career", zhLabel: "Career", icon: BriefcaseBusiness },
  { id: "projects", href: "/projects", label: "Projects", zhLabel: "Projects", icon: Rocket },
  { id: "garden", href: "/garden", label: "Garden", zhLabel: "Garden", icon: Sprout },
];

const TODAY_METRIC_OPTIONS: TodayMetricOption[] = [
  { id: "focus", label: "Focus", zhLabel: "Focus", icon: Crosshair, tone: "green" },
  { id: "next", label: "Next", zhLabel: "Next", icon: CalendarDays, tone: "blue" },
  { id: "garden", label: "Garden", zhLabel: "Garden", icon: Sprout, tone: "green" },
  { id: "task-count", label: "Tasks", zhLabel: "Tasks", icon: ClipboardList, tone: "default" },
  { id: "career", label: "Career", zhLabel: "Career", icon: BriefcaseBusiness, tone: "blue" },
  { id: "health", label: "Health", zhLabel: "Health", icon: Activity, tone: "green" },
  { id: "bucket-list", label: "Bucket", zhLabel: "Bucket", icon: Target, tone: "amber" },
  { id: "journal", label: "Journal", zhLabel: "Journal", icon: NotebookPen, tone: "default" },
];

function isZh(locale: AppLocale) {
  return locale === "zh-TW" || locale === "zh-CN";
}

function intlLocale(locale: AppLocale) {
  if (locale === "zh-TW") return "zh-HK";
  if (locale === "zh-CN") return "zh-CN";
  if (locale === "ja") return "ja-JP";
  if (locale === "ko") return "ko-KR";
  if (locale === "fr") return "fr-FR";
  if (locale === "it") return "it-IT";
  if (locale === "es") return "es-ES";
  if (locale === "vi") return "vi-VN";
  return "en-US";
}

function formatTodayPanelDate(locale: AppLocale, date: Date) {
  const intl = intlLocale(locale);
  const weekday = new Intl.DateTimeFormat(intl, { weekday: "short" }).format(date);
  const monthDay = new Intl.DateTimeFormat(intl, {
    month: "short",
    day: "numeric",
  }).format(date);
  return locale === "en" ? `${weekday}, ${monthDay}` : `${monthDay} ${weekday}`;
}

function useClientTodayDate() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    const scheduleNextTick = () => {
      const now = new Date();
      setDate(now);
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const delay = Math.max(60_000, nextMidnight.getTime() - now.getTime() + 1_000);
      timer = window.setTimeout(scheduleNextTick, delay);
    };

    scheduleNextTick();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return date;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local quick-launch preferences are a convenience.
  }
}

function optionById(id: QuickLaunchId) {
  return QUICK_LAUNCH_OPTIONS.find((option) => option.id === id);
}

function metricById(id: TodayMetricId) {
  return TODAY_METRIC_OPTIONS.find((option) => option.id === id);
}

function sanitizeShortcutIds(value: unknown): QuickLaunchId[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((id): id is QuickLaunchId =>
    QUICK_LAUNCH_OPTIONS.some((option) => option.id === id),
  );
  const unique = ids.filter((id, index) => ids.indexOf(id) === index).slice(0, 3);
  return unique.length === 3 ? unique : null;
}

function sanitizeMetricIds(value: unknown): TodayMetricId[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((id): id is TodayMetricId =>
    TODAY_METRIC_OPTIONS.some((option) => option.id === id),
  );
  const unique = ids.filter((id, index) => ids.indexOf(id) === index).slice(0, 3);
  return unique.length > 0 ? unique : null;
}

function resolveShortcutIds(): QuickLaunchId[] {
  const custom = sanitizeShortcutIds(readJson<unknown>(QUICK_LAUNCH_STORAGE_KEY, null));
  if (custom) return custom;

  const visits = readJson<Record<string, number>>(QUICK_LAUNCH_VISITS_KEY, {});
  const ranked = [...QUICK_LAUNCH_OPTIONS]
    .sort((a, b) => (visits[b.href] ?? 0) - (visits[a.href] ?? 0))
    .filter((option) => (visits[option.href] ?? 0) > 0)
    .map((option) => option.id);
  const merged = [...ranked, ...DEFAULT_QUICK_LAUNCH].filter(
    (id, index, arr) => arr.indexOf(id) === index,
  );
  return merged.slice(0, 3);
}

function resolveTodayMetricIds(): TodayMetricId[] {
  return sanitizeMetricIds(readJson<unknown>(TODAY_PANEL_STORAGE_KEY, null)) ?? DEFAULT_TODAY_METRICS;
}

function recordVisit(pathWithoutLocale: string) {
  const option = QUICK_LAUNCH_OPTIONS.find(
    (candidate) =>
      pathWithoutLocale === candidate.href ||
      pathWithoutLocale.startsWith(`${candidate.href}/`),
  );
  if (!option) return;
  const visits = readJson<Record<string, number>>(QUICK_LAUNCH_VISITS_KEY, {});
  writeJson(QUICK_LAUNCH_VISITS_KEY, {
    ...visits,
    [option.href]: (visits[option.href] ?? 0) + 1,
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function itemPriority(item: CalendarItem): string | null {
  if ("priority" in item && typeof item.priority === "string") return item.priority;
  if ("free_priority" in item && typeof item.free_priority === "string") return item.free_priority;
  return null;
}

function itemOverdue(item: CalendarItem): boolean {
  return "overdue" in item && item.overdue === true;
}

function minutesOfDay(time: string | null): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getNextItem(items: CalendarItem[] | undefined) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const upcoming = (items ?? [])
    .map((item) => {
      const start = minutesOfDay(item.start_time);
      return { item, start };
    })
    .filter((entry): entry is { item: CalendarItem; start: number } => entry.start != null)
    .filter((entry) => entry.start >= current)
    .sort((a, b) => a.start - b.start);
  return upcoming[0]?.item ?? (items ?? [])[0] ?? null;
}

function possessiveRestingTitle(name: string, locale: AppLocale) {
  const cleanName = name.trim() || "OS Buddy";
  if (isZh(locale) || /[\u3400-\u9FFF]/.test(cleanName)) {
    return `${cleanName}嘅 resting space`;
  }
  return `${cleanName}${cleanName.endsWith("s") ? "'" : "'s"} resting space`;
}

function getRestingAnimationSrc(petId: string, state: OSBuddyRestingState) {
  return `/os-buddy/pets/${petId}/resting-space/${state}.gif`;
}

function restStateLabel(state: OSBuddyRestingState, locale: AppLocale) {
  if (isZh(locale)) {
    if (state === "sleeping") return "瞓覺";
    if (state === "headache") return "頭痛";
    return "Resting";
  }
  if (state === "sleeping") return "Sleeping";
  if (state === "headache") return "Headache";
  return "Resting";
}

function nextRestingState(state: OSBuddyRestingState): OSBuddyRestingState {
  if (state === "resting") return "sleeping";
  if (state === "sleeping") return "headache";
  return "resting";
}

function TodayRow({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "green" | "blue" | "amber";
}) {
  return (
    <div className="today-companion-row grid min-h-[22px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-1 border-b border-white/[0.075] px-1 last:border-b-0">
      <span className="today-companion-row__icon inline-flex size-[18px] items-center justify-center rounded-[5px] border border-white/[0.08] bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <Icon className="size-2.5 text-sky-200" aria-hidden />
      </span>
      <span className="today-companion-row__label min-w-0 truncate text-[9px] font-medium text-slate-200/90">
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "today-companion-row__value max-w-[76px] truncate text-right text-[8px] font-semibold leading-none",
          tone === "green" && "text-emerald-300",
          tone === "blue" && "text-sky-300",
          tone === "amber" && "text-amber-300",
          tone === "default" && "text-slate-100",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function QuickLaunchButton({
  option,
  localeSlug,
  locale,
  onNavigate,
}: {
  option: QuickLaunchOption;
  localeSlug: LocaleUrlSlug;
  locale: AppLocale;
  onNavigate: () => void;
}) {
  const Icon = option.icon;
  const label = isZh(locale) ? option.zhLabel : option.label;
  return (
    <Link
      href={withLocalePrefix(localeSlug, option.href)}
      onClick={onNavigate}
      className="today-companion-quick-button group flex min-h-[42px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border border-white/[0.09] bg-white/[0.045] px-0.5 text-slate-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
      title={label}
    >
      <Icon className="size-3.5 text-sky-200 transition group-hover:text-emerald-200" aria-hidden />
      <span className="today-companion-quick-label max-w-full truncate text-[8px] font-medium leading-none">{label}</span>
    </Link>
  );
}

function TodayWeatherIcon() {
  const { result } = useWeather();
  const animationKey =
    result?.status === "ok"
      ? resolveWeatherAnimationKey({
          weatherId: result.weatherId,
          icon: result.icon,
          main: result.main,
        })
      : "cloudy";
  const title =
    result?.status === "ok"
      ? result.city
        ? `${result.city} • ${result.description}`
        : result.description
      : "Weather";

  return (
    <span
      className="today-companion-weather-icon inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-amber-200/15 bg-amber-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      title={title}
      aria-label={title}
    >
      <WeatherLottie animationKey={animationKey} className="size-5" />
    </span>
  );
}

function QuickLaunchCustomizer({
  open,
  selected,
  locale,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  selected: QuickLaunchId[];
  locale: AppLocale;
  onOpenChange: (open: boolean) => void;
  onSave: (ids: QuickLaunchId[]) => void;
}) {
  const [draft, setDraft] = useState<QuickLaunchId[]>(selected);

  const toggle = (id: QuickLaunchId) => {
    setDraft((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [current[1], current[2], id].filter(Boolean) as QuickLaunchId[];
      return [...current, id];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isZh(locale) ? "自訂 Quick Launch" : "Customize Quick Launch"}</DialogTitle>
          <DialogDescription>
            {isZh(locale)
              ? "揀 3 個最常用入口，會顯示喺 sidebar panel。"
              : "Pick three favorite pages for the sidebar panel."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_LAUNCH_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = draft.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex min-h-14 items-center gap-2 rounded-lg border px-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                    : "border-border/70 bg-background/50 text-foreground hover:bg-muted/70",
                )}
                onClick={() => toggle(option.id)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {isZh(locale) ? option.zhLabel : option.label}
                </span>
                {active ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isZh(locale) ? "取消" : "Cancel"}
          </Button>
          <Button
            onClick={() => {
              const normalized = [...draft, ...DEFAULT_QUICK_LAUNCH]
                .filter((id, index, arr) => arr.indexOf(id) === index)
                .slice(0, 3);
              onSave(normalized);
              onOpenChange(false);
            }}
          >
            {isZh(locale) ? "儲存" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TodayPanelCustomizer({
  open,
  selected,
  locale,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  selected: TodayMetricId[];
  locale: AppLocale;
  onOpenChange: (open: boolean) => void;
  onSave: (ids: TodayMetricId[]) => void;
}) {
  const [draft, setDraft] = useState<TodayMetricId[]>(selected);

  const toggle = (id: TodayMetricId) => {
    setDraft((current) => {
      if (current.includes(id)) {
        return current.length > 1 ? current.filter((item) => item !== id) : current;
      }
      return [...current, id].slice(-3);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isZh(locale) ? "自訂 Today Panel" : "Customize Today Panel"}</DialogTitle>
          <DialogDescription>
            {isZh(locale)
              ? "揀最多 3 個簡短訊號顯示喺 sidebar。你可以換成 tasks、career、health、bucket list 或 journal。"
              : "Pick up to three compact signals for the sidebar: tasks, focus, career, health, bucket list, journal, and more."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {TODAY_METRIC_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = draft.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                    : "border-border/70 bg-background/50 text-foreground hover:bg-muted/70",
                )}
                onClick={() => toggle(option.id)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {isZh(locale) ? option.zhLabel : option.label}
                </span>
                {active ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setDraft(DEFAULT_TODAY_METRICS)}
          >
            {isZh(locale) ? "回復預設" : "Reset"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isZh(locale) ? "取消" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                const normalized = sanitizeMetricIds(draft) ?? DEFAULT_TODAY_METRICS;
                onSave(normalized);
                onOpenChange(false);
              }}
            >
              {isZh(locale) ? "儲存" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OSBuddyRestingSpace({ buddyLine }: { buddyLine: string }) {
  const locale = useAppStore((s) => s.language);
  const { petId, name } = useOSBuddy();
  const isRestingInSidebar = useOSBuddyStore((s) => s.isRestingInSidebar);
  const restingState = useOSBuddyStore((s) => s.restingState);
  const dockInRestingSpace = useOSBuddyStore((s) => s.dockInRestingSpace);
  const releaseFromRestingSpace = useOSBuddyStore((s) => s.releaseFromRestingSpace);
  const setRestingState = useOSBuddyStore((s) => s.setRestingState);
  const temporarilySetMood = useOSBuddyStore((s) => s.temporarilySetMood);
  const showBubble = useOSBuddyStore((s) => s.showBubble);
  const animationSrc = getRestingAnimationSrc(petId, restingState);
  const title = possessiveRestingTitle(name, locale);

  return (
    <section className="today-companion-rest-section space-y-0.5 border-t border-white/[0.08] pt-0.5">
      <div className="flex items-center justify-between">
        <h3 className="today-companion-section-title min-w-0 truncate text-[9px] font-medium text-slate-100">
          {title}
        </h3>
        <Info className="size-3 shrink-0 text-slate-500" aria-hidden />
      </div>
      <div
        id={OS_BUDDY_RESTING_SPACE_DROPZONE_ID}
        className={cn(
          "today-companion-rest-room relative h-[62px] overflow-hidden rounded-lg border bg-black/25 transition",
          isRestingInSidebar
            ? "border-emerald-300/35 shadow-[inset_0_0_28px_rgba(16,185,129,0.08)]"
            : "border-white/[0.12]",
        )}
      >
        <div
          className="today-companion-rest-room__bg absolute inset-0 bg-center bg-no-repeat opacity-95"
          style={{ backgroundImage: `url(${RESTING_ROOM_BACKGROUND})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_72%,rgba(34,197,94,0.08),transparent_45%),linear-gradient(90deg,rgba(2,6,23,0.08),rgba(2,6,23,0.2))]" aria-hidden />
        {isRestingInSidebar ? (
          <button
            type="button"
            className="absolute left-1 top-1 z-30 inline-flex size-5 items-center justify-center rounded-md border border-white/10 bg-black/25 text-slate-300/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            title={isZh(locale) ? `召回 ${name}` : `Call ${name} out`}
            onClick={() => {
              releaseFromRestingSpace();
              temporarilySetMood("success", 1200);
              showBubble(
                isZh(locale) ? `${name} 返嚟喇。` : `${name} is back.`,
                "user-triggered",
                { force: true, durationMs: 2200 },
              );
            }}
          >
            <Home className="size-3" aria-hidden />
          </button>
        ) : null}

        <button
          type="button"
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          title={
            isRestingInSidebar
              ? isZh(locale)
                ? "切換休息狀態"
                : "Cycle rest animation"
              : isZh(locale)
                ? `安排 ${name} 休息`
                : `Let ${name} rest`
          }
          onClick={() => {
            if (!isRestingInSidebar) {
              dockInRestingSpace("sleeping");
              return;
            }
            setRestingState(nextRestingState(restingState));
          }}
        >
          {isRestingInSidebar ? (
            <span className="absolute left-[58px] bottom-[4px]">
              <span
                className={cn(
                  "today-companion-rest-sprite",
                  restingState === "sleeping" && "today-companion-rest-sprite--sleeping",
                  restingState === "headache" && "today-companion-rest-sprite--headache",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- These state assets are tiny animated GIFs and must remain unoptimized. */}
                <img
                  src={animationSrc}
                  alt={`${name} ${restStateLabel(restingState, locale)}`}
                  className="today-companion-rest-gif"
                  draggable={false}
                />
                {restingState === "sleeping" ? (
                  <span className="today-companion-zzz" aria-hidden>
                    Z
                  </span>
                ) : null}
                {restingState === "headache" ? (
                  <span className="today-companion-headache" aria-hidden>
                    !
                  </span>
                ) : null}
              </span>
            </span>
          ) : (
            <span className="today-companion-drop-cue absolute left-1/2 bottom-[17px] inline-flex -translate-x-1/2 items-center gap-1 rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-medium text-slate-200/90 shadow-[0_0_14px_rgba(16,185,129,0.16)] backdrop-blur-sm">
              <CircleDot className="size-3 text-emerald-300/80" aria-hidden />
              {isZh(locale) ? "拖入休息" : "Drop here"}
            </span>
          )}
        </button>

        {isRestingInSidebar ? (
          <>
            <span
              className={cn(
                "absolute right-1.5 top-1.5 z-20 inline-flex min-h-4 items-center justify-center gap-1 rounded-md border px-1.5 text-[7px] font-semibold",
                restingState === "headache"
                  ? "border-amber-300/35 bg-amber-400/20 text-amber-100"
                  : "border-emerald-300/25 bg-emerald-400/20 text-emerald-100",
              )}
            >
              <span className="size-1 rounded-full bg-current" aria-hidden />
              {restStateLabel(restingState, locale)}
            </span>
            <div className="absolute right-1.5 bottom-1 z-20 w-[56px] rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[7px] leading-snug text-slate-100/90 backdrop-blur-sm">
              <span className="line-clamp-2">{buddyLine}</span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function TodayCompanionPanel() {
  const locale = useAppStore((s) => s.language);
  const localeSlug = useLocaleSlug();
  const pathname = usePathname();
  const todayDate = useClientTodayDate();
  const today = useTodayContext();
  const { data: garden } = useActiveGarden();
  const { data: gardenTodayLog } = useGardenTodayLog();
  const { name } = useOSBuddy();
  const openCaptureSheet = useIdeaCaptureStore((s) => s.openSheet);
  const showBubble = useOSBuddyStore((s) => s.showBubble);
  const isRestingInSidebar = useOSBuddyStore((s) => s.isRestingInSidebar);
  const [shortcutIds, setShortcutIds] = useState<QuickLaunchId[]>([]);
  const [todayMetricIds, setTodayMetricIds] = useState<TodayMetricId[]>([]);
  const [panelPreferencesReady, setPanelPreferencesReady] = useState(false);
  const [todayCustomizerOpen, setTodayCustomizerOpen] = useState(false);
  const [quickCustomizerOpen, setQuickCustomizerOpen] = useState(false);
  const todayDateLabel = useMemo(
    () => (todayDate ? formatTodayPanelDate(locale, todayDate) : ""),
    [locale, todayDate],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setShortcutIds(resolveShortcutIds());
      setTodayMetricIds(resolveTodayMetricIds());
      setPanelPreferencesReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const withoutLocale = pathname.replace(/^\/(en|zh-TW|zh-CN|ja|ko|fr|it|es|vi)(?=\/|$)/, "") || "/";
    recordVisit(withoutLocale);
  }, [pathname]);

  const nextItem = useMemo(() => getNextItem(today.context?.items), [today.context?.items]);
  const overdueItem = useMemo(
    () => (today.context?.items ?? []).find((item) => itemOverdue(item)),
    [today.context?.items],
  );

  const focusValue = useMemo(() => {
    if (overdueItem) return "Clear overdue";
    const priorityItem = (today.context?.items ?? []).find((item) => {
      const priority = itemPriority(item);
      return priority === "urgent" || priority === "high" || priority === "must";
    });
    if (priorityItem) return priorityItem.title;
    if ((today.context?.free_windows ?? []).length > 0) return "Deep Work";
    if (today.context?.load === "Recovery") return "Recovery";
    return today.context?.items?.length ? "Steady flow" : "Set intention";
  }, [overdueItem, today.context]);

  const nextValue = useMemo(() => {
    if (!nextItem) return isZh(locale) ? "Open day" : "Open day";
    const time = formatTime(nextItem.start_time);
    const title = nextItem.title;
    return time ? `${time} ${title}` : title;
  }, [locale, nextItem]);

  const gardenValue = useMemo(() => {
    const todayPoints = Number(Boolean(gardenTodayLog?.watered)) + Number(Boolean(gardenTodayLog?.chest_claimed));
    if (todayPoints > 0) return `+${todayPoints} today`;
    if (garden?.is_wilted) return "Needs care";
    if (garden) return `Stage ${garden.growth_stage}`;
    return isZh(locale) ? "Plant seed" : "Plant seed";
  }, [garden, gardenTodayLog?.chest_claimed, gardenTodayLog?.watered, locale]);

  const taskValue = useMemo(() => {
    const overdueCount = today.context?.overdue_count ?? 0;
    if (overdueCount > 0) return `${overdueCount} overdue`;
    const count = today.context?.items?.length ?? 0;
    return `${count} ${count === 1 ? "task" : "tasks"}`;
  }, [today.context?.items?.length, today.context?.overdue_count]);

  const metricValues = useMemo<Record<TodayMetricId, string>>(
    () => ({
      focus: focusValue,
      next: nextValue,
      garden: gardenValue,
      "task-count": taskValue,
      career: isZh(locale) ? "Next move" : "Next move",
      health: today.context?.load === "Recovery" ? "Recovery" : "Check in",
      "bucket-list": isZh(locale) ? "Review dream" : "Review dream",
      journal: isZh(locale) ? "Write note" : "Write note",
    }),
    [focusValue, gardenValue, locale, nextValue, taskValue, today.context?.load],
  );

  const activeTodayMetricIds = panelPreferencesReady ? todayMetricIds : DEFAULT_TODAY_METRICS;
  const todayRows = activeTodayMetricIds
    .map(metricById)
    .filter((option): option is TodayMetricOption => Boolean(option))
    .map((option) => ({
      ...option,
      label: isZh(locale) ? option.zhLabel : option.label,
      value: metricValues[option.id],
      tone:
        option.id === "task-count" && (today.context?.overdue_count ?? 0) > 0
          ? "amber"
          : option.tone,
    }));

  const buddyLine = useMemo(() => {
    if (today.context?.overdue_count) {
      return isZh(locale) ? "先處理最細嗰步。" : "Start with the smallest bite.";
    }
    if ((today.context?.free_windows ?? []).length > 0) {
      return isZh(locale) ? "有一段乾淨 focus window。" : "One clean focus window.";
    }
    if (nextItem) {
      return isZh(locale) ? "我幫你睇住下一件事。" : "I am watching the next thing.";
    }
    return isZh(locale) ? `${name} 喺度陪你。` : `${name} is here with you.`;
  }, [locale, name, nextItem, today.context?.free_windows, today.context?.overdue_count]);

  const activeShortcutIds = panelPreferencesReady ? shortcutIds : DEFAULT_QUICK_LAUNCH;
  const quickLaunchOptions = activeShortcutIds
    .map(optionById)
    .filter((option): option is QuickLaunchOption => Boolean(option));

  const saveShortcuts = useCallback((ids: QuickLaunchId[]) => {
    writeJson(QUICK_LAUNCH_STORAGE_KEY, ids);
    setShortcutIds(ids);
    toast.success("Quick Launch updated");
  }, []);

  const saveTodayMetrics = useCallback((ids: TodayMetricId[]) => {
    writeJson(TODAY_PANEL_STORAGE_KEY, ids);
    setTodayMetricIds(ids);
    toast.success("Today Panel updated");
  }, []);

  const handleCapture = () => {
    openCaptureSheet();
    showBubble(
      isZh(locale) ? `${name} 幫你打開 capture。` : `${name} opened capture mode.`,
      "user-triggered",
      { durationMs: 2200, force: true },
    );
  };

  const handlePlan = () => {
    showBubble(
      isZh(locale) ? `${name} 幫你打開 planner。` : `${name} opened the planner.`,
      "user-triggered",
      { durationMs: 1800, force: true },
    );
  };

  if (!panelPreferencesReady) {
    return null;
  }

  return (
    <div
      className="today-companion-panel mt-auto shrink-0 px-2 pb-1.5 pt-1.5 group-data-[collapsible=icon]:hidden"
      data-focus-hideable
    >
      <div className="today-companion-panel__shell relative space-y-1 rounded-xl border border-white/12 bg-slate-950/78 p-1.5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <TodayWeatherIcon />
            <div className="min-w-0">
              <h2 className="today-companion-panel__title truncate text-[12px] font-semibold leading-tight text-slate-100">Today</h2>
              <p className="today-companion-panel__date truncate text-[8px] font-medium leading-tight text-slate-400">
                {todayDateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            aria-label={isZh(locale) ? "自訂 Today panel" : "Customize Today panel"}
            title={isZh(locale) ? "自訂 Today panel" : "Customize Today panel"}
            onClick={() => setTodayCustomizerOpen(true)}
          >
            <Settings className="size-3" aria-hidden />
          </button>
        </div>

        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/15">
          {todayRows.map((row) => (
            <TodayRow
              key={row.id}
              icon={row.icon}
              label={row.label}
              value={row.value}
              tone={row.id === "garden" && garden?.is_wilted ? "amber" : row.tone}
            />
          ))}
        </section>

        <section className="space-y-0.5 border-t border-white/[0.08] pt-0.5">
          <div className="flex items-center justify-between">
            <h3 className="today-companion-section-title text-[9px] font-medium text-slate-100">Quick Launch</h3>
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
              aria-label={isZh(locale) ? "自訂 Quick Launch" : "Customize Quick Launch"}
              title={isZh(locale) ? "自訂 Quick Launch" : "Customize Quick Launch"}
              onClick={() => setQuickCustomizerOpen(true)}
            >
              <Edit3 className="size-3" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {quickLaunchOptions.map((option) => (
              <QuickLaunchButton
                key={option.id}
                option={option}
                localeSlug={localeSlug}
                locale={locale}
                onNavigate={() => {
                  showBubble(
                    isZh(locale)
                      ? `${name} 送你去 ${option.zhLabel}。`
                      : `${name} opened ${option.label}.`,
                    "user-triggered",
                    { durationMs: 1700, force: true },
                  );
                }}
              />
            ))}
          </div>
        </section>

        <OSBuddyRestingSpace buddyLine={buddyLine} />

        <div className="grid grid-cols-2 gap-1 border-t border-white/[0.08] pt-0.5">
          <button
            type="button"
            className="today-companion-action-button inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[10px] font-semibold text-slate-100 transition hover:border-emerald-300/30 hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            onClick={handleCapture}
          >
            <Plus className="size-3.5 text-emerald-300" aria-hidden />
            Capture
          </button>
          <Link
            href={withLocalePrefix(localeSlug, "/daily-planner")}
            className="today-companion-action-button inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-sky-300/15 bg-sky-500/10 px-2 text-[10px] font-semibold text-sky-100 transition hover:border-sky-200/35 hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
            onClick={handlePlan}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            Plan
            {isRestingInSidebar ? null : <ChevronRight className="size-3" aria-hidden />}
          </Link>
        </div>
      </div>

      <TodayPanelCustomizer
        key={activeTodayMetricIds.join(":")}
        open={todayCustomizerOpen}
        selected={activeTodayMetricIds}
        locale={locale}
        onOpenChange={setTodayCustomizerOpen}
        onSave={saveTodayMetrics}
      />

      <QuickLaunchCustomizer
        key={activeShortcutIds.join(":")}
        open={quickCustomizerOpen}
        selected={activeShortcutIds}
        locale={locale}
        onOpenChange={setQuickCustomizerOpen}
        onSave={saveShortcuts}
      />
    </div>
  );
}
