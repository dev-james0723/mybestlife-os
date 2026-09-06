"use client";

/**
 * SortableTaskList — drag-and-drop reorderable list for the Daily Planner.
 *
 * Gesture arbitration (mobile/iPad):
 *   the card body keeps `touch-action: pan-y` for native page scrolling and
 *   horizontal swipe actions. Dragging lives exclusively on a dedicated handle
 *   with `touch-action: none`, so a deliberate hold can never compete with the
 *   page scroller or the card's swipe state machine.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Minus,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DailyPlanTask } from "@/types/database";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { PlannerGoogleSyncDot } from "@/components/daily-planner/PlannerGoogleSyncDot";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { moveTimeBlockTask } from "@/lib/daily-planner/reorder-time-block-tasks";

/* ────────────────────────────── types ────────────────────────────── */

export type LocalPlanTask = DailyPlanTask & { _uid?: string };

export interface TaskMeta {
  color: string;
  blocks: number;
  durationLabel: string;
  timeRangeLabel: string;
}

interface SortableTaskListProps {
  tasks: LocalPlanTask[];
  meta: TaskMeta[];
  isMobile: boolean;
  copy: DailyPlannerUiCopy;
  /** Optional `plannerTaskId` → Google Calendar `sync_status` for subtle row indicators. */
  taskSyncStatusByPlannerId?: Record<string, string>;
  onReorder: (next: LocalPlanTask[]) => void;
  onChangeBlocks: (index: number, delta: number) => void;
  onDelete: (index: number) => void;
  onRitual: (index: number) => void;
  onTaskClick: (index: number) => void;
  onStartFocus?: (index: number) => void;
}

/* ─────────────────────── swipe panel constants ─────────────────────── */

/** 4 action buttons × 36px each. Matches Apple Mail-like proportions. */
const MOBILE_SWIPE_PANEL_PX = 144;
const MOBILE_SWIPE_ACTION_W = MOBILE_SWIPE_PANEL_PX / 4;
/** Past this many px of reveal, release will snap fully open. */
const MOBILE_SWIPE_OPEN_SNAP_PX = MOBILE_SWIPE_PANEL_PX * 0.4; // ~58px
/** Velocity (px/ms) above which a flick snaps in the flick direction. */
const SWIPE_FLICK_VELOCITY = 0.45;

/* ─────────── gesture thresholds (the heart of arbitration) ─────────── */

/** First-byte direction commitment: any axis past this locks the gesture.
 *  Kept small so the card responds to the user's finger almost immediately
 *  — combined with the start-X re-anchoring on commit (see touchMove),
 *  this means there's no visible "pause then jump" at threshold crossing. */
const DIRECTION_LOCK_PX = 4;
/** Horizontal swipe commit (must be < TouchSensor tolerance to win the race). */
const HORIZONTAL_COMMIT_PX = 4;
/** Dedicated handle activation: deliberate on touch, responsive with a mouse. */
const TOUCH_DRAG_DELAY_MS = 250;
const TOUCH_DRAG_TOLERANCE_PX = 8;
const MOUSE_DRAG_DISTANCE_PX = 5;

/* ───────────────────── motion / animation tuning ───────────────────── */

const SOFT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SWIPE_MS = 220;
const LIFT_MS = 180;
const DROP_MS = 210;

const dropAnimation: DropAnimation = {
  duration: DROP_MS,
  easing: SOFT_EASE,
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0" } },
  }),
};

/** Lock the drag overlay to the vertical axis — no horizontal drift. */
const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/* ─────────────────── stop-drag wrapper for buttons ─────────────────── */

function stopDragActivation<E extends Element>(
  e:
    | ReactPointerEvent<E>
    | ReactTouchEvent<E>
    | React.MouseEvent<E>
    | React.KeyboardEvent<E>,
) {
  e.stopPropagation();
}

function startedFromDragHandle(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-drag-handle]") !== null;
}

/* ════════════════════════════ component ════════════════════════════ */

