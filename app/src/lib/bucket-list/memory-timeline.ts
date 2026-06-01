/**
 * Deterministic Dream lifecycle timeline. Built ONLY from stored data
 * (timestamps on the item, its integrations, images, and reflections). No
 * event is invented — if there's no real timestamp, the event is omitted.
 * Pure + dependency-free for easy testing and reuse.
 */

import type {
  BucketDreamImageRecord,
  BucketItem,
  BucketItemIntegration,
  BucketReflection,
} from "@/types/bucket-list";

export type DreamTimelineEventKey =
  | "created"
  | "visualized"
  | "activated"
  | "project_linked"
  | "tasks_added"
  | "savings_started"
  | "calendar_added"
  | "researched"
  | "trip_planned"
  | "completed"
  | "reflected"
  | "became_memory";

export type DreamTimelineEvent = {
  key: DreamTimelineEventKey;
  dateISO: string;
  /** Optional extra detail (e.g. a count or label) the UI can show. */
  detail?: string;
};

export type DreamTimelineSources = {
  integrations?: BucketItemIntegration[];
  images?: Pick<BucketDreamImageRecord, "created_at">[];
  reflections?: BucketReflection[];
};

function earliest(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => Boolean(d));
  if (valid.length === 0) return null;
  return valid.reduce((min, d) => (d < min ? d : min));
}

export function buildDreamTimeline(
  item: BucketItem,
  sources: DreamTimelineSources = {},
): DreamTimelineEvent[] {
  const integrations = sources.integrations ?? [];
  const images = sources.images ?? [];
  const reflections = sources.reflections ?? [];

  const events: DreamTimelineEvent[] = [];
  const push = (
    key: DreamTimelineEventKey,
    dateISO: string | null | undefined,
    detail?: string,
  ) => {
    if (dateISO) events.push({ key, dateISO, detail });
  };

  push("created", item.created_at);

  // Visualized — first inspiration / generated image.
  push("visualized", earliest(images.map((i) => i.created_at)));

  // Activated — first cross-module integration of any kind.
  push("activated", earliest(integrations.map((i) => i.created_at)));

  const firstOfKind = (kind: BucketItemIntegration["kind"]) =>
    earliest(integrations.filter((i) => i.kind === kind).map((i) => i.created_at));

  push("project_linked", firstOfKind("project"));
  const taskInts = integrations.filter((i) => i.kind === "task");
  if (taskInts.length > 0) {
    push(
      "tasks_added",
      earliest(taskInts.map((i) => i.created_at)),
      String(taskInts.length),
    );
  }
  push("savings_started", firstOfKind("savings_goal"));
  push("calendar_added", firstOfKind("calendar_event"));

  // Research / trip plan — only when the AI artifacts actually exist.
  push("researched", item.ai_destination_brief?.fetched_at ?? null);
  push("trip_planned", item.ai_trip_plan?.fetched_at ?? null);

  push("completed", item.completed_at);

  // Reflections — each is a real reflection event; the latest one carrying an
  // AI memory / summary marks "became a memory".
  for (const r of reflections) {
    push("reflected", r.reflected_on);
  }
  const memoryReflections = reflections
    .filter((r) => r.ai_memory || r.ai_summary)
    .map((r) => r.reflected_on);
  push("became_memory", memoryReflections.length ? memoryReflections.reduce((a, b) => (a > b ? a : b)) : null);

  return events.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
