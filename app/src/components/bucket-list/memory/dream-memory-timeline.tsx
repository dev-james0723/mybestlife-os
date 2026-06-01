"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  useBucketIntegrations,
  useBucketReflections,
  useDreamImages,
} from "@/hooks/use-bucket-list";
import {
  buildDreamTimeline,
  type DreamTimelineEvent,
  type DreamTimelineEventKey,
} from "@/lib/bucket-list/memory-timeline";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import { bucketStaggerContainer, bucketStaggerItem } from "../bucket-motion";

function labelFor(
  event: DreamTimelineEvent,
  copy: BucketListUiCopy,
): string {
  const map: Record<DreamTimelineEventKey, string> = {
    created: copy.tlCreated,
    visualized: copy.tlVisualized,
    activated: copy.tlActivated,
    project_linked: copy.tlProjectLinked,
    tasks_added: copy.tlTasksAdded(Number(event.detail ?? 0)),
    savings_started: copy.tlSavingsStarted,
    calendar_added: copy.tlCalendarAdded,
    researched: copy.tlResearched,
    trip_planned: copy.tlTripPlanned,
    completed: copy.tlCompleted,
    reflected: copy.tlReflected,
    became_memory: copy.tlBecameMemory,
  };
  return map[event.key];
}

/** Deterministic dream lifecycle timeline — built only from stored timestamps. */
export function DreamMemoryTimeline({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const { data: integrations } = useBucketIntegrations(item.id);
  const { data: images } = useDreamImages(item.id);
  const { data: reflections } = useBucketReflections(item.id);

  const events = useMemo(
    () =>
      buildDreamTimeline(item, {
        integrations: integrations ?? [],
        images: images ?? [],
        reflections: reflections ?? [],
      }),
    [item, integrations, images, reflections],
  );

  if (events.length === 0) return null;

  return (
    <motion.section
      variants={bucketStaggerItem(reduceMotion, 10)}
      className="rounded-xl border p-4"
    >
      <h3 className="mb-3 text-sm font-semibold">{copy.memoryTimelineHeading}</h3>
      <motion.ol
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        animate="show"
        className="space-y-3 border-l pl-4"
      >
        {events.map((event, i) => (
          <motion.li
            key={`${event.key}-${i}`}
            variants={bucketStaggerItem(reduceMotion, 8)}
            className="relative"
          >
            <motion.span
              className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border border-background bg-lime-400"
              initial={{ scale: reduceMotion ? 1 : 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.35, delay: i * 0.04 }}
            />
            <p className="text-[13px] font-medium">{labelFor(event, copy)}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(event.dateISO)}
            </p>
          </motion.li>
        ))}
      </motion.ol>
    </motion.section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