export function SortableTaskList({
  tasks,
  meta,
  isMobile,
  copy,
  taskSyncStatusByPlannerId,
  onReorder,
  onChangeBlocks,
  onDelete,
  onRitual,
  onTaskClick,
  onStartFocus,
}: SortableTaskListProps) {
  const reduceMotion = useReducedMotion();
  const ids = useMemo(
    () =>
      tasks.map(
        (t, i) => t.plannerTaskId ?? t._uid ?? `dp-row-${i}`,
      ),
    [tasks],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  /** id of the single row whose swipe panel is currently open (or null). */
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const activeIndex = activeId ? ids.indexOf(activeId) : -1;
  const activeTask = activeIndex >= 0 ? tasks[activeIndex] : null;
  const activeMeta = activeIndex >= 0 ? meta[activeIndex] : null;

  // Mouse and touch have separate sensors so a touch pointer cannot be claimed
  // by the desktop sensor before TouchSensor's hold delay. Both activators are
  // attached only to the dedicated handle below.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY_MS,
        tolerance: TOUCH_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    // Drag starting on any row dismisses any open swipe panel.
    setOpenRowId(null);
  }, []);

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(moveTimeBlockTask(tasks, oldIndex, newIndex));
    },
    [ids, tasks, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[lockToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={{
        threshold: { x: 0, y: 0.18 },
        acceleration: 12,
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul
          className="space-y-1.5 list-none p-0 m-0"
          aria-label={copy.yourPlan(tasks.length)}
        >
          {tasks.map((task, i) => (
            <SortableRow
              key={ids[i]}
              id={ids[i]}
              index={i}
              task={task}
              meta={meta[i]}
              isMobile={isMobile}
              copy={copy}
              taskSyncStatusByPlannerId={taskSyncStatusByPlannerId}
              isActiveDrag={ids[i] === activeId}
              reduceMotion={reduceMotion}
              openRowId={openRowId}
              setOpenRowId={setOpenRowId}
              onChangeBlocks={onChangeBlocks}
              onDelete={onDelete}
              onRitual={onRitual}
              onTaskClick={onTaskClick}
              onStartFocus={onStartFocus}
            />
          ))}
        </ul>
      </SortableContext>

      {typeof document === "undefined"
        ? null
        : createPortal(
            <DragOverlay
              dropAnimation={reduceMotion ? null : dropAnimation}
              zIndex={60}
              style={{ pointerEvents: "none" }}
            >
              {activeTask && activeMeta ? (
                <LiftedCardOverlay
                  task={activeTask}
                  meta={activeMeta}
                  copy={copy}
                  isMobile={isMobile}
                  reduceMotion={reduceMotion}
                />
              ) : null}
            </DragOverlay>,
            document.body,
          )}
    </DndContext>
  );
}

/* ══════════════════════════ Sortable row ══════════════════════════ */

interface SortableRowProps {
  id: string;
  index: number;
  task: LocalPlanTask;
  meta: TaskMeta;
  isMobile: boolean;
  copy: DailyPlannerUiCopy;
  taskSyncStatusByPlannerId?: Record<string, string>;
  isActiveDrag: boolean;
  reduceMotion: boolean;
  openRowId: string | null;
  setOpenRowId: (id: string | null) => void;
  onChangeBlocks: (index: number, delta: number) => void;
  onDelete: (index: number) => void;
  onRitual: (index: number) => void;
  onTaskClick: (index: number) => void;
  onStartFocus?: (index: number) => void;
}

function SortableRow({
  id,
  index,
  task,
  meta,
  isMobile,
  copy,
  taskSyncStatusByPlannerId,
  isActiveDrag,
  reduceMotion,
  openRowId,
  setOpenRowId,
  onChangeBlocks,
  onDelete,
  onRitual,
  onTaskClick,
  onStartFocus,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id,
    transition: reduceMotion
      ? null
      : { duration: LIFT_MS, easing: SOFT_EASE },
  });

  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion
      ? undefined
      : transition ?? `transform ${LIFT_MS}ms ${SOFT_EASE}`,
  };

  return (
    <li
      ref={setNodeRef}
      style={sortableStyle}
      className="list-none"
      data-planner-task-id={task.plannerTaskId ?? id}
      data-dnd-state={isDragging ? "dragging" : isSorting ? "sorting" : "idle"}
      aria-label={
        task.taskName ? `${task.taskName}, ${meta.timeRangeLabel}` : copy.untitledTask
      }
    >
      <TaskRowContent
        rowId={id}
        index={index}
        task={task}
        meta={meta}
        isMobile={isMobile}
        copy={copy}
        taskSyncStatusByPlannerId={taskSyncStatusByPlannerId}
        presentation={isActiveDrag ? "placeholder" : "default"}
        dndListeners={listeners}
        dndAttributes={attributes}
        activatorRef={setActivatorNodeRef}
        reduceMotion={reduceMotion}
        isAnyDragging={isSorting}
        isThisDragging={isDragging}
        isOpen={openRowId === id}
        setOpenRowId={setOpenRowId}
        onChangeBlocks={onChangeBlocks}
        onDelete={onDelete}
        onRitual={onRitual}
        onTaskClick={onTaskClick}
        onStartFocus={onStartFocus}
      />
    </li>
  );
}

