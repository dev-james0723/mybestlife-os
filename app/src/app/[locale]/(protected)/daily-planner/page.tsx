"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/html";
import { useAppStore } from "@/stores/app-store";
import {
  getDailyPlannerUiCopy,
  getPlannerMockAiSuggestions,
  formatBlockDurationLocalized,
  type DailyPlannerUiCopy,
} from "@/lib/i18n/daily-planner-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getPreTaskRitualUiCopy } from "@/lib/i18n/pre-task-ritual-ui";

import Link from "next/link";
import { useDailyPlan, useUpsertDailyPlan } from "@/hooks/use-daily-plans";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import {
  useScheduleTemplates,
  useCreateScheduleTemplate,
  useDeleteScheduleTemplate,
} from "@/hooks/use-schedule-templates";
import { useTasks } from "@/hooks/use-tasks";
import { useIdeas } from "@/hooks/use-ideas";
import { useNotes } from "@/hooks/use-notes";
import { useKnowledgeItemsPickList, type KnowledgePickRow } from "@/hooks/use-knowledge-items-pick";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile, useUpdateProfile } from "@/hooks/use-settings";
import {
  useGoogleCalendarPlannerStatus,
  useGoogleCalendarTaskSyncForDate,
  usePlannerGcalLastPushAt,
  usePlannerGcalPushPending,
} from "@/hooks/use-google-calendar-planner";
import { useQueryClient } from "@tanstack/react-query";
import { CALENDAR_QUERY_KEY } from "@/lib/calendar/query-keys";
import { ensurePlannerTaskIds } from "@/lib/normalize-plan-tasks";
import { settingsRepository } from "@/lib/repositories/settings";
import { createClient } from "@/lib/supabase/client";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import { setPlannerGcalLastPushAt } from "@/lib/google/planner-calendar-push-request";
import {
  QUICK_TASK_ICON_MAP,
  inferQuickTaskIconKey,
  resolveQuickTaskIconKey,
  lucideIconToQuickTaskKey,
} from "@/lib/quick-task-icon";
import { resolveQuickTaskRaster } from "@/lib/daily-planner/quick-task-preset-meta";
import type { QuickTaskPresetKey } from "@/lib/daily-planner/quick-task-preset-meta";
import { normalizeQuickTasksJson } from "@/lib/daily-planner/normalize-quick-task";

import type { LucideIcon } from "lucide-react";
import type {
  DailyPlanTask,
  FreePlanTask,
  PlanningMode,
  Task,
  ScheduleTemplate,
  QuickTaskDef,
  Idea,
  Note,
} from "@/types/database";

import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PreTaskRitualModal } from "@/components/tasks/pre-task-ritual-modal";
import { ImportTasksDialog } from "@/components/daily-planner/import-tasks-dialog";
import { AISuggestionsDialog } from "@/components/daily-planner/ai-suggestions-dialog";
import { CreatePlannerTaskAiDialog } from "@/components/daily-planner/create-planner-task-ai-dialog";
import { TemplateDialog } from "@/components/daily-planner/template-dialog";
import { TimelineView } from "@/components/daily-planner/timeline-view";
import { MiniCalendarPopover } from "@/components/daily-planner/mini-calendar-popover";
import { VisualScheduleGenerator } from "@/components/daily-planner/visual-schedule-generator";
import { TimeSummaryCard } from "@/components/daily-planner/time-summary-card";
import { FreePlanBoard } from "@/components/daily-planner/free-plan-board";
import { FreePlanSummary } from "@/components/daily-planner/free-plan-summary";
import { PlanningModeToggle } from "@/components/daily-planner/planning-mode-toggle";
import {
  SortableTaskList,
  type LocalPlanTask,
  type TaskMeta,
} from "@/components/daily-planner/sortable-task-list";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Wand2,
  CalendarSync,
  Coffee,
  UtensilsCrossed,
  Soup,
  Dumbbell,
  Wind,
  Drama,
  BookOpen,
  NotebookPen,
  Timer,
  Moon,
  FolderInput,
  ArrowUp,
  CalendarClock,
  ExternalLink,
  Lightbulb,
  ListChecks,
  Hourglass,
  Tag,
  Target,
  TriangleAlert,
  Loader2,
} from "lucide-react";

/* ─────────────────────── constants ─────────────────────── */

const DEFAULT_BLOCK_MINUTES = 10;

/** Default visible day window when the user has not set times (or DB has null). */
const DEFAULT_PLAN_START_TIME = "06:00";
const DEFAULT_PLAN_END_TIME = "23:00";

const TASK_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
  "#10b981", "#f97316", "#3b82f6", "#ef4444", "#84cc16",
  "#06b6d4", "#a855f7", "#e879f9", "#fb923c", "#34d399", "#60a5fa",
];

type QuickTaskNameKey = keyof Pick<
  DailyPlannerUiCopy,
  | "quickBreakfast"
  | "quickLunch"
  | "quickDinner"
  | "quickGym"
  | "quickMeditate"
  | "quickImprovise"
  | "quickRead"
  | "quickJournal"
  | "quickBreak"
  | "quickRest"
>;

const BUILTIN_QUICK_TASK_DEFS: {
  nameKey: QuickTaskNameKey;
  icon: LucideIcon;
  blocks: number;
  iconClass: string;
  presetKey: QuickTaskPresetKey;
}[] = [
  { nameKey: "quickBreakfast", icon: Coffee, blocks: 3, iconClass: "text-amber-700 dark:text-amber-300", presetKey: "breakfast" },
  { nameKey: "quickLunch", icon: UtensilsCrossed, blocks: 6, iconClass: "text-emerald-700 dark:text-emerald-300", presetKey: "lunch" },
  { nameKey: "quickDinner", icon: Soup, blocks: 8, iconClass: "text-orange-700 dark:text-orange-300", presetKey: "dinner" },
  { nameKey: "quickGym", icon: Dumbbell, blocks: 9, iconClass: "text-rose-700 dark:text-rose-300", presetKey: "gym" },
  { nameKey: "quickMeditate", icon: Wind, blocks: 1, iconClass: "text-sky-700 dark:text-sky-300", presetKey: "meditate" },
  { nameKey: "quickImprovise", icon: Drama, blocks: 3, iconClass: "text-violet-700 dark:text-violet-300", presetKey: "improvise" },
  { nameKey: "quickRead", icon: BookOpen, blocks: 2, iconClass: "text-indigo-700 dark:text-indigo-300", presetKey: "read" },
  { nameKey: "quickJournal", icon: NotebookPen, blocks: 1, iconClass: "text-teal-700 dark:text-teal-300", presetKey: "journal" },
  { nameKey: "quickBreak", icon: Timer, blocks: 1, iconClass: "text-amber-800/90 dark:text-amber-200/90", presetKey: "break" },
  { nameKey: "quickRest", icon: Moon, blocks: 2, iconClass: "text-slate-600 dark:text-slate-300", presetKey: "rest" },
];

/* ─────────────────────── helpers ─────────────────────── */

function getColor(i: number): string {
  return TASK_COLORS[i % TASK_COLORS.length];
}

