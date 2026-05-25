"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type RankingSelectOption = {
  id: string;
  label: string;
};

export type RankingSelectProps = {
  options: RankingSelectOption[];
  /** Ordered list of selected ids; order encodes rank (index 0 = rank 1). */
  value: string[];
  onChange: (ordered: string[]) => void;
  /** Maximum number of ranked picks. Default 3. */
  max?: number;
  className?: string;
};

/**
 * RankingSelect — pick up to `max` options and order them.
 *
 * Unranked options appear as toggle chips. Picking one appends it to the ranked
 * list (capped at `max`); clicking a ranked item (or its remove button)
 * deselects it. Ranked items show a numbered badge and can be reordered by drag
 * (@dnd-kit, pointer + touch + keyboard) or via the up/down buttons — the latter
 * guarantees a fully keyboard-/touch-accessible path independent of drag.
 */
export function RankingSelect({
  options,
  value,
  onChange,
  max = 3,
  className,
}: RankingSelectProps) {
  const prefersReduced = useReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const labelFor = (id: string) =>
    options.find((o) => o.id === id)?.label ?? id;

  const selected = value.filter((id) => options.some((o) => o.id === id));
  const atMax = selected.length >= max;
  const available = options.filter((o) => !selected.includes(o.id));

  const pick = (id: string) => {
    if (selected.includes(id) || atMax) return;
    onChange([...selected, id]);
  };

  const remove = (id: string) => {
    onChange(selected.filter((v) => v !== id));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= selected.length) return;
    onChange(arrayMove(selected, from, to));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = selected.indexOf(String(active.id));
    const to = selected.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onChange(arrayMove(selected, from, to));
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Ranked list */}
      {selected.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={selected}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2">
              {selected.map((id, index) => (
                <RankedItem
                  key={id}
                  id={id}
                  index={index}
                  total={selected.length}
                  label={labelFor(id)}
                  prefersReduced={!!prefersReduced}
                  onRemove={() => remove(id)}
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : null}

      {/* Available options */}
      {available.length > 0 ? (
        <div role="group" className="flex flex-wrap items-center gap-1.5">
          {available.map((option) => (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => pick(option.id)}
              disabled={atMax}
              aria-pressed={false}
              whileTap={prefersReduced || atMax ? undefined : { scale: 0.96 }}
              transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
              className={cn(
                "inline-flex items-center rounded-full border border-border/70 bg-transparent px-3 py-1 text-xs font-medium leading-tight text-muted-foreground",
                "transition-colors hover:bg-muted/50 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
                atMax &&
                  "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
              )}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type RankedItemProps = {
  id: string;
  index: number;
  total: number;
  label: string;
  prefersReduced: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function RankedItem({
  id,
  index,
  total,
  label,
  prefersReduced,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RankedItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: prefersReduced ? undefined : transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      aria-label={`Rank ${index + 1}: ${label}`}
      className={cn(
        "flex items-center gap-2 rounded-2xl border p-2.5",
        "[background:var(--surface-glass)] [border-color:var(--border-glass)] [box-shadow:var(--shadow-glass)] [backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))]",
        isDragging && "opacity-70 ring-2 ring-[var(--accent-pink)]/40",
      )}
    >
      {/* Drag handle (pointer/touch + keyboard via dnd-kit) */}
      <button
        type="button"
        aria-label={`Reorder ${label}`}
        className="inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)] text-xs font-semibold text-[var(--accent-pink-foreground)] tabular-nums">
        {index + 1}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {label}
      </span>

      {/* Keyboard/touch-friendly explicit reorder controls */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${label} up`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${label} down`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

export default RankingSelect;
