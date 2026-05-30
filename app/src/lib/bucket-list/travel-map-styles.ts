import type { BucketStatus } from "@/types/bucket-list";

export const TRAVEL_MAP_STATUS_COLOR: Record<BucketStatus, string> = {
  dreaming: "#7dd3fc",
  exploring: "#fbbf24",
  planning: "#fbbf24",
  active: "#a3e635",
  funded: "#34d399",
  scheduled: "#34d399",
  booked: "#22d3ee",
  completed: "#f472b6",
  paused: "#cbd5e1",
  archived: "#64748b",
};
