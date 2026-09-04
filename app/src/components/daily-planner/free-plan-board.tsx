"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListChecks,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { FreePlanTaskDetailSheet } from "@/components/daily-planner/free-plan-task-detail-sheet";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/html";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { FreePlanTask } from "@/types/database";

function notePreviewText(notes: string | undefined): string {
  const trimmed = notes?.trim();
  if (!trimmed) return "";
  return stripHtml(trimmed);
}

const PRIORITIES: ReadonlyArray<FreePlanTask["priority"]> = [
  "must",
  "should",
  "could",
  "done",
];

/** Per-bucket accent — kept restrained so the surfaces stay Liquid Glass, not rainbow kanban. */
const PRIORITY_ACCENT: Record<FreePlanTask["priority"], string> = {
  must: "from-rose-400/30 via-rose-300/0 to-transparent",
  should: "from-amber-300/30 via-amber-200/0 to-transparent",
  could: "from-sky-300/25 via-sky-200/0 to-transparent",
  done: "from-emerald-400/25 via-emerald-300/0 to-transparent",
};

const PRIORITY_DOT: Record<FreePlanTask["priority"], string> = {
  must: "bg-rose-400/80 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]",
  should: "bg-amber-300/85 shadow-[0_0_0_3px_rgba(252,211,77,0.18)]",
  could: "bg-sky-300/80 shadow-[0_0_0_3px_rgba(125,211,252,0.18)]",
  done: "bg-emerald-400/80 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]",
};

/** Prefix for column-level droppable ids; lets onDragEnd distinguish "drop on column" from "drop on task". */
const COLUMN_DROPPABLE_PREFIX = "free-col:";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `f-${crypto.randomUUID()}`;
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function priorityLabel(copy: DailyPlannerUiCopy, p: FreePlanTask["priority"]): string {
  switch (p) {
    case "must":
      return copy.freePriorityMust;
    case "should":
      return copy.freePriorityShould;
    case "could":
      return copy.freePriorityCould;
    case "done":
      return copy.freePriorityDone;
  }
}

/* ─────────────────────── drag-end resolver ─────────────────────── */

/**
 * Computes the next task list after a drag-end. The over-id is either:
 *   - a task id  → insert active before that task (swap into its slot)
 *   - a column id (`free-col:<priority>`) → append active to the end of that column
 *
 * Cross-section drops re-tag the active task with the destination priority. The parent
 * `commitTasks` re-numbers each bucket so we don't need to be exact about `order` here.
 */
export function applyDragMove(
  tasks: FreePlanTask[],
  activeId: string,
  overId: string,
): FreePlanTask[] | null {
  if (activeId === overId) return null;
  const active = tasks.find((t) => t.id === activeId);
  if (!active) return null;

  let targetSection: FreePlanTask["priority"];
  let beforeId: string | null;

  if (overId.startsWith(COLUMN_DROPPABLE_PREFIX)) {
    targetSection = overId.slice(COLUMN_DROPPABLE_PREFIX.length) as FreePlanTask["priority"];
    beforeId = null;
  } else {
    const over = tasks.find((t) => t.id === overId);
    if (!over) return null;
    targetSection = over.priority;
    beforeId = over.id;
  }

  if (active.priority === targetSection && beforeId !== null) {
    const section = tasks
      .filter((task) => task.priority === targetSection)
      .sort((a, b) => a.order - b.order);
    const oldIndex = section.findIndex((task) => task.id === activeId);
    const newIndex = section.findIndex((task) => task.id === beforeId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;

    const movedSection = arrayMove(section, oldIndex, newIndex).map(
      (task, order) => ({ ...task, order }),
    );
    return [
      ...tasks.filter((task) => task.priority !== targetSection),
      ...movedSection,
    ];
  }

  // Build target-section list excluding the active task, sorted by current order.
  const others = tasks.filter((t) => t.id !== activeId);
  const destList = others
    .filter((t) => t.priority === targetSection)
    .sort((a, b) => a.order - b.order);
  const insertIdx =
    beforeId === null
      ? destList.length
      : (() => {
          const idx = destList.findIndex((t) => t.id === beforeId);
          return idx < 0 ? destList.length : idx;
        })();
  const repositioned: FreePlanTask = {
    ...active,
    priority: targetSection,
    order: insertIdx,
  };
  destList.splice(insertIdx, 0, repositioned);
  const reorderedDestination = destList.map((task, order) => ({ ...task, order }));

  // No-op guard: same section + already at this index.
  if (
    active.priority === targetSection &&
    tasks
      .filter((t) => t.priority === targetSection)
      .sort((a, b) => a.order - b.order)
      .findIndex((t) => t.id === activeId) === insertIdx
  ) {
    return null;
  }

  const otherSections = others.filter((t) => t.priority !== targetSection);
  return [...otherSections, ...reorderedDestination];
}

/* ─────────────────────────── DnD overlay drop animation ─────────────────────────── */

const SOFT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const dropAnimation: DropAnimation = {
  duration: 240,
  easing: SOFT_EASE,
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0" } },
  }),
};