function trimPreviewPlain(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function smartLinkIdeaDisplayLabel(
  idea: Idea | undefined,
  loading: boolean,
  copy: Pick<DailyPlannerUiCopy, "smartLinkMissingIdea" | "smartLinkLoading" | "untitledTask">,
): string {
  if (loading && !idea) return copy.smartLinkLoading;
  if (!idea) return copy.smartLinkMissingIdea;
  const head = idea.title?.trim();
  if (head) return head;
  const preview = trimPreviewPlain(stripHtml(idea.content), 80);
  return preview || copy.untitledTask;
}

function smartLinkNoteDisplayLabel(
  note: Note | undefined,
  loading: boolean,
  copy: Pick<DailyPlannerUiCopy, "smartLinkMissingNote" | "smartLinkLoading" | "untitledTask">,
): string {
  if (loading && !note) return copy.smartLinkLoading;
  if (!note) return copy.smartLinkMissingNote;
  const head = note.title?.trim();
  if (head) return head;
  const preview = trimPreviewPlain(stripHtml(note.content ?? ""), 80);
  return preview || copy.untitledTask;
}

function smartLinkKnowledgeDisplayLabel(
  row: KnowledgePickRow | undefined,
  loading: boolean,
  copy: Pick<DailyPlannerUiCopy, "smartLinkMissingKnowledge" | "smartLinkLoading" | "untitledTask">,
): string {
  if (loading && !row) return copy.smartLinkLoading;
  if (!row) return copy.smartLinkMissingKnowledge;
  const head = row.title?.trim();
  if (head) return head;
  return copy.untitledTask;
}

type PlannerLocaleContextValue = {
  copy: DailyPlannerUiCopy;
  fmtBlocks: (blocks: number) => string;
  dateLocale: ReturnType<typeof getDateFnsLocale>;
  formatTime12: (totalMin: number) => string;
};

const PlannerLocaleContext = createContext<PlannerLocaleContextValue | null>(null);

function buildFormatTime12(periodAm: string, periodPm: string) {
  return (totalMin: number) => {
    const h24 = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const isPM = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12}:${String(m).padStart(2, "0")} ${isPM ? periodPm : periodAm}`;
  };
}

function usePlannerLocale(): PlannerLocaleContextValue {
  const language = useAppStore((s) => s.language);
  const v = useContext(PlannerLocaleContext);
  if (!v) {
    const copy = getDailyPlannerUiCopy(language);
    return {
      copy,
      fmtBlocks: (blocks) => formatBlockDurationLocalized(copy, blocks, DEFAULT_BLOCK_MINUTES),
      dateLocale: getDateFnsLocale(language),
      formatTime12: buildFormatTime12(copy.periodAm, copy.periodPm),
    };
  }
  return v;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Resolves a planner Start/End pair into absolute minutes from the planner-date's midnight.
 *
 * `endMin` may exceed `24 * 60` when the range crosses into the next day — the End Time is
 * always interpreted as the *next* such wall-clock that occurs after the Start Time.
 */
function resolvePlanRange(startTime: string, endTime: string): {
  startMin: number;
  endMin: number;
  durationMin: number;
  endDayOffset: number;
} {
  const startMin = parseTimeToMinutes(startTime);
  let endMin = parseTimeToMinutes(endTime);
  let endDayOffset = 0;
  if (endMin <= startMin) {
    endMin += 24 * 60;
    endDayOffset = 1;
  }
  return { startMin, endMin, durationMin: endMin - startMin, endDayOffset };
}

/** Stable client-only id used by dnd-kit to identify rows across re-renders. */
function newUid(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ensure a plan task has a client-only `_uid`. The field is stripped before
 *  the plan is persisted (see `stripUid`). */
function withUid(t: DailyPlanTask): LocalPlanTask {
  const local = t as LocalPlanTask;
  return local._uid ? local : { ...t, _uid: newUid() };
}

/** Drop the in-memory `_uid` field before persisting; ensure stable planner ids for Google sync. */
function persistTask(t: LocalPlanTask, order: number): DailyPlanTask {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _uid, ...rest } = t;
  return { ...rest, order };
}

function persistTasks(tasks: LocalPlanTask[]): DailyPlanTask[] {
  return ensurePlannerTaskIds(tasks.map((task, i) => persistTask(task, i)));
}

/* ─────────────────── WheelColumn ─────────────────── */

const ITEM_H = 40;
const VISIBLE = 3;

function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: number | string }[];
  value: number | string;
  onChange: (v: number | string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedIdx = items.findIndex((i) => i.value === value);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = Math.max(0, selectedIdx) * ITEM_H;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.min(Math.max(idx, 0), items.length - 1);
      onChange(items[clamped].value);
    }, 80);
  }, [items, onChange]);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-primary/30 bg-primary/5"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      <div
        ref={ref}
        className="overflow-y-auto scrollbar-none"
        style={{
          height: VISIBLE * ITEM_H,
          scrollSnapType: "y mandatory",
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: ITEM_H }} />
        {items.map((item, i) => (
          <div
            key={`${item.value}`}
            className={cn(
              "flex items-center justify-center text-base transition-colors cursor-pointer select-none",
              item.value === value
                ? "font-semibold text-foreground"
                : "text-muted-foreground/60",
            )}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            onClick={() => {
              onChange(item.value);
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
            }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

/* ────────────────── TimeWheelPicker ────────────────── */

const HOURS = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

/**
 * Full minute column 00–59. The Start/End pickers must support every minute regardless of
 * the visual block interval — block size only controls how the grid is divided, not which
 * times the user can pick.
 */
const MINUTES_FULL = Array.from({ length: 60 }, (_, i) => ({
  label: String(i).padStart(2, "0"),
  value: i,
}));

function parseHHMMto12(hhmm: string): {
  hour: number;
  minute: number;
  ampm: string;
} {
  const totalMin = parseTimeToMinutes(hhmm);
  const h24 = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { hour: h12, minute: m, ampm };
}

function to24(h12: number, minute: number, ampm: string): string {
  let h24 = h12;
  if (ampm === "AM" && h12 === 12) h24 = 0;
  else if (ampm === "PM" && h12 !== 12) h24 = h12 + 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function TimeWheelPicker({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint?: ReactNode;
}) {
  const { copy, formatTime12 } = usePlannerLocale();
  const ampmItems = useMemo(
    () =>
      [
        { label: copy.periodAm, value: "AM" },
        { label: copy.periodPm, value: "PM" },
      ] as const,
    [copy.periodAm, copy.periodPm],
  );
  const parsed = parseHHMMto12(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const p = parseHHMMto12(value);
      setHour(p.hour);
      setMinute(p.minute);
      setAmpm(p.ampm);
    }
  }, [open, value]);

  const handleDone = useCallback(() => {
    onChange(to24(hour, minute, ampm));
    setOpen(false);
  }, [hour, minute, ampm, onChange]);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full min-w-0 justify-start gap-2 text-sm font-medium tabular-nums"
            />
          }
        >
          <Clock className="h-3.5 w-3.5" />
          {formatTime12(parseTimeToMinutes(value))}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex gap-1 mb-3">
            <div className="w-14">
              <p className="text-[10px] text-center text-muted-foreground mb-1">
                {copy.pickerHourLabel}
              </p>
              <WheelColumn
                items={HOURS}
                value={hour}
                onChange={(v) => setHour(v as number)}
              />
            </div>
            <div className="w-14">
              <p className="text-[10px] text-center text-muted-foreground mb-1">
                {copy.pickerMinLabel}
              </p>
              <WheelColumn
                items={MINUTES_FULL}
                value={minute}
                onChange={(v) => setMinute(v as number)}
              />
            </div>
            <div className="w-14">
              <p className="text-[10px] text-center text-muted-foreground mb-1">&nbsp;</p>
              <WheelColumn
                items={[...ampmItems]}
                value={ampm}
                onChange={(v) => setAmpm(v as string)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
              {copy.cancel}
            </Button>
            <Button size="xs" onClick={handleDone}>
              {copy.done}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {hint ? (
        <div
          key={String(hint)}
          className={cn(
            "transition-opacity duration-200",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1",
          )}
        >
          <p
            className={cn(
              "flex items-center gap-1.5 text-[11px] leading-snug text-amber-900 dark:text-amber-600",
              "planner-crosses-day-hint-wobble",
            )}
          >
            <TriangleAlert
              className="size-3 shrink-0 opacity-90"
              aria-hidden
            />
            <span>{hint}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────── BlockCountWheel ────────────────── */

const BLOCK_ITEMS = Array.from({ length: 30 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

function BlockCountWheel({
  taskName,
  value,
  onChange,
  onClose,
}: {
  taskName: string;
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  const { fmtBlocks, copy } = usePlannerLocale();
  const [local, setLocal] = useState(value);

  return (
    <div className="w-48 p-3">
      <p className="text-xs font-medium truncate mb-1">{taskName}</p>
      <WheelColumn
        items={BLOCK_ITEMS}
        value={local}
        onChange={(v) => setLocal(v as number)}
      />
      <p className="text-xs text-muted-foreground text-center mt-1">
        {copy.blockCountSummary(local, fmtBlocks(local))}
      </p>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" size="xs" onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button
          size="xs"
          onClick={() => {
            onChange(local);
            onClose();
          }}
        >
          {copy.done}
        </Button>
      </div>
    </div>
  );
}

/* ────────────────── QuickTaskButton ────────────────── */

function QuickTaskButton({
  task,
  onAdd,
  onDelete,
}: {
  task: {
    name: string;
    icon: LucideIcon;
    blocks: number;
    iconClass: string;
    iconSrc?: string;
    iconRasterFallback?: string;
  };
  onAdd: (blocks: number) => void;
  onDelete?: () => void;
}) {
  const { fmtBlocks, copy } = usePlannerLocale();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rasterFailed, setRasterFailed] = useState(false);
  const [urlIdx, setUrlIdx] = useState(0);

  const rasterUrls = useMemo(
    () => [task.iconSrc, task.iconRasterFallback].filter(Boolean) as string[],
    [task.iconSrc, task.iconRasterFallback],
  );

  const duration = fmtBlocks(task.blocks);
  const TaskIcon = task.icon;
  const activeRasterSrc = rasterUrls[urlIdx];
  const showRaster = rasterUrls.length > 0 && !rasterFailed && Boolean(activeRasterSrc);

  return (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-l-lg border border-r-0 px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50 touch-manipulation"
          onClick={() => onAdd(task.blocks)}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70 ring-1 ring-border/40">
            {showRaster ? (
              <img
                src={activeRasterSrc}
                alt=""
                className="size-4 object-contain rounded-[4px]"
                loading="lazy"
                onError={() => {
                  if (urlIdx < rasterUrls.length - 1) setUrlIdx((i) => i + 1);
                  else setRasterFailed(true);
                }}
              />
            ) : (
              <TaskIcon className={cn("size-4", task.iconClass)} strokeWidth={2} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{task.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {task.blocks}b · {duration}
            </p>
          </div>
        </button>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex items-center border rounded-r-lg px-1.5 hover:bg-muted/50 transition-colors touch-manipulation shrink-0"
              aria-label={`Choose blocks for ${task.name}`}
            />
          }
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="end">
        <BlockCountWheel
          taskName={task.name}
          value={task.blocks}
          onChange={(blocks) => onAdd(blocks)}
          onClose={() => setPickerOpen(false)}
        />
        {onDelete && (
          <>
            <Separator />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                onDelete();
                setPickerOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {copy.quickTaskDelete}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}


/* ══════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════ */

export default function DailyPlannerPage() {
  const isMobile = useIsMobile();
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getDailyPlannerUiCopy(language), [language]);
  const calendarCopy = useMemo(() => getCalendarUiCopy(language), [language]);
  const calendarAiPlanHref = useLocalizedPath("/calendar?tab=ai-plan");
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const blockMinutes = profile?.block_minutes ?? DEFAULT_BLOCK_MINUTES;
  const fmtBlocks = useCallback(
    (blocks: number) => formatBlockDurationLocalized(copy, blocks, blockMinutes),
    [copy, blockMinutes],
  );
  const formatTime12 = useMemo(
    () => buildFormatTime12(copy.periodAm, copy.periodPm),
    [copy.periodAm, copy.periodPm],
  );
  const plannerLocale = useMemo(
    () => ({ copy, fmtBlocks, dateLocale, formatTime12 }),
    [copy, fmtBlocks, dateLocale, formatTime12],
  );
  const mockAi = useMemo(
    () => getPlannerMockAiSuggestions(language),
    [language],
  );
  const ritualCopy = useMemo(
    () => getPreTaskRitualUiCopy(language),
    [language],
  );

  // ── date state ──
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");

  // ── time state (24-h HH:MM, stored internally) ──
  const [startTime, setStartTime] = useState(DEFAULT_PLAN_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_PLAN_END_TIME);

  // ── tasks state ──
  // We keep `_uid` on each in-memory task so dnd-kit can identify rows
  // stably across re-renders; `stripUid` removes it before persistence.
  const [tasks, setTasks] = useState<LocalPlanTask[]>([]);
  /**
   * Free Planning bucket. Lives alongside `tasks` (time-block) on the same daily_plans row so
   * switching modes never deletes data. Default mode is `time-block` per spec.
   */
  const [freeTasks, setFreeTasks] = useState<FreePlanTask[]>([]);
  const [mode, setMode] = useState<PlanningMode>("time-block");
  const [scheduleImageUrl, setScheduleImageUrl] = useState<string | null>(null);
  const scheduleImageUrlRef = useRef<string | null>(null);

  // ── data hooks ──
  const { data: plan } = useDailyPlan(dateStr);
  const { data: tomorrowPlan } = useDailyPlan(tomorrowStr);
  const upsertPlan = useUpsertDailyPlan();
  const { data: allTasks = [] } = useTasks();
  const { data: ideasData, isPending: ideasPending } = useIdeas();
  const { data: notesData, isPending: notesPending } = useNotes();
  const { data: knowledgePickData, isPending: knowledgePickPending } =
    useKnowledgeItemsPickList();
  const ideasById = useMemo(() => {
    const list = ideasData ?? [];
    return new Map(list.map((i) => [i.id, i]));
  }, [ideasData]);
  const notesById = useMemo(() => {
    const list = notesData ?? [];
    return new Map(list.map((n) => [n.id, n]));
  }, [notesData]);
  const knowledgeById = useMemo(() => {
    const list = knowledgePickData ?? [];
    return new Map(list.map((k) => [k.id, k]));
  }, [knowledgePickData]);
  const ideasLibraryHref = useLocalizedPath("/ideas");
  const notesLibraryHref = useLocalizedPath("/notes");
  const knowledgeLibraryHref = useLocalizedPath("/knowledge-base");
  const { data: templates = [] } = useScheduleTemplates();
  const createTemplate = useCreateScheduleTemplate();
  const deleteTemplate = useDeleteScheduleTemplate();
  const { data: gcalStatus } = useGoogleCalendarPlannerStatus();
  const { data: taskSyncMap } = useGoogleCalendarTaskSyncForDate(dateStr);
  const [googleSyncBusy, setGoogleSyncBusy] = useState(false);
  const gcalPushPending = usePlannerGcalPushPending();
  const plannerGcalLastPushIso = usePlannerGcalLastPushAt(dateStr);

  const gcalSilentPullGuardsRef = useRef({
    upsertPending: false,
    pushPending: false,
    manualSync: false,
  });

  useLayoutEffect(() => {
    gcalSilentPullGuardsRef.current = {
      upsertPending: upsertPlan.isPending,
      pushPending: gcalPushPending,
      manualSync: googleSyncBusy,
    };
  }, [upsertPlan.isPending, gcalPushPending, googleSyncBusy]);

  const taskSyncStatusByPlannerId = useMemo(() => {
    const out: Record<string, string> = {};
    if (!taskSyncMap) return out;
    for (const [pid, row] of Object.entries(taskSyncMap)) {
      out[pid] = row.sync_status;
    }
    return out;
  }, [taskSyncMap]);

  const lastSilentCalendarPullRef = useRef(0);

  useEffect(() => {
    if (!gcalStatus?.connected || !gcalStatus.syncEnabled) return;
    if (hasDevLoginBypassCookie()) return;

    const pull = async () => {
      const g = gcalSilentPullGuardsRef.current;
      if (g.upsertPending || g.pushPending || g.manualSync) return;
      const now = Date.now();
      if (now - lastSilentCalendarPullRef.current < 10_000) return;
      lastSilentCalendarPullRef.current = now;
      try {
        const res = await fetch("/api/google/calendar/sync-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planDate: dateStr }),
          credentials: "include",
        });
        if (!res.ok) return;
        await queryClient.invalidateQueries({ queryKey: ["daily-plans", dateStr] });
        await queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
        await queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: ["google-calendar-task-sync", dateStr] });
      } catch {
        /* ignore */
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVis);
    const intervalId = window.setInterval(() => void pull(), 120_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(intervalId);
    };
  }, [gcalStatus?.connected, gcalStatus?.syncEnabled, mode, dateStr, queryClient]);

  // ── sync server → local on plan load or date change ──
  useEffect(() => {
    if (plan) {
      setTasks((plan.tasks ?? []).map(withUid));
      setFreeTasks(plan.free_tasks ?? []);
      setMode(plan.mode ?? "time-block");
      setStartTime(plan.start_time ?? DEFAULT_PLAN_START_TIME);
      setEndTime(plan.end_time ?? DEFAULT_PLAN_END_TIME);
      const img = plan.schedule_image_url ?? null;
      setScheduleImageUrl(img);
      scheduleImageUrlRef.current = img;
    } else {
      setTasks([]);
      setFreeTasks([]);
      setMode("time-block");
      setStartTime(DEFAULT_PLAN_START_TIME);
      setEndTime(DEFAULT_PLAN_END_TIME);
      setScheduleImageUrl(null);
      scheduleImageUrlRef.current = null;
    }
  }, [plan, dateStr]);

  // ── auto-save (debounced) ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const savePlan = useCallback(
    (t: LocalPlanTask[], st: string, et: string) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        upsertPlan.mutate({
          plan_date: dateStr,
          start_time: st,
          end_time: et,
          // strip client-only `_uid` before persistence
          tasks: persistTasks(t),
          schedule_image_url: scheduleImageUrlRef.current,
        });
      }, 600);
    },
    [dateStr, upsertPlan],
  );

  /**
   * Persists Free Plan tasks without touching the Time Block list. The repository's upsert
   * is partial (it only writes the keys we send), so the time-block side of the row is preserved.
   */
  const saveFreePlan = useCallback(
    (next: FreePlanTask[], st: string, et: string) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        upsertPlan.mutate({
          plan_date: dateStr,
          start_time: st,
          end_time: et,
          free_tasks: next,
          schedule_image_url: scheduleImageUrlRef.current,
        });
      }, 600);
    },
    [dateStr, upsertPlan],
  );

  /** Skip debounce: persist Time Block rows immediately (faster Google Calendar push). */
  const flushTimeBlockPlan = useCallback(
    async (nextTasks: LocalPlanTask[], st: string, et: string) => {
      clearTimeout(saveTimerRef.current);
      await upsertPlan.mutateAsync({
        plan_date: dateStr,
        start_time: st,
        end_time: et,
        tasks: persistTasks(nextTasks),
        schedule_image_url: scheduleImageUrlRef.current,
      });
    },
    [dateStr, upsertPlan],
  );

  /** Immediate (non-debounced) write of just the active mode — toggles should feel instant. */
  const persistMode = useCallback(
    (next: PlanningMode, st: string, et: string) => {
      upsertPlan.mutate({
        plan_date: dateStr,
        start_time: st,
        end_time: et,
        mode: next,
        schedule_image_url: scheduleImageUrlRef.current,
      });
    },
    [dateStr, upsertPlan],
  );

  const updateTasks = useCallback(
    (next: LocalPlanTask[]) => {
      setTasks(next);
      savePlan(next, startTime, endTime);
    },
    [savePlan, startTime, endTime],
  );

  const updateFreeTasks = useCallback(
    (next: FreePlanTask[]) => {
      setFreeTasks(next);
      saveFreePlan(next, startTime, endTime);
    },
    [saveFreePlan, startTime, endTime],
  );

  const handleModeChange = useCallback(
    (next: PlanningMode) => {
      if (next === mode) return;
      setMode(next);
      persistMode(next, startTime, endTime);
    },
    [mode, persistMode, startTime, endTime],
  );

  const handleStartTimeChange = useCallback(
    (v: string) => {
      setStartTime(v);
      // Save through whichever bucket is active — the other bucket is left untouched.
      if (mode === "free") {
        saveFreePlan(freeTasks, v, endTime);
      } else {
        clearTimeout(saveTimerRef.current);
        void flushTimeBlockPlan(tasks, v, endTime);
      }
    },
    [mode, saveFreePlan, flushTimeBlockPlan, tasks, freeTasks, endTime],
  );

  const handleEndTimeChange = useCallback(
    (v: string) => {
      setEndTime(v);
      if (mode === "free") {
        saveFreePlan(freeTasks, startTime, v);
      } else {
        clearTimeout(saveTimerRef.current);
        void flushTimeBlockPlan(tasks, startTime, v);
      }
    },
    [mode, saveFreePlan, flushTimeBlockPlan, tasks, freeTasks, startTime],
  );

  // ── per-row presentation metadata for the sortable list ──
  // Computing this here keeps the row component purely presentational and
  // avoids re-running formatTime12/fmtBlocks on every drag tick.
  const taskMeta = useMemo<TaskMeta[]>(() => {
    const startMin = parseTimeToMinutes(startTime);
    // Pre-compute the cumulative minute offset that precedes each row so the
    // .map below stays a pure function (no mutated outer accumulator).
    const offsets: number[] = new Array(tasks.length);
    let acc = 0;
    for (let i = 0; i < tasks.length; i++) {
      offsets[i] = acc;
      acc += (tasks[i].blocks ?? 1) * blockMinutes;
    }
    return tasks.map((t, i) => {
      const blocks = t.blocks ?? 1;
      const taskStart = startMin + offsets[i];
      const taskEnd = taskStart + blocks * blockMinutes;
      return {
        color: getColor(i),
        blocks,
        durationLabel: fmtBlocks(blocks),
        timeRangeLabel: `${formatTime12(taskStart)} – ${formatTime12(taskEnd)}`,
      };
    });
  }, [tasks, startTime, blockMinutes, fmtBlocks, formatTime12]);

  // ── resolved planning range (handles cross-midnight) ──
  const planRange = useMemo(
    () => resolvePlanRange(startTime, endTime),
    [startTime, endTime],
  );

  // ── summary ──
  const summary = useMemo(() => {
    const totalBlocks = tasks.reduce((s, t) => s + (t.blocks ?? 0), 0);
    const plannedMin = totalBlocks * blockMinutes;
    const availableMin = planRange.durationMin;
    const remainingMin = availableMin - plannedMin;
    return { totalBlocks, plannedMin, availableMin, remainingMin };
  }, [tasks, planRange.durationMin, blockMinutes]);

  /**
   * Human-readable description of the loose planning window for Free Mode. Cross-day plans
   * include both calendar dates so users see clearly when the boundary spills past midnight.
   */
  const freePlanningWindowLabel = useMemo(() => {
    const startLabel = formatTime12(planRange.startMin);
    const endLabel = formatTime12(planRange.endMin);
    if (planRange.endDayOffset === 0) {
      return copy.freePlanningWindowSameDay(startLabel, endLabel);
    }
    const startDateLabel = format(selectedDate, "MMM d", { locale: dateLocale });
    const endDateLabel = format(addDays(selectedDate, planRange.endDayOffset), "MMM d", {
      locale: dateLocale,
    });
    return copy.freePlanningWindowCrossDay(
      startDateLabel,
      startLabel,
      endDateLabel,
      endLabel,
    );
  }, [
    copy,
    dateLocale,
    formatTime12,
    planRange.startMin,
    planRange.endMin,
    planRange.endDayOffset,
    selectedDate,
  ]);

  // ── dialogs ──
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<"save" | "load">("save");
  const [createAiDialogOpen, setCreateAiDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailIndex, setDetailIndex] = useState(-1);

  // ── ritual ──
  const [ritualOpen, setRitualOpen] = useState(false);
  const [ritualTaskName, setRitualTaskName] = useState("");

  // ── quick tasks (custom or default) ──
  const [addQuickTaskOpen, setAddQuickTaskOpen] = useState(false);
  const [newQuickName, setNewQuickName] = useState("");
  const [newQuickBlocks, setNewQuickBlocks] = useState(3);
  const [quickIconsBusy, setQuickIconsBusy] = useState(false);

  const quickTaskDefs = useMemo<
    {
      name: string;
      icon: LucideIcon;
      blocks: number;
      iconClass: string;
      iconSrc?: string;
      iconRasterFallback?: string;
    }[]
  >(() => {
    const custom = normalizeQuickTasksJson(profile?.quick_tasks);
    if (custom && custom.length > 0) {
      return custom.map((qt) => {
        const key = resolveQuickTaskIconKey(qt.name, qt.icon);
        const raster = resolveQuickTaskRaster(qt);
        return {
          name: qt.name,
          icon: QUICK_TASK_ICON_MAP[key] ?? Sparkles,
          blocks: qt.blocks,
          iconClass: qt.iconClass,
          iconSrc: raster.primary,
          iconRasterFallback: raster.fallback,
        };
      });
    }
    return BUILTIN_QUICK_TASK_DEFS.map((qt) => {
      const name = copy[qt.nameKey];
      const raster = resolveQuickTaskRaster({ name, presetKey: qt.presetKey });
      return {
        name,
        icon: qt.icon,
        blocks: qt.blocks,
        iconClass: qt.iconClass,
        iconSrc: raster.primary,
        iconRasterFallback: raster.fallback,
      };
    });
  }, [profile?.quick_tasks, copy]);

  const handleDeleteQuickTask = useCallback(
    (index: number) => {
      const current: QuickTaskDef[] =
        normalizeQuickTasksJson(profile?.quick_tasks) ??
        BUILTIN_QUICK_TASK_DEFS.map((qt) => ({
          name: copy[qt.nameKey],
          icon: lucideIconToQuickTaskKey(qt.icon),
          blocks: qt.blocks,
          iconClass: qt.iconClass,
          presetKey: qt.presetKey,
        }));
      const removed = current[index];
      const next = current.filter((_, i) => i !== index);
      updateProfile.mutate({ quick_tasks: next.length > 0 ? next : null });
      if (removed) toast.success(copy.quickTaskToastDeleted(removed.name));
    },
    [profile?.quick_tasks, copy, updateProfile],
  );

  const handleAddQuickTask = useCallback(() => {
    const trimmed = newQuickName.trim();
    if (!trimmed) return;
    const current: QuickTaskDef[] =
      normalizeQuickTasksJson(profile?.quick_tasks) ??
      BUILTIN_QUICK_TASK_DEFS.map((qt) => ({
        name: copy[qt.nameKey],
        icon: lucideIconToQuickTaskKey(qt.icon),
        blocks: qt.blocks,
        iconClass: qt.iconClass,
        presetKey: qt.presetKey,
      }));
    const colors = [
      "text-amber-700 dark:text-amber-300",
      "text-emerald-700 dark:text-emerald-300",
      "text-rose-700 dark:text-rose-300",
      "text-sky-700 dark:text-sky-300",
      "text-violet-700 dark:text-violet-300",
      "text-indigo-700 dark:text-indigo-300",
      "text-teal-700 dark:text-teal-300",
      "text-orange-700 dark:text-orange-300",
    ];
    const next: QuickTaskDef[] = [
      ...current,
      {
        name: trimmed,
        icon: inferQuickTaskIconKey(trimmed),
        blocks: newQuickBlocks,
        iconClass: colors[current.length % colors.length],
        presetKey: null,
        iconUrl: null,
      },
    ];
    updateProfile.mutate({ quick_tasks: next });
    toast.success(copy.quickTaskToastAdded(trimmed));
    setNewQuickName("");
    setNewQuickBlocks(3);
    setAddQuickTaskOpen(false);

    void (async () => {
      try {
        const res = await fetch("/api/quick-tasks/generate-icon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskLabel: trimmed }),
        });
        const data = (await res.json()) as { iconUrl?: string; error?: string };
        if (!res.ok || !data.iconUrl) return;
        const merged = next.map((t) =>
          t.name === trimmed ? { ...t, iconUrl: data.iconUrl! } : t,
        );
        await settingsRepository.updateProfile({ quick_tasks: merged });
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
      } catch {
        /* optional AI icon */
      }
    })();
  }, [newQuickName, newQuickBlocks, profile?.quick_tasks, copy, updateProfile, queryClient]);

  const handleBackfillQuickIcons = useCallback(async () => {
    setQuickIconsBusy(true);
    try {
      let seeded = normalizeQuickTasksJson(profile?.quick_tasks);
      if (!seeded || seeded.length === 0) {
        seeded = BUILTIN_QUICK_TASK_DEFS.map((qt) => ({
          name: copy[qt.nameKey],
          icon: lucideIconToQuickTaskKey(qt.icon),
          blocks: qt.blocks,
          iconClass: qt.iconClass,
          presetKey: qt.presetKey,
          iconUrl: null,
        }));
        await settingsRepository.updateProfile({ quick_tasks: seeded });
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
      }

      const res = await fetch("/api/quick-tasks/backfill-icons", { method: "POST" });
      const data = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "backfill failed");
        return;
      }
      const n = typeof data.updated === "number" ? data.updated : 0;
      toast.success(copy.quickTaskAiIconsToastDone(n));
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      toast.error("backfill failed");
    } finally {
      setQuickIconsBusy(false);
    }
  }, [profile, copy, queryClient]);

  // ── add task helper ──
  // In Free Mode the same entry points (Quick Add, AI Create, Import) drop tasks straight
  // into the Free Plan's `should` bucket — no block count, no time slot, no friction.
  const addTask = useCallback(
    (name: string, blocks: number, taskId?: string) => {
      if (mode === "free") {
        const order = freeTasks.filter((t) => t.priority === "should").length;
        const nextFree: FreePlanTask[] = [
          ...freeTasks,
          {
            id: `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            title: name,
            priority: "should",
            order,
            taskId,
            // `blocks` from the time-block flow is repurposed as a non-binding effort estimate.
            estimatedMinutes: blocks > 0 ? blocks * blockMinutes : undefined,
          },
        ];
        setFreeTasks(nextFree);
        saveFreePlan(nextFree, startTime, endTime);
        return;
      }
      const next: LocalPlanTask[] = [
        ...tasks,
        { taskName: name, blocks, taskId, order: tasks.length, _uid: newUid() },
      ];
      setTasks(next);
      void flushTimeBlockPlan(next, startTime, endTime);
    },
    [mode, tasks, freeTasks, saveFreePlan, startTime, endTime, blockMinutes, flushTimeBlockPlan],
  );

  // ── quick add ──
  const handleQuickAdd = useCallback(
    (name: string, blocks: number) => {
      addTask(name, blocks);
    },
    [addTask],
  );

  // ── import tasks ──
  const handleImportTasks = useCallback(
    (taskIds: string[]) => {
      if (mode === "free") {
        const baseOrder = freeTasks.filter((t) => t.priority === "should").length;
        const importedFree: FreePlanTask[] = taskIds
          .map((id, i) => {
            const t = allTasks.find((at) => at.id === id);
            if (!t) return null;
            const desc = t.description?.trim();
            return {
              id: `f-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
              title: t.title,
              taskId: t.id,
              priority: "should" as const,
              order: baseOrder + i,
              notes: desc ? stripHtml(desc) : undefined,
              estimatedMinutes: t.estimated_blocks
                ? t.estimated_blocks * blockMinutes
                : undefined,
            };
          })
          .filter(Boolean) as FreePlanTask[];
        const nextFree = [...freeTasks, ...importedFree];
        setFreeTasks(nextFree);
        saveFreePlan(nextFree, startTime, endTime);
        setImportDialogOpen(false);
        toast.success(copy.toastImported(importedFree.length));
        return;
      }
      const imported: LocalPlanTask[] = taskIds
        .map((id) => {
          const t = allTasks.find((at) => at.id === id);
          if (!t) return null;
          return {
            taskName: t.title,
            taskId: t.id,
            blocks: t.estimated_blocks ?? 3,
            order: tasks.length,
            _uid: newUid(),
          } as LocalPlanTask;
        })
        .filter(Boolean) as LocalPlanTask[];
      updateTasks([...tasks, ...imported]);
      setImportDialogOpen(false);
      toast.success(copy.toastImported(imported.length));
    },
    [
      mode,
      allTasks,
      tasks,
      freeTasks,
      updateTasks,
      saveFreePlan,
      startTime,
      endTime,
      blockMinutes,
      copy,
    ],
  );

  // ── AI suggestions ──
  const handleGetAiSuggestions = useCallback(() => {
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      setAiDialogOpen(true);
    }, 1000);
  }, []);

  const handleAddAiTask = useCallback(
    (_taskId: string | undefined, title: string, blocks: number) => {
      addTask(title, blocks);
      toast.success(copy.toastAdded(title));
    },
    [addTask, copy],
  );

  // ── reorder ──
  // The new SortableTaskList computes the reordered list itself (via dnd-kit's
  // arrayMove) and hands the whole array back. We just persist it.
  const handleReorder = useCallback(
    (next: LocalPlanTask[]) => {
      updateTasks(next);
    },
    [updateTasks],
  );

  // ── change blocks ──
  const handleChangeBlocks = useCallback(
    (index: number, delta: number) => {
      const next = [...tasks];
      const current = next[index].blocks ?? 1;
      next[index] = { ...next[index], blocks: Math.max(1, current + delta) };
      updateTasks(next);
    },
    [tasks, updateTasks],
  );

  // ── delete ──
  const handleDelete = useCallback(
    (index: number) => {
      updateTasks(tasks.filter((_, i) => i !== index));
    },
    [tasks, updateTasks],
  );

  // ── ritual ──
  const handleRitual = useCallback(
    (index: number) => {
      setRitualTaskName(
        tasks[index]?.taskName ?? copy.defaultPlannerTaskName,
      );
      setRitualOpen(true);
    },
    [tasks, copy],
  );

  // ── task click → detail ──
  const handleTaskClick = useCallback(
    (index: number) => {
      const t = tasks[index];
      if (!t?.taskId) {
        toast.info(copy.toastNoQuickDetails);
        return;
      }
      const full = allTasks.find((at) => at.id === t.taskId);
      if (!full) {
        toast.info(copy.toastTaskNotFound);
        return;
      }
      setDetailTask(full);
      setDetailIndex(index);
      setDetailDialogOpen(true);
    },
    [tasks, allTasks, copy],
  );

  // ── move to tomorrow ──
  const handleMoveToTomorrow = useCallback(async () => {
    if (detailIndex < 0) return;
    const taskToMove = tasks[detailIndex];
    const remaining = tasks.filter((_, i) => i !== detailIndex);
    updateTasks(remaining);

    const tomorrowTasks = [
      ...(tomorrowPlan?.tasks ?? []),
      persistTask(taskToMove, tomorrowPlan?.tasks?.length ?? 0),
    ];
    await upsertPlan.mutateAsync({
      plan_date: tomorrowStr,
      start_time: tomorrowPlan?.start_time ?? DEFAULT_PLAN_START_TIME,
      end_time: tomorrowPlan?.end_time ?? DEFAULT_PLAN_END_TIME,
      tasks: tomorrowTasks.map((t, i) => ({ ...t, order: i })),
      schedule_image_url: tomorrowPlan?.schedule_image_url ?? null,
    });

    setDetailDialogOpen(false);
    toast.success(copy.toastMovedTomorrow);
  }, [detailIndex, tasks, tomorrowPlan, tomorrowStr, upsertPlan, updateTasks, copy]);

  // ── templates ──
  const handleSaveTemplate = useCallback(
    async (name: string) => {
      await createTemplate.mutateAsync({ name, tasks });
      setTemplateDialogOpen(false);
    },
    [createTemplate, tasks],
  );

  const handleLoadTemplate = useCallback(
    (template: ScheduleTemplate) => {
      if (
        tasks.length > 0 &&
        !window.confirm(copy.confirmLoadTemplate)
      )
        return;
      updateTasks(template.tasks.map(withUid));
      setTemplateDialogOpen(false);
      toast.success(copy.toastTemplateLoaded(template.name));
    },
    [tasks, updateTasks, copy],
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      await deleteTemplate.mutateAsync(id);
    },
    [deleteTemplate],
  );

  const handleCalendarSyncNow = useCallback(async () => {
    const hasWork =
      mode === "free" ? freeTasks.length > 0 : tasks.length > 0;
    if (!hasWork) {
      toast.message(copy.toastGoogleNoTasks);
      return;
    }
    if (hasDevLoginBypassCookie()) {
      toast.message(copy.toastGoogleNeedRealSession);
      return;
    }
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.message(copy.toastGoogleNeedSignIn);
      return;
    }
    setGoogleSyncBusy(true);
    try {
      if (mode === "time-block") {
        await flushTimeBlockPlan(tasks, startTime, endTime);
      } else {
        clearTimeout(saveTimerRef.current);
        await upsertPlan.mutateAsync({
          plan_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          free_tasks: freeTasks,
          mode: "free",
          schedule_image_url: scheduleImageUrlRef.current,
        });
      }
      const res = await fetch("/api/google/calendar/sync-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate: dateStr }),
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        localPushed?: number;
        remoteApplied?: number;
        remoteFetched?: number;
        conflicts?: number;
        processed?: number;
        error?: string;
        syncedAt?: string;
      };
      if (!res.ok) {
        throw new Error(j.error || `sync_failed_${res.status}`);
      }
      if (typeof j.syncedAt === "string") {
        setPlannerGcalLastPushAt(dateStr, j.syncedAt);
      }
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-planner-status"] });
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-task-sync", dateStr] });
      await queryClient.invalidateQueries({ queryKey: ["daily-plans", dateStr] });
      await queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
      await queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      toast.success(
        copy.toastGoogleCalendarSyncNowOk({
          localPushed: Number(j.localPushed ?? 0),
          remoteApplied: Number(j.remoteApplied ?? j.processed ?? 0),
          remoteFetched: Number(j.remoteFetched ?? 0),
          conflicts: Number(j.conflicts ?? 0),
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.toastGoogleCalendarSyncNowFailed);
    } finally {
      setGoogleSyncBusy(false);
    }
  }, [
    mode,
    tasks,
    freeTasks,
    startTime,
    endTime,
    copy,
    queryClient,
    dateStr,
    flushTimeBlockPlan,
    upsertPlan,
  ]);

  const plannerGcalPushSpinning =
    googleSyncBusy || gcalPushPending || (mode === "time-block" && upsertPlan.isPending);
  const lastGcalStamp =
    plannerGcalLastPushIso != null
      ? format(parseISO(plannerGcalLastPushIso), "yyyy-MM-dd HH:mm:ss")
      : null;

  /* ────────────── RENDER ────────────── */

  return (
    <PlannerLocaleContext.Provider value={plannerLocale}>
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={<Link href={calendarAiPlanHref} />}
          >
            <Sparkles className="h-4 w-4" />
            {calendarCopy.backToAIPlan}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetAiSuggestions}
            disabled={aiLoading}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {aiLoading ? copy.aiThinking : copy.aiSuggestions}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              {copy.templates}
              <ChevronDown className="h-3 w-3 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setTemplateMode("save");
                  setTemplateDialogOpen(true);
                }}
              >
                {copy.saveAsTemplate}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTemplateMode("load");
                  setTemplateDialogOpen(true);
                }}
              >
                {copy.loadTemplate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-6 pb-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4rem))] md:pb-0">
      {/* ─── Date & Time Card ─── */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {/* Date navigation + actions */}
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 items-stretch gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label={copy.ariaPreviousDay}
                onClick={() => setSelectedDate((d) => subDays(d, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg border border-border/70 bg-muted/25 px-2 py-2.5 text-center">
                <span className="hidden text-sm font-semibold leading-snug sm:inline">
                  {format(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
                </span>
                <span className="text-xs font-semibold leading-snug sm:hidden">
                  {format(selectedDate, "EEE, MMM d, yyyy", { locale: dateLocale })}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label={copy.ariaNextDay}
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <MiniCalendarPopover
                  selectedDate={selectedDate}
                  onSelect={(d) => setSelectedDate(d)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedDate(new Date())}
                >
                  {copy.today}
                </Button>
                <PlanningModeToggle
                  value={mode}
                  onChange={handleModeChange}
                  ariaLabel={copy.modeToggleAriaLabel}
                  timeBlockLabel={copy.modeTimeBlock}
                  freeLabel={copy.modeFree}
                />
              </div>
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <Button
                size="sm"
                className="relative h-9 w-full shrink-0 gap-2 border-transparent bg-violet-600 text-white shadow-sm hover:bg-violet-700 sm:w-auto"
                onClick={() => void handleCalendarSyncNow()}
                disabled={plannerGcalPushSpinning}
              >
                {plannerGcalPushSpinning ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <CalendarSync className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="truncate">
                  {plannerGcalPushSpinning
                    ? copy.googleCalendarSyncingNowButton
                    : copy.googleCalendarSyncNowButton}
                </span>
              </Button>
              {lastGcalStamp ? (
                <p className="max-w-[18rem] text-[10px] leading-snug text-muted-foreground text-right tabular-nums">
                  {copy.googleCalendarLastUpdatedLabel(lastGcalStamp)}
                </p>
              ) : null}
              {mode === "time-block" && gcalStatus?.connected && gcalStatus.syncEnabled ? (
                <p className="max-w-[18rem] text-[10px] leading-snug text-muted-foreground text-right">
                  {copy.googleCalendarServerSyncHint}
                </p>
              ) : null}
            </div>
            </div>
          </div>

          <Separator />

          {/* Time pickers */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-xl">
            <TimeWheelPicker
              label={copy.startTime}
              value={startTime}
              onChange={handleStartTimeChange}
            />
            <div className="min-w-0 space-y-1">
              <TimeWheelPicker
                label={copy.endTime}
                value={endTime}
                onChange={handleEndTimeChange}
                hint={
                  planRange.endDayOffset > 0
                    ? copy.crossesIntoDayLabel(
                        format(
                          addDays(selectedDate, planRange.endDayOffset),
                          "EEEE, MMMM d",
                          { locale: dateLocale },
                        ),
                      )
                    : undefined
                }
              />
              {mode === "time-block" && gcalStatus?.connected && gcalStatus.syncEnabled ? (
                <p className="text-[11px] leading-snug text-emerald-800/90 dark:text-emerald-200/90">
                  {copy.googleCalendarConnectedAccountHint(gcalStatus.email ?? null)}
                </p>
              ) : null}
            </div>
          </div>

          {mode === "time-block" && (upsertPlan.isPending || gcalPushPending) ? (
            <div
              className="flex items-center gap-2 text-[12px] text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              <span>{copy.googleCalendarSaveAndSyncLoading}</span>
            </div>
          ) : null}

          <Separator />

          {mode === "free" ? (
            /* Free Mode: replace the time-budget tiles with a calm Planning Window caption */
            <div className="space-y-1.5 rounded-xl border border-border/50 bg-card/30 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.freePlanningWindowLabel}
              </p>
              <p className="text-sm font-semibold tabular-nums leading-snug text-foreground">
                {freePlanningWindowLabel}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground/85">
                {copy.freePlanningWindowHelper}
              </p>
            </div>
          ) : (
          /* Time budget — three icon tiles */
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <TimeSummaryCard
              title={copy.available}
              value={fmtBlocks(
                Math.max(0, Math.floor(summary.availableMin / blockMinutes)),
              )}
              icon={<CalendarClock className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />}
              iconClassName="bg-violet-500/20 text-violet-200 ring-1 ring-violet-300/25"
              backgroundImage="/images/daily-planner/available.png"
            />
            <TimeSummaryCard
              title={copy.planned}
              value={fmtBlocks(summary.totalBlocks)}
              icon={<ListChecks className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />}
              iconClassName="bg-sky-500/20 text-sky-200 ring-1 ring-sky-300/25"
              backgroundImage="/images/daily-planner/planned.png"
              glassIntensity="medium"
            />
            <TimeSummaryCard
              title={copy.remaining}
              value={
                <>
                  {summary.remainingMin < 0 && "⚠ "}
                  {summary.remainingMin < 0 ? copy.overBy : ""}
                  {fmtBlocks(
                    Math.abs(Math.floor(summary.remainingMin / blockMinutes)),
                  )}
                </>
              }
              icon={<Hourglass className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />}
              iconClassName={cn(
                "ring-1",
                summary.remainingMin < 0
                  ? "bg-red-500/20 text-red-200 ring-red-300/25"
                  : "bg-emerald-500/20 text-emerald-200 ring-emerald-300/25",
              )}
              valueClassName={cn(
                summary.remainingMin < 0
                  ? "text-red-200"
                  : "text-emerald-200",
              )}
              backgroundImage="/images/daily-planner/remaining.png"
            />
          </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Main grid (Time Block mode only) ─── */}
      {mode === "time-block" && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Task Builder ─── */}
        <Card>
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="text-base">{copy.taskBuilder}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button
                size="sm"
                className="h-9 w-full shrink-0 gap-2 border-transparent bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-sm hover:from-fuchsia-500 hover:to-pink-500 sm:flex-1"
                onClick={() => setCreateAiDialogOpen(true)}
              >
                <Wand2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{copy.createTaskWithAi}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full shrink-0 gap-2 border-2 border-cyan-500/70 bg-background text-cyan-950 hover:bg-cyan-50 dark:border-cyan-400/55 dark:text-cyan-50 dark:hover:bg-cyan-950/35 sm:flex-1"
                onClick={() => setImportDialogOpen(true)}
              >
                <FolderInput className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{copy.importFromTasks}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick add grid */}
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.quickAdd}
                </Label>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="gap-1 text-xs h-7"
                    disabled={quickIconsBusy}
                    onClick={() => void handleBackfillQuickIcons()}
                  >
                    {quickIconsBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">{copy.quickTaskAiIcons}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-xs h-7"
                    onClick={() => setAddQuickTaskOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    {copy.quickTaskAddNew}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pb-1 sm:pb-0">
                {quickTaskDefs.map((qt, idx) => (
                  <QuickTaskButton
                    key={`${qt.name}-${idx}-${qt.iconSrc ?? ""}-${qt.iconRasterFallback ?? ""}`}
                    task={qt}
                    onAdd={(blocks) => handleQuickAdd(qt.name, blocks)}
                    onDelete={() => handleDeleteQuickTask(idx)}
                  />
                ))}
              </div>
            </div>

            {/* Add Quick Task Dialog */}
            <Dialog open={addQuickTaskOpen} onOpenChange={setAddQuickTaskOpen}>
              <DialogContent size="sm">
                <DialogHeader>
                  <DialogTitle>{copy.quickTaskAddDialogTitle}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">{copy.quickTaskNameLabel}</Label>
                    <Input
                      value={newQuickName}
                      onChange={(e) => setNewQuickName(e.target.value)}
                      placeholder={copy.quickTaskNamePlaceholder}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddQuickTask();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{copy.quickTaskBlocksLabel}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={newQuickBlocks}
                      onChange={(e) => setNewQuickBlocks(Math.max(1, Number(e.target.value)))}
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      {fmtBlocks(newQuickBlocks)}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAddQuickTaskOpen(false)}>
                      {copy.cancel}
                    </Button>
                    <Button size="sm" onClick={handleAddQuickTask} disabled={!newQuickName.trim()}>
                      {copy.add}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Separator />

            {/* Task list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  {copy.yourPlan(tasks.length)}
                </Label>
                <Badge variant="secondary" className="text-[10px]">
                  {summary.totalBlocks} {copy.blocksLabel} ·{" "}
                  {fmtBlocks(summary.totalBlocks)}
                </Badge>
              </div>

              {tasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {copy.noTasksYet}
                </div>
              ) : (
                <SortableTaskList
                  tasks={tasks}
                  meta={taskMeta}
                  isMobile={isMobile}
                  copy={copy}
                  taskSyncStatusByPlannerId={taskSyncStatusByPlannerId}
                  onReorder={handleReorder}
                  onChangeBlocks={handleChangeBlocks}
                  onDelete={handleDelete}
                  onRitual={handleRitual}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Timeline + visual schedule ─── */}
        <div className="space-y-6">
          <VisualScheduleGenerator
            copy={copy}
            planDate={dateStr}
            startTime={startTime}
            endTime={endTime}
            tasks={tasks}
            blockMinutes={blockMinutes}
            imageUrl={scheduleImageUrl}
            onImageUrlChange={(url) => {
              setScheduleImageUrl(url);
              scheduleImageUrlRef.current = url;
            }}
            onPersistImageUrl={async (url) => {
              scheduleImageUrlRef.current = url;
              await upsertPlan.mutateAsync({
                plan_date: dateStr,
                start_time: startTime,
                end_time: endTime,
                tasks: persistTasks(tasks),
                schedule_image_url: url,
              });
            }}
          />
          <TimelineView
            startTime={startTime}
            endTime={endTime}
            endDayOffset={planRange.endDayOffset}
            nextDayBadge={copy.nextDayBadge}
            tasks={tasks}
            selectedDate={selectedDate}
            allTasks={allTasks}
            blockMinutes={blockMinutes}
            taskSyncStatusByPlannerId={taskSyncStatusByPlannerId}
            plannerCopy={copy}
            scheduleTitle={copy.timelineTitle(
              format(selectedDate, "MMMM d, yyyy", {
                locale: dateLocale,
              }),
            )}
            formatTime12={formatTime12}
            fmtBlocks={fmtBlocks}
            untitledTask={copy.untitledTask}
            taskCardBlockCount={copy.taskCardBlockCount}
            onTaskClick={(planTask) => {
              const idx = tasks.findIndex(
                (t) =>
                  t.taskName === planTask.taskName &&
                  t.order === planTask.order,
              );
              if (idx >= 0) handleTaskClick(idx);
            }}
          />
        </div>
      </div>
      )}

      {/* ─── Free Planning board (Free mode only) ─── */}
      {/* Single-column flow on every breakpoint: each priority section gets the full content
       *  width so long task names breathe instead of compressing into 4 narrow ribbons.
       *  The Free Plan Summary lives at the bottom as a recap, not a competing right rail. */}
      {mode === "free" && (
        <div className="space-y-6">
          <FreePlanBoard
            copy={copy}
            tasks={freeTasks}
            onChange={updateFreeTasks}
            secondaryActions={
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 flex-1 gap-2 border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15 dark:text-fuchsia-100"
                  onClick={() => setCreateAiDialogOpen(true)}
                >
                  <Wand2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{copy.createTaskWithAi}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 flex-1 gap-2 border-cyan-400/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15 dark:text-cyan-100"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <FolderInput className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{copy.importFromTasks}</span>
                </Button>
              </>
            }
          />
          <FreePlanSummary
            copy={copy}
            tasks={freeTasks}
            windowLabel={freePlanningWindowLabel}
          />
        </div>
      )}

      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          aria-label={copy.ariaBackToTop}
          onClick={() => {
            const opts: ScrollToOptions = { top: 0, behavior: "smooth" };
            // Long pages often scroll the document: the inset `main` grows with
            // content so it has no internal overflow. Shorter viewports may scroll
            // the layout `main` instead — cover both.
            const layoutMain = document.querySelector(
              "main.flex-1.overflow-auto",
            );
            if (layoutMain instanceof HTMLElement) {
              layoutMain.scrollTo(opts);
            }
            window.scrollTo(opts);
          }}
        >
          <ArrowUp className="h-4 w-4" />
          {copy.backToTop}
        </Button>
      </div>

      {/* ─── Dialogs ─── */}

      <CreatePlannerTaskAiDialog
        open={createAiDialogOpen}
        onOpenChange={setCreateAiDialogOpen}
        locale={language}
        copy={copy}
        blockMinutes={blockMinutes}
        onAddToPlan={(name, blocks, taskId) => {
          addTask(name, blocks, taskId);
        }}
      />

      {/* Task Detail */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent size="lg" className="min-w-0">
          <DialogHeader>
            <DialogTitle>{copy.detailDialogTitle}</DialogTitle>
          </DialogHeader>
          {detailTask && (() => {
            const isAi = detailTask.source === "ai:gemini";
            const descRaw = detailTask.description ?? "";
            const descSections = descRaw.split("\n\n").filter(Boolean);
            const mainDesc: string[] = [];
            const remindersList: string[] = [];
            const notesList: string[] = [];
            const knowledgeList: string[] = [];
            const ideasList: string[] = [];
            let userNotes = "";
            for (const section of descSections) {
              if (/^Reminders:\n/i.test(section)) {
                const lines = section.split("\n").slice(1);
                for (const l of lines) {
                  const cleaned = l.replace(/^-\s*/, "").trim();
                  if (cleaned) remindersList.push(cleaned);
                }
              } else if (/^Notes:\n/i.test(section)) {
                userNotes = section.replace(/^Notes:\n/i, "").trim();
              } else if (/^Related notes:/i.test(section)) {
                notesList.push(...section.replace(/^Related notes:\s*/i, "").split(",").map(s => s.trim()).filter(Boolean));
              } else if (/^Related knowledge:/i.test(section)) {
                knowledgeList.push(...section.replace(/^Related knowledge:\s*/i, "").split(",").map(s => s.trim()).filter(Boolean));
              } else if (/^Related ideas:/i.test(section)) {
                ideasList.push(...section.replace(/^Related ideas:\s*/i, "").split(",").map(s => s.trim()).filter(Boolean));
              } else {
                mainDesc.push(section);
              }
            }
            const displayTags = (detailTask.tags ?? []).filter(
              (t) => !t.startsWith("note:") && !t.startsWith("knowledge:") && !t.startsWith("idea:")
            );

            return (
              <div className="max-h-[72vh] min-w-0 space-y-4 overflow-y-auto overflow-x-hidden pr-1 pb-1">
                {/* Title + AI badge */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <p className="text-base font-semibold leading-snug">{detailTask.title}</p>
                    {isAi && (
                      <Badge className="shrink-0 border-pink-400/60 bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
                        <Sparkles className="mr-1 h-3 w-3" />
                        {copy.detailAiGenerated}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" />
                    {detailTask.priority}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    {detailTask.status}
                  </Badge>
                  {detailTask.project?.name && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {detailTask.project.name}
                    </Badge>
                  )}
                  {detailTask.due_date && (
                    <Badge variant="outline" className="gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {copy.detailDuePrefix}{" "}
                      {format(new Date(detailTask.due_date), "MMM d, yyyy", {
                        locale: dateLocale,
                      })}
                    </Badge>
                  )}
                </div>

                {/* Time estimate */}
                {detailTask.estimated_blocks ? (
                  <p className="text-sm text-muted-foreground">
                    {copy.detailEstimatedPrefix} {detailTask.estimated_blocks}{" "}
                    {copy.blocksLabel} · {fmtBlocks(detailTask.estimated_blocks)}
                  </p>
                ) : null}

                {/* Description */}
                {mainDesc.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {copy.detailDescription}
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                        {mainDesc.join("\n\n")}
                      </p>
                    </div>
                  </div>
                )}

                {/* User notes */}
                {userNotes && (
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <NotebookPen className="h-3.5 w-3.5" />
                      Notes
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{userNotes}</p>
                    </div>
                  </div>
                )}

                {/* Reminders */}
                {remindersList.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {copy.detailReminders}
                    </p>
                    <ul className="space-y-1.5">
                      {remindersList.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                          <span className="break-words">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related items */}
                {(notesList.length > 0 || knowledgeList.length > 0 || ideasList.length > 0) && (
                  <div className="space-y-3 rounded-xl border border-violet-200/50 bg-violet-50/30 p-3 dark:border-violet-400/20 dark:bg-violet-500/8">
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-violet-500" />
                      {copy.reviewSmartLinks}
                    </p>
                    {notesList.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{copy.detailRelatedNotes}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {notesList.map((id) => {
                            const note = notesById.get(id);
                            const label = smartLinkNoteDisplayLabel(note, notesPending, copy);
                            const href = note
                              ? `${notesLibraryHref}?note=${encodeURIComponent(id)}`
                              : undefined;
                            const badge = (
                              <Badge
                                variant="outline"
                                className="max-w-[min(100%,280px)] border-violet-400/50 text-xs font-normal"
                              >
                                <span className="truncate">{label}</span>
                              </Badge>
                            );
                            return href ? (
                              <Link
                                key={id}
                                href={href}
                                className="inline-flex max-w-full min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {badge}
                              </Link>
                            ) : (
                              <span key={id} className="inline-flex max-w-full min-w-0">
                                {badge}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {knowledgeList.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{copy.detailRelatedKnowledge}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {knowledgeList.map((id) => {
                            const row = knowledgeById.get(id);
                            const label = smartLinkKnowledgeDisplayLabel(row, knowledgePickPending, copy);
                            const href = row
                              ? `${knowledgeLibraryHref}?item=${encodeURIComponent(id)}`
                              : undefined;
                            const badge = (
                              <Badge
                                variant="outline"
                                className="max-w-[min(100%,280px)] border-amber-400/50 text-xs font-normal"
                              >
                                <span className="truncate">{label}</span>
                              </Badge>
                            );
                            return href ? (
                              <Link
                                key={id}
                                href={href}
                                className="inline-flex max-w-full min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {badge}
                              </Link>
                            ) : (
                              <span key={id} className="inline-flex max-w-full min-w-0">
                                {badge}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {ideasList.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{copy.detailRelatedIdeas}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ideasList.map((id) => {
                            const idea = ideasById.get(id);
                            const label = smartLinkIdeaDisplayLabel(idea, ideasPending, copy);
                            const href = idea
                              ? `${ideasLibraryHref}?idea=${encodeURIComponent(id)}`
                              : undefined;
                            const badge = (
                              <Badge
                                variant="outline"
                                className="max-w-[min(100%,280px)] border-cyan-400/50 text-xs font-normal"
                              >
                                <span className="truncate">{label}</span>
                              </Badge>
                            );
                            return href ? (
                              <Link
                                key={id}
                                href={href}
                                className="inline-flex max-w-full min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {badge}
                              </Link>
                            ) : (
                              <span key={id} className="inline-flex max-w-full min-w-0">
                                {badge}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Source link */}
                {detailTask.source_url && (
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      {copy.detailSource}
                    </p>
                    <a
                      href={detailTask.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate text-blue-600 underline-offset-4 hover:underline dark:text-blue-400">
                        {copy.detailSourceLink}
                      </span>
                    </a>
                  </div>
                )}

                {/* Tags */}
                {displayTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {displayTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailDialogOpen(false)}
                  >
                    {copy.detailClose}
                  </Button>
                  <Button size="sm" onClick={handleMoveToTomorrow}>
                    {copy.detailMoveTomorrow}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Import Tasks */}
      <ImportTasksDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportTasks}
        tasks={allTasks}
        copy={copy}
      />

      {/* AI Suggestions */}
      <AISuggestionsDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        recommendations={mockAi.recommendations}
        planningTip={mockAi.planningTip}
        onAddTask={handleAddAiTask}
        copy={copy}
        blockMinutes={blockMinutes}
      />

      {/* Template Dialog */}
      <TemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        mode={templateMode}
        templates={templates}
        currentPlan={{ tasks }}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        copy={copy}
      />

      {/* Pre-task Ritual */}
      <PreTaskRitualModal
        open={ritualOpen}
        onOpenChange={setRitualOpen}
        taskTitle={ritualTaskName}
        copy={ritualCopy}
        onBeginTask={() => toast.success(copy.toastFocusActivated)}
      />
      </div>
    </PageShell>
    </PlannerLocaleContext.Provider>
  );
}