/* ════════════════════ TaskRowContent (the card) ════════════════════ */

type RowPresentation = "default" | "placeholder";
/** Per-row gesture state machine. */
type GestureMode = "idle" | "pressing" | "scrolling" | "swiping";

interface TaskRowContentProps {
  rowId: string;
  index: number;
  task: LocalPlanTask;
  meta: TaskMeta;
  isMobile: boolean;
  copy: DailyPlannerUiCopy;
  taskSyncStatusByPlannerId?: Record<string, string>;
  presentation: RowPresentation;
  dndListeners?: ReturnType<typeof useSortable>["listeners"];
  dndAttributes?: ReturnType<typeof useSortable>["attributes"];
  activatorRef?: (node: HTMLElement | null) => void;
  reduceMotion: boolean;
  isAnyDragging?: boolean;
  isThisDragging?: boolean;
  isOpen: boolean;
  setOpenRowId: (id: string | null) => void;
  onChangeBlocks: (index: number, delta: number) => void;
  onDelete: (index: number) => void;
  onRitual: (index: number) => void;
  onTaskClick: (index: number) => void;
  onStartFocus?: (index: number) => void;
}

function TaskRowContent({
  rowId,
  index,
  task,
  meta,
  isMobile,
  copy,
  taskSyncStatusByPlannerId,
  presentation,
  dndListeners,
  dndAttributes,
  activatorRef,
  reduceMotion,
  isAnyDragging,
  isThisDragging,
  isOpen,
  setOpenRowId,
  onChangeBlocks,
  onDelete,
  onRitual,
  onTaskClick,
  onStartFocus,
}: TaskRowContentProps) {
  const { color, blocks, durationLabel, timeRangeLabel } = meta;

  /* ───── swipe state (per-row) ───── */

  const [revealPx, setRevealPx] = useState(0);
  const revealLatestRef = useRef(0);
  useEffect(() => {
    revealLatestRef.current = revealPx;
  }, [revealPx]);

  // The full per-row gesture machine. Lives in a ref so it doesn't trigger
  // re-renders mid-touch.
  const gRef = useRef({
    mode: "idle" as GestureMode,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    velX: 0, // px/ms, positive = rightward
    baseReveal: 0,
  });
  /** Mirror of `mode === 'swiping'` for native (passive: false) listeners. */
  const horizontalActiveRef = useRef(false);
  /** When true, the next click on the card body is suppressed (post-swipe). */
  const skipNextClickRef = useRef(false);
  /** Animate transform with `none` while finger is tracking; spring on release. */
  const [animateTransform, setAnimateTransform] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  /* ─────── react to lifted state changes ─────── */

  // Parent says we're no longer the open row → spring closed.
  useEffect(() => {
    if (!isOpen && revealLatestRef.current !== 0) {
      revealLatestRef.current = 0;
      setRevealPx(0);
      setAnimateTransform(true);
    }
  }, [isOpen]);

  // dnd activated on this row → close panel without animation fight.
  useEffect(() => {
    if (isThisDragging && revealLatestRef.current !== 0) {
      revealLatestRef.current = 0;
      setRevealPx(0);
    }
  }, [isThisDragging]);

  /* ─────── outside-tap dismiss ─────── */

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (rowRef.current?.contains(e.target as Node)) return;
      setOpenRowId(null);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isMobile, isOpen, setOpenRowId]);

  /* ─────── non-passive touchmove for preventDefault during swipe ─────── */

  // Scrolling vs. horizontal swipe is decided in JS. While we're swiping we
  // must call preventDefault so the parent scroller does NOT also pan. The
  // React synthetic touchmove is passive in modern React, so we attach a
  // raw native listener that opts out of passive.
  useEffect(() => {
    if (!isMobile) return;
    const el = cardRef.current;
    if (!el) return;
    const onNativeTouchMove = (e: TouchEvent) => {
      if (horizontalActiveRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onNativeTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onNativeTouchMove);
  }, [isMobile]);

  /* ─────── touch handlers (state machine) ─────── */

  const handleCardTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      // TouchSensor owns handle gestures. Leaving the card gesture machine idle
      // prevents a long-press drag from also becoming a swipe or page scroll.
      if (startedFromDragHandle(e.target)) {
        gRef.current.mode = "idle";
        horizontalActiveRef.current = false;
        return;
      }
      // Multi-touch: bail out — never drag/swipe with 2+ fingers.
      if (e.touches.length > 1) {
        gRef.current.mode = "idle";
        horizontalActiveRef.current = false;
        return;
      }
      const t = e.touches[0];
      gRef.current = {
        mode: "pressing",
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastT: e.timeStamp,
        velX: 0,
        baseReveal: revealLatestRef.current,
      };
      horizontalActiveRef.current = false;
      setAnimateTransform(false); // 1:1 finger tracking once swipe commits
    },
    [isMobile],
  );

  const handleCardTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      const g = gRef.current;
      if (g.mode === "idle" || g.mode === "scrolling") return;
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      // Track instantaneous velocity for flick detection.
      const dt = Math.max(1, e.timeStamp - g.lastT);
      g.velX = (t.clientX - g.lastX) / dt;
      g.lastX = t.clientX;
      g.lastT = e.timeStamp;

      // Direction lock: first axis to cross DIRECTION_LOCK_PX wins.
      // Vertical → release to native scroll (touch-action: pan-y did this for
      // free); we just stop participating. Horizontal → swipe.
      if (g.mode === "pressing") {
        if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          g.mode = "scrolling";
          // Auto-dismiss the open swipe panel as soon as scroll begins.
          if (isOpen) setOpenRowId(null);
          return;
        }
        if (
          Math.abs(dx) > Math.abs(dy) &&
          Math.abs(dx) >= HORIZONTAL_COMMIT_PX
        ) {
          g.mode = "swiping";
          horizontalActiveRef.current = true;
          // Re-anchor startX to the current finger position. Without this, the
          // card would jump by `HORIZONTAL_COMMIT_PX` the instant we commit
          // (going from "showing 0px revealed" to "showing 4px revealed" in a
          // single frame). Re-anchoring means the slide grows from 0 in lockstep
          // with the finger from this moment on — perfectly smooth reveal.
          g.startX = t.clientX;
          // Re-compute dx for this frame so `next` below uses the new origin.
          // (dx becomes 0 here; rubber-band branches still behave correctly.)
        } else {
          // Still ambiguous — keep watching.
          return;
        }
      }

      if (g.mode !== "swiping") return;

      // Map finger delta → reveal width.
      // Finger left  → dx negative → reveal grows (panel slides in from right).
      // Finger right → dx positive → reveal shrinks toward 0.
      // Recompute dx in case startX was re-anchored on this same frame.
      const sdx = t.clientX - g.startX;
      let next = g.baseReveal - sdx;

      // Rubber-band beyond limits so the user feels the boundary.
      if (next > MOBILE_SWIPE_PANEL_PX) {
        const over = next - MOBILE_SWIPE_PANEL_PX;
        next = MOBILE_SWIPE_PANEL_PX + over * 0.35;
      } else if (next < 0) {
        next = next * 0.35;
      }
      revealLatestRef.current = next;
      setRevealPx(next);
    },
    [isMobile, isOpen, setOpenRowId],
  );

  const handleCardTouchEnd = useCallback(() => {
    if (!isMobile) return;
    const g = gRef.current;

    if (g.mode === "swiping") {
      skipNextClickRef.current = true;
      const x = revealLatestRef.current;
      const v = g.velX; // px/ms

      // Velocity-aware snap. A fast flick beats threshold.
      let snapped: number;
      if (v < -SWIPE_FLICK_VELOCITY) snapped = MOBILE_SWIPE_PANEL_PX;
      else if (v > SWIPE_FLICK_VELOCITY) snapped = 0;
      else snapped = x >= MOBILE_SWIPE_OPEN_SNAP_PX ? MOBILE_SWIPE_PANEL_PX : 0;

      revealLatestRef.current = snapped;
      setRevealPx(snapped);
      setAnimateTransform(true);
      setOpenRowId(snapped > 0 ? rowId : isOpen ? null : null);
    } else {
      // Vertical scroll / quick tap / cancelled — make sure transitions resume.
      setAnimateTransform(true);
    }

    g.mode = "idle";
    horizontalActiveRef.current = false;
  }, [isMobile, rowId, isOpen, setOpenRowId]);

  /* ─────── chevron tap toggles the panel (acts like a successful swipe) ─────── */

  const togglePanel = useCallback(() => {
    if (!isMobile) return;
    const opening = revealLatestRef.current < MOBILE_SWIPE_OPEN_SNAP_PX;
    const next = opening ? MOBILE_SWIPE_PANEL_PX : 0;
    revealLatestRef.current = next;
    setRevealPx(next);
    setAnimateTransform(true);
    setOpenRowId(opening ? rowId : null);
  }, [isMobile, rowId, setOpenRowId]);

  /* ─────── card body click handling ─────── */

  const handleCardClick = useCallback(() => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }
    if (isThisDragging || isAnyDragging) return;
    if (isMobile && revealPx > 0) {
      // Tap on body of an opened card → close it (don't open detail).
      revealLatestRef.current = 0;
      setRevealPx(0);
      setAnimateTransform(true);
      setOpenRowId(null);
      return;
    }
    onTaskClick(index);
  }, [
    index,
    isMobile,
    isThisDragging,
    isAnyDragging,
    revealPx,
    onTaskClick,
    setOpenRowId,
  ]);

  const isPlaceholder = presentation === "placeholder";

  // Mobile chevron is *always* present so it can act as both a swipe hint
  // (when closed) and a close affordance (when open). Its DOM position is
  // unchanged across states — only the icon flips — so the layout never shifts.
  const showChevron = isMobile && !isThisDragging && !isPlaceholder;
  // Use the actual reveal position (not just `isOpen`) to flip the icon as
  // soon as the card has visibly committed past the snap point. This way the
  // arrow direction matches what the user sees, both during and after a swipe.
  const chevronOpenLook = revealPx > MOBILE_SWIPE_OPEN_SNAP_PX;

  // touch-action policy:
  //   - placeholder (this row is being dragged): "none" — the DragOverlay owns
  //     pointer; the underlying placeholder shouldn't steal events.
  //   - mobile default: "pan-y" — browser handles vertical scrolling natively
  //     and instantly. JS gets to decide horizontal.
  //   - desktop: undefined (let browser defaults handle it).
  const touchActionStyle: CSSProperties["touchAction"] = isPlaceholder
    ? "none"
    : isMobile
      ? "pan-y"
      : undefined;

  return (
    <div
      ref={rowRef}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "transition-[box-shadow,background-color,border-color] duration-200",
        isMobile && "bg-white dark:bg-slate-950",
        isPlaceholder && [
          "border border-dashed border-primary/40",
          "bg-primary/[0.04]",
        ],
      )}
    >
      {/* ── Mobile swipe-revealed action panel ── */}
      {isMobile && !isPlaceholder && (
        <div
          className="absolute right-[1px] inset-y-[1px] z-0 flex items-stretch overflow-hidden rounded-r-[13px]"
          style={{ width: MOBILE_SWIPE_PANEL_PX }}
          onPointerDown={stopDragActivation}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-center bg-amber-500/95 text-white active:bg-amber-600"
            style={{ maxWidth: MOBILE_SWIPE_ACTION_W }}
            disabled={blocks <= 1}
            aria-label={copy.ariaRemoveOneBlock}
            onClick={(e) => {
              e.stopPropagation();
              onChangeBlocks(index, -1);
            }}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button data-control-variant="outline"
            type="button"
            className="flex min-w-0 flex-1 items-center justify-center bg-sky-500/95 text-white active:bg-sky-600"
            style={{ maxWidth: MOBILE_SWIPE_ACTION_W }}
            aria-label={copy.ariaAddOneBlock}
            onClick={(e) => {
              e.stopPropagation();
              onChangeBlocks(index, 1);
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button data-control-variant="outline"
            type="button"
            className="flex min-w-0 flex-1 items-center justify-center bg-violet-500/95 text-white active:bg-violet-600"
            style={{ maxWidth: MOBILE_SWIPE_ACTION_W }}
            aria-label={copy.ariaPreTaskRitual}
            onClick={(e) => {
              e.stopPropagation();
              onRitual(index);
              setOpenRowId(null);
            }}
          >
            <Brain className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-center bg-rose-500/95 text-white active:bg-rose-600"
            style={{ maxWidth: MOBILE_SWIPE_ACTION_W }}
            aria-label={copy.ariaRemoveTask}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
              setOpenRowId(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Card body ── */}
      <div
        ref={cardRef}
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-xl border border-slate-300/55 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:shadow-[0_12px_28px_rgba(2,8,23,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]",
          isMobile
            ? "rounded-r-none bg-white dark:bg-slate-950"
            : "bg-white/62 backdrop-blur-md dark:bg-white/[0.045]",
          !isMobile &&
            !isAnyDragging &&
            "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none hover:-translate-y-px motion-reduce:hover:translate-y-0 hover:border-slate-400/65 hover:bg-white/78 hover:shadow-[0_14px_34px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.74)] dark:hover:border-white/18 dark:hover:bg-white/[0.075] dark:hover:shadow-[0_16px_38px_rgba(2,8,23,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]",
          isPlaceholder && "opacity-0 pointer-events-none select-none",
          isAnyDragging && "select-none",
        )}
        style={{
          borderLeftWidth: 4,
          borderLeftColor: color,
          transform:
            isMobile && !isPlaceholder && revealPx > 0
              ? `translate3d(-${Math.max(0, revealPx)}px,0,0)`
              : undefined,
          // While finger is tracking → no transition (1:1). On release →
          // soft spring to snapped position.
          transition:
            isMobile && !isPlaceholder
              ? reduceMotion
                ? "none"
                : animateTransform
                ? `transform ${SWIPE_MS}ms ${SOFT_EASE}`
                : "none"
              : undefined,
          // Overscan past the shared rounded clip so the hidden red action
          // cannot tint the card's anti-aliased right-hand corner pixels.
          width: isMobile && !isPlaceholder ? "calc(100% + 2px)" : undefined,
          minHeight: 44,
          touchAction: touchActionStyle,
        }}
        onTouchStart={isMobile && !isPlaceholder ? handleCardTouchStart : undefined}
        onTouchMove={isMobile && !isPlaceholder ? handleCardTouchMove : undefined}
        onTouchEnd={isMobile && !isPlaceholder ? handleCardTouchEnd : undefined}
        onTouchCancel={isMobile && !isPlaceholder ? handleCardTouchEnd : undefined}
        onClick={handleCardClick}
      >
        {/* The handle is the only drag activator. It is keyboard reachable and
            owns touch-action:none without blocking scroll on the card body. */}
        <button
          ref={activatorRef}
          type="button"
          data-drag-handle="true"
          {...(dndAttributes ?? {})}
          {...(dndListeners ?? {})}
          aria-label={copy.ariaHoldToReorder}
          className={cn(
            "-ml-2 flex h-10 w-10 shrink-0 touch-none select-none items-center justify-center rounded-lg",
            "cursor-grab text-muted-foreground/45 outline-none transition-[color,background-color,box-shadow] duration-150 motion-reduce:transition-none",
            "hover:bg-muted/55 hover:text-primary/80 active:cursor-grabbing active:bg-primary/10",
            "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isAnyDragging && "text-primary/75",
          )}
          onClick={stopDragActivation}
        >
          <GripVertical
            className={cn(
              "h-5 w-5 shrink-0",
              isAnyDragging
                ? "text-primary/70"
                : "text-muted-foreground/40",
            )}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 min-w-0">
            <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-foreground">
              {task.taskName ?? copy.untitledTask}
            </p>
            <PlannerGoogleSyncDot
              plannerTaskId={task.plannerTaskId}
              syncStatus={
                task.plannerTaskId
                  ? taskSyncStatusByPlannerId?.[task.plannerTaskId]
                  : undefined
              }
              copy={copy}
              className="mt-1.5"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <Badge
              variant="secondary"
              className="shrink-0 px-1.5 py-0 text-[10px] font-semibold"
            >
              {blocks}
              {copy.blockAbbr} · {durationLabel}
            </Badge>
            <span className="shrink-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {timeRangeLabel}
            </span>
          </div>
        </div>

        {/* Mobile chevron: tap toggles the panel open/closed. The same DOM
            element renders in both states (no layout shift); only the icon
            flips. Stops bubbling so it never starts a drag or a card click. */}
        {showChevron && (
          <button
            type="button"
            aria-label={copy.ariaPreTaskRitual /* generic toggle label */}
            aria-expanded={chevronOpenLook}
            className="ml-auto -mr-1 flex shrink-0 items-center gap-0.5 rounded-lg py-2 pl-2 pr-1 text-muted-foreground/70 transition-colors hover:bg-muted/40 active:text-muted-foreground"
            onPointerDown={stopDragActivation}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel();
            }}
          >
            {chevronOpenLook ? (
              <ChevronRight
                className="h-4 w-4 transition-transform duration-200 ease-out"
                strokeWidth={2.5}
              />
            ) : (
              <ChevronLeft
                className="h-4 w-4 transition-transform duration-200 ease-out"
                strokeWidth={2.5}
              />
            )}
          </button>
        )}

        {isMobile && onStartFocus && !isPlaceholder && (
          <button
            type="button"
            aria-label={copy.startFocus}
            className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors hover:bg-emerald-500/15 active:bg-emerald-500/20 dark:text-emerald-200"
            onPointerDown={stopDragActivation}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStartFocus(index);
              setOpenRowId(null);
            }}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Desktop inline action buttons. */}
        {!isMobile && (
          <div
            className="flex items-center gap-0.5 shrink-0"
            onPointerDown={stopDragActivation}
            onMouseDown={stopDragActivation}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-emerald-700 dark:text-emerald-300"
                      disabled={!onStartFocus}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartFocus?.(index);
                      }}
                    />
                  }
                >
                  <Play className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{copy.startFocus}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeBlocks(index, 1);
                      }}
                    />
                  }
                >
                  <Plus className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{copy.ariaAddOneBlock}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeBlocks(index, -1);
                      }}
                    />
                  }
                >
                  <Minus className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{copy.ariaRemoveOneBlock}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRitual(index);
                      }}
                    />
                  }
                >
                  <Brain className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{copy.ariaPreTaskRitual}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(index);
                      }}
                    />
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{copy.ariaRemoveTask}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ DragOverlay card ════════════════════════ */