/* ──────────────────────────────── component ──────────────────────────────── */

export interface FreePlanBoardProps {
  copy: DailyPlannerUiCopy;
  tasks: FreePlanTask[];
  onChange: (next: FreePlanTask[]) => void;
  /** Optional secondary actions slot (Create Task with AI / Import from Tasks). */
  secondaryActions?: React.ReactNode;
  onStartFocus?: (task: FreePlanTask) => void;
}

/**
 * Free Planning task surface.
 *
 * Quick-capture bar + four vertically-stacked priority sections. Tasks support full
 * cross-section drag-and-drop via dnd-kit (mouse / trackpad / touch / keyboard) plus
 * keyboard-friendly Up/Down arrow buttons and a priority dropdown for non-drag users.
 */
export function FreePlanBoard({
  copy,
  tasks,
  onChange,
  secondaryActions,
  onStartFocus,
}: FreePlanBoardProps) {
  const prefersReduced = useReducedMotion();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [showDraftNotes, setShowDraftNotes] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const dragJustEndedRef = useRef(false);

  const buckets = useMemo(() => {
    const grouped: Record<FreePlanTask["priority"], FreePlanTask[]> = {
      must: [],
      should: [],
      could: [],
      done: [],
    };
    for (const t of tasks) grouped[t.priority].push(t);
    for (const p of PRIORITIES) {
      grouped[p].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [tasks]);

  const completedCount = buckets.done.length;
  const mustCount = buckets.must.length;
  const totalCount = tasks.length;

  const selectedTask = useMemo(
    () =>
      selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null,
    [selectedTaskId, tasks],
  );

  const commitTasks = useCallback(
    (next: FreePlanTask[]) => {
      // Re-number each bucket so `order` stays dense, then flatten in priority order.
      const grouped: Record<FreePlanTask["priority"], FreePlanTask[]> = {
        must: [],
        should: [],
        could: [],
        done: [],
      };
      for (const t of next) grouped[t.priority].push(t);
      const flat: FreePlanTask[] = [];
      for (const p of PRIORITIES) {
        grouped[p]
          .sort((a, b) => a.order - b.order)
          .forEach((t, i) => flat.push({ ...t, order: i }));
      }
      onChange(flat);
    },
    [onChange],
  );

  /* ─── quick capture ─── */

  const submitDraft = useCallback(
    (keepFocus: boolean) => {
      const title = draftTitle.trim();
      if (!title) return;
      const order = buckets.should.length;
      const next: FreePlanTask = {
        id: newId(),
        title,
        priority: "should",
        order,
        notes: draftNotes.trim() || undefined,
      };
      commitTasks([...tasks, next]);
      setDraftTitle("");
      setDraftNotes("");
      setShowDraftNotes(false);
      if (keepFocus) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [draftTitle, draftNotes, tasks, buckets.should.length, commitTasks],
  );

  const handleQuickAddKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const keepFocus = e.metaKey || e.ctrlKey;
      submitDraft(keepFocus);
    },
    [submitDraft],
  );

  const handleDraftNotesKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const keepFocus = true;
        submitDraft(keepFocus);
        return;
      }
    },
    [submitDraft],
  );

  /* ─── per-task mutations (clicks, not drags) ─── */

  const handleSetPriority = useCallback(
    (id: string, priority: FreePlanTask["priority"]) => {
      const next = tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              priority,
              order: Number.MAX_SAFE_INTEGER,
            }
          : t,
      );
      commitTasks(next);
    },
    [tasks, commitTasks],
  );

  const handleToggleDone = useCallback(
    (task: FreePlanTask) => {
      const nextPriority: FreePlanTask["priority"] =
        task.priority === "done" ? "should" : "done";
      handleSetPriority(task.id, nextPriority);
    },
    [handleSetPriority],
  );

  const handleDelete = useCallback(
    (id: string) => {
      commitTasks(tasks.filter((t) => t.id !== id));
    },
    [tasks, commitTasks],
  );

  const handleSaveTaskDetails = useCallback(
    (updatedTask: FreePlanTask) => {
      commitTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setSelectedTaskId(null);
    },
    [tasks, commitTasks],
  );

  const handleDeleteFromDetail = useCallback(
    (id: string) => {
      handleDelete(id);
      setSelectedTaskId(null);
    },
    [handleDelete],
  );

  const handleMoveWithinBucket = useCallback(
    (id: string, delta: -1 | 1) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;
      const list = buckets[target.priority];
      const idx = list.findIndex((t) => t.id === id);
      const swapIdx = idx + delta;
      if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;
      const next = tasks.map((t) => {
        if (t.id === list[idx].id) return { ...t, order: list[swapIdx].order };
        if (t.id === list[swapIdx].id) return { ...t, order: list[idx].order };
        return t;
      });
      commitTasks(next);
    },
    [tasks, buckets, commitTasks],
  );

  /* ─── dnd-kit ─── */

  const sensors = useSensors(
    // Small distance threshold so a click on the grip doesn't accidentally start a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so users can still scroll the page near a task without dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) ?? null : null),
    [activeId, tasks],
  );

  const handleOpenTask = useCallback(
    (id: string) => {
      if (activeId || dragJustEndedRef.current) return;
      setSelectedTaskId(id);
    },
    [activeId],
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      dragJustEndedRef.current = true;
      requestAnimationFrame(() => {
        dragJustEndedRef.current = false;
      });
      const { active, over } = e;
      if (!over) return;
      const next = applyDragMove(tasks, String(active.id), String(over.id));
      if (next) commitTasks(next);
    },
    [tasks, commitTasks],
  );

  return (
    <div className="space-y-4">
      {/* Quick capture — the primary action of Free Planning Mode */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <GlassPanel
          variant="strong"
          className="relative overflow-hidden p-4 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {copy.freeQuickCaptureHeading}
                </p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {copy.freeQuickCaptureBlurb}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  ref={inputRef}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={handleQuickAddKey}
                  placeholder={copy.freeQuickCapturePlaceholder}
                  className="h-11 min-h-11 flex-1 rounded-xl bg-background/60 backdrop-blur-sm"
                  aria-label={copy.freeQuickCaptureHeading}
                />
                <Button
                  size="sm"
                  className="h-11 min-h-11 shrink-0 rounded-xl px-5"
                  onClick={() => submitDraft(false)}
                  disabled={!draftTitle.trim()}
                >
                  {copy.freeQuickCaptureSubmit}
                </Button>
              </div>
              {draftTitle.trim() && !showDraftNotes ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 min-h-11 rounded-xl px-3 text-[12px] text-muted-foreground"
                  onClick={() => {
                    setShowDraftNotes(true);
                    requestAnimationFrame(() => notesRef.current?.focus());
                  }}
                >
                  {copy.freeTaskAddNotes}
                </Button>
              ) : null}
              {showDraftNotes ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="free-quick-notes" className="text-[12px]">
                      {copy.freeTaskNotesLabel}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 min-h-11 rounded-xl px-3 text-[11px] text-muted-foreground"
                      onClick={() => {
                        setShowDraftNotes(false);
                        setDraftNotes("");
                      }}
                    >
                      {copy.freeTaskHideNotes}
                    </Button>
                  </div>
                  <Textarea
                    id="free-quick-notes"
                    ref={notesRef}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    onKeyDown={handleDraftNotesKey}
                    placeholder={copy.freeTaskNotesPlaceholder}
                    rows={3}
                    className="min-h-[4.5rem] resize-y bg-background/60 backdrop-blur-sm"
                  />
                </div>
              ) : null}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground/80">
              {copy.freeQuickCaptureKeyboardHint}
            </p>
            {secondaryActions ? (
              <>
                <Separator className="bg-border/40" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  {secondaryActions}
                </div>
              </>
            ) : null}
          </div>
        </GlassPanel>
      </motion.div>

      {/* Stats row — task-based, not time-based */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        <StatTile
          icon={<ListChecks className="h-4 w-4" />}
          tone="violet"
          label={copy.freeStatCaptured}
          value={String(totalCount)}
          sublabel={copy.freeBoardSummary(totalCount, completedCount)}
        />
        <StatTile
          icon={<Sparkles className="h-4 w-4" />}
          tone="amber"
          label={copy.freePriorityMust}
          value={String(mustCount)}
          sublabel={copy.freeBoardMustSummary(mustCount)}
        />
        <StatTile
          icon={<Check className="h-4 w-4" />}
          tone="emerald"
          label={copy.freePriorityDone}
          value={String(completedCount)}
          sublabel={`${completedCount} / ${totalCount || 0}`}
        />
      </motion.div>

      {/* Priority sections — vertical stack, full content width.
       *  All four columns share a single DndContext so tasks can be dragged across sections. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3 sm:space-y-4">
          {PRIORITIES.map((priority, index) => (
            <motion.div
              key={priority}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.05 + index * 0.05,
                ease: "easeOut",
              }}
            >
              <FreePriorityColumn
                copy={copy}
                priority={priority}
                tasks={buckets[priority]}
                activeId={activeId}
                onSetPriority={handleSetPriority}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
                onMoveWithinBucket={handleMoveWithinBucket}
                onOpenTask={handleOpenTask}
                onStartFocus={onStartFocus}
              />
            </motion.div>
          ))}
        </div>
        {typeof document === "undefined"
          ? null
          : createPortal(
              <DragOverlay
                dropAnimation={prefersReduced ? null : dropAnimation}
                zIndex={60}
                style={{ pointerEvents: "none" }}
              >
                {activeTask ? (
                  <FreeTaskCardShell
                    copy={copy}
                    task={activeTask}
                    isFirst
                    isLast
                    onSetPriority={() => undefined}
                    onToggleDone={() => undefined}
                    onDelete={() => undefined}
                    onMoveWithinBucket={() => undefined}
                    onOpenTask={undefined}
                    onStartFocus={undefined}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )}
      </DndContext>

      <FreePlanTaskDetailSheet
        copy={copy}
        task={selectedTask}
        open={selectedTaskId != null}
        onOpenChange={(o) => {
          if (!o) setSelectedTaskId(null);
        }}
        onSave={handleSaveTaskDetails}
        onDelete={handleDeleteFromDetail}
        onStartFocus={onStartFocus}
      />
    </div>
  );
}

/* ─────────────────────────── stat tile ─────────────────────────── */

function StatTile({
  icon,
  tone,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  tone: "violet" | "amber" | "emerald";
  label: string;
  value: string;
  sublabel: string;
}) {
  const toneClass =
    tone === "violet"
      ? "bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
      : tone === "amber"
        ? "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
        : "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200";
  return (
    <GlassPanel className="px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10",
            toneClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
            {value}
          </p>
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground/90">
            {sublabel}
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

/* ─────────────────────────── priority column ─────────────────────────── */

function FreePriorityColumn({
  copy,
  priority,
  tasks,
  activeId,
  onSetPriority,
  onToggleDone,
  onDelete,
  onMoveWithinBucket,
  onOpenTask,
  onStartFocus,
}: {
  copy: DailyPlannerUiCopy;
  priority: FreePlanTask["priority"];
  tasks: FreePlanTask[];
  activeId: string | null;
  onSetPriority: (id: string, priority: FreePlanTask["priority"]) => void;
  onToggleDone: (task: FreePlanTask) => void;
  onDelete: (id: string) => void;
  onMoveWithinBucket: (id: string, delta: -1 | 1) => void;
  onOpenTask: (id: string) => void;
  onStartFocus?: (task: FreePlanTask) => void;
}) {
  const label = priorityLabel(copy, priority);
  const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);
  /** Column-level droppable so empty sections (and the area below the last task) accept drops. */
  const { setNodeRef, isOver } = useDroppable({
    id: `${COLUMN_DROPPABLE_PREFIX}${priority}`,
  });
  /** Hide the active card's "ghost" if it currently lives in this section. */
  const dragSourceIsHere = activeId
    ? tasks.some((t) => t.id === activeId)
    : false;

  return (
    <GlassPanel
      className={cn(
        "relative h-full overflow-hidden p-4 sm:p-5 transition-[box-shadow,border-color] duration-200 ease-out",
        priority === "done" && "opacity-95",
        // Soft highlight while a task is hovering this section as a drop target.
        isOver &&
          !dragSourceIsHere &&
          "ring-1 ring-foreground/15 [box-shadow:0_0_0_1px_var(--border-glass-strong),0_0_28px_-12px_rgba(255,255,255,0.35)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b",
          PRIORITY_ACCENT[priority],
        )}
        aria-hidden
      />
      <div className="relative space-y-3 sm:space-y-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[priority])}
              aria-hidden
            />
            <p className="truncate text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
              {label}
            </p>
          </div>
          <span className="rounded-full border border-border/50 bg-card/40 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </header>

        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              "space-y-2 sm:space-y-2.5",
              tasks.length === 0 && "min-h-[5.5rem]",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {tasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <SortableFreeTaskCard
                    copy={copy}
                    task={task}
                    isFirst={idx === 0}
                    isLast={idx === tasks.length - 1}
                    onSetPriority={onSetPriority}
                    onToggleDone={onToggleDone}
                    onDelete={onDelete}
                    onMoveWithinBucket={onMoveWithinBucket}
                    onOpenTask={onOpenTask}
                    onStartFocus={onStartFocus}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {tasks.length === 0 ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-5 text-center text-[12px] text-muted-foreground/80 transition-[background-color,border-color] duration-200",
                  isOver &&
                    "border-foreground/35 bg-foreground/[0.05] text-foreground/80",
                )}
              >
                {copy.freeBoardEmpty(label)}
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </GlassPanel>
  );
}

/* ─────────────────────────── task card (sortable wrapper) ─────────────────────────── */

interface FreeTaskCardCommonProps {
  copy: DailyPlannerUiCopy;
  task: FreePlanTask;
  isFirst: boolean;
  isLast: boolean;
  onSetPriority: (id: string, priority: FreePlanTask["priority"]) => void;
  onToggleDone: (task: FreePlanTask) => void;
  onDelete: (id: string) => void;
  onMoveWithinBucket: (id: string, delta: -1 | 1) => void;
  onOpenTask?: (id: string) => void;
  onStartFocus?: (task: FreePlanTask) => void;
}

function SortableFreeTaskCard(props: FreeTaskCardCommonProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <FreeTaskCardShell
      {...props}
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleRef={setActivatorNodeRef}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

/* ─────────────────────────── task card (visual chrome) ─────────────────────────── */

type DragHandleProps = React.HTMLAttributes<HTMLButtonElement> & {
  // dnd-kit augments these but they're typed as plain HTMLAttributes.
  role?: string;
  tabIndex?: number;
};

interface FreeTaskCardShellProps extends FreeTaskCardCommonProps {
  ref?: React.Ref<HTMLDivElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandleRef?: (node: HTMLElement | null) => void;
  dragHandleProps?: DragHandleProps;
}

function FreeTaskCardShell({
  ref,
  style,
  copy,
  task,
  isFirst,
  isLast,
  isDragging,
  isOverlay,
  dragHandleRef,
  dragHandleProps,
  onSetPriority,
  onToggleDone,
  onDelete,
  onMoveWithinBucket,
  onOpenTask,
  onStartFocus,
}: FreeTaskCardShellProps) {
  const isDone = task.priority === "done";
  const preview = notePreviewText(task.notes);
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:py-3 backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-200 ease-out",
        "hover:border-white/20 hover:bg-white/[0.07]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        // Source card fades while its DragOverlay copy follows the pointer.
        isDragging && !isOverlay && "opacity-30",
        // Lifted overlay version — soft scale + stronger shadow so it reads as "above".
        isOverlay &&
          "border-white/20 bg-white/[0.08] [box-shadow:0_18px_44px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] scale-[1.02]",
      )}
    >
      {/* Drag handle — the only six-dot icon in the row. dnd-kit listeners attach here only,
       *  so action buttons inside the card never accidentally start a drag. */}
      <button
        ref={dragHandleRef}
        type="button"
        aria-label={copy.ariaHoldToReorder}
        {...dragHandleProps}
        className={cn(
          "-my-1.5 -ml-2 flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 transition-colors duration-150 hover:text-muted-foreground motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "active:cursor-grabbing touch-none",
          isOverlay && "cursor-grabbing",
        )}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      {/* Completion checkbox — tap target sized for touch */}
      <button
        type="button"
        aria-label={isDone ? copy.freeChangePriority : copy.freePriorityDone}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        disabled={isOverlay}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          isDone
            ? "border-emerald-400/70 bg-emerald-400/30 text-emerald-50"
            : "border-border/60 bg-background/40 text-transparent hover:border-foreground/40",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      {/* Title + notes preview — click opens detail sheet; drag stays on handle only. */}
      <button
        type="button"
        disabled={isOverlay || !onOpenTask}
        onClick={() => onOpenTask?.(task.id)}
        aria-label={copy.freeTaskOpenDetails(task.title)}
        className={cn(
          "min-w-0 flex-1 pr-1 text-left",
          "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          onOpenTask && !isOverlay && "cursor-pointer",
        )}
      >
        <p
          className={cn(
            "break-words text-[14px] leading-relaxed sm:text-[15px]",
            isDone ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </p>
        {preview ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground/75">
            {preview}
          </p>
        ) : null}
        {task.estimatedMinutes ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            <Label className="text-[11px]">{copy.detailEstimatedPrefix}</Label>{" "}
            ~{task.estimatedMinutes}{" "}
            {copy.formatMinutes(task.estimatedMinutes).split(" ").slice(-1)[0]}
          </p>
        ) : null}
      </button>

      {/* Action cluster: Up arrow · Down arrow · Section switcher · Trash.
       *  All chevrons here are arrows (move actions); no six-dot icons. */}
      <div className="flex shrink-0 items-center gap-1">
        {onStartFocus ? (
          <button
            type="button"
            aria-label={copy.startFocus}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-500/15 hover:text-emerald-800 disabled:opacity-30 dark:text-emerald-300 dark:hover:text-emerald-200"
            disabled={isOverlay}
            onClick={(e) => {
              e.stopPropagation();
              onStartFocus(task);
            }}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={copy.ariaHoldToReorder + " (up)"}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30 sm:flex"
          disabled={isFirst || isOverlay}
          onClick={(e) => {
            e.stopPropagation();
            onMoveWithinBucket(task.id, -1);
          }}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={copy.ariaHoldToReorder + " (down)"}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30 sm:flex"
          disabled={isLast || isOverlay}
          onClick={(e) => {
            e.stopPropagation();
            onMoveWithinBucket(task.id, 1);
          }}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>

        {/* Section switcher: shows current priority dot + caret; opens dropdown of the four sections */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isOverlay}
            render={
              <button
                type="button"
                aria-label={copy.freeChangePriority}
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border/40 bg-background/40 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              />
            }
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])}
              aria-hidden
            />
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[8rem]">
            {PRIORITIES.map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => onSetPriority(task.id, p)}
                className={cn(
                  "text-xs",
                  p === task.priority && "font-semibold text-primary",
                )}
              >
                <span
                  className={cn(
                    "mr-2 h-2 w-2 shrink-0 rounded-full",
                    PRIORITY_DOT[p],
                  )}
                  aria-hidden
                />
                {priorityLabel(copy, p)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          aria-label={copy.freeRemoveTask}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          disabled={isOverlay}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