function LiftedCardOverlay({
  task,
  meta,
  copy,
  isMobile,
  reduceMotion,
}: {
  task: LocalPlanTask;
  meta: TaskMeta;
  copy: DailyPlannerUiCopy;
  isMobile: boolean;
  reduceMotion: boolean;
}) {
  const { color, blocks, durationLabel, timeRangeLabel } = meta;

  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    if (reduceMotion) return;
    let secondFrame = 0;
    const r1 = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setLifted(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(secondFrame);
    };
  }, [reduceMotion]);

  return (
    <div
      className="relative flex items-center gap-2 rounded-xl border border-slate-300/65 bg-white/95 p-3 shadow-[0_14px_32px_rgba(15,23,42,0.18)] dark:border-white/15 dark:bg-slate-950/95"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: color,
        minHeight: 44,
        transform: lifted && !reduceMotion ? "scale(1.018)" : "scale(1)",
        boxShadow: lifted
          ? "0 18px 38px -14px rgba(15, 23, 42, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.38)"
          : "0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        transition: reduceMotion
          ? "none"
          : `transform ${LIFT_MS}ms ${SOFT_EASE}, box-shadow ${LIFT_MS}ms ${SOFT_EASE}`,
        cursor: isMobile ? "grabbing" : "grabbing",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        className="flex shrink-0 self-stretch items-center -ml-1.5 px-1 rounded-l-sm"
        aria-hidden
      >
        <GripVertical className="h-4 w-4 shrink-0 text-primary/80" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="break-words text-sm font-semibold leading-snug text-foreground">
          {task.taskName ?? copy.untitledTask}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <Badge
            variant="secondary"
            className="shrink-0 px-1.5 py-0 text-[10px] font-semibold"
          >
            {blocks}
            {copy.blockAbbr} · {durationLabel}
          </Badge>
          <span className="shrink-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            {timeRangeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
