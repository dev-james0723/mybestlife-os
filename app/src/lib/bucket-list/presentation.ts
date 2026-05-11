import type {
  BucketCostBand,
  BucketDifficulty,
  BucketItem,
  BucketPriority,
  BucketStatus,
  BucketTimeHorizon,
  BucketType,
} from "@/types/bucket-list";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";

// ─── Labels ───────────────────────────────────────────────────────────────────

export function getBucketTypeLabel(
  type: BucketType,
  copy: BucketListUiCopy,
): string {
  switch (type) {
    case "travel":
      return copy.filterTravel;
    case "achievement":
      return copy.filterAchievement;
    case "growth":
      return copy.filterGrowth;
    case "relationship":
      return copy.filterRelationship;
    case "purchase":
      return copy.filterPurchase;
    case "lifestyle":
      return copy.filterLifestyle;
  }
}

export function getBucketStatusLabel(
  status: BucketStatus,
  copy: BucketListUiCopy,
): string {
  switch (status) {
    case "dreaming":
      return copy.statusDreaming;
    case "exploring":
      return copy.statusExploring;
    case "planning":
      return copy.statusPlanning;
    case "active":
      return copy.statusActive;
    case "funded":
      return copy.statusFunded;
    case "scheduled":
      return copy.statusScheduled;
    case "booked":
      return copy.statusBooked;
    case "completed":
      return copy.statusCompleted;
    case "paused":
      return copy.statusPaused;
    case "archived":
      return copy.statusArchived;
  }
}

export function getBucketPriorityLabel(
  priority: BucketPriority,
  copy: BucketListUiCopy,
): string {
  switch (priority) {
    case "high":
      return copy.priorityHigh;
    case "medium":
      return copy.priorityMedium;
    case "low":
      return copy.priorityLow;
    case "someday":
      return copy.prioritySomeday;
  }
}

export function getBucketDifficultyLabel(
  difficulty: BucketDifficulty,
  copy: BucketListUiCopy,
): string {
  switch (difficulty) {
    case "easy":
      return copy.difficultyEasy;
    case "med":
      return copy.difficultyMed;
    case "hard":
      return copy.difficultyHard;
    case "epic":
      return copy.difficultyEpic;
  }
}

export function getBucketTimeHorizonLabel(
  horizon: BucketTimeHorizon,
  copy: BucketListUiCopy,
): string {
  switch (horizon) {
    case "this_year":
      return copy.timeHorizonThisYear;
    case "1_3_years":
      return copy.timeHorizon13;
    case "3_5_years":
      return copy.timeHorizon35;
    case "lifetime":
      return copy.timeHorizonLifetime;
  }
}

export function formatCostBand(band: BucketCostBand): string {
  return band;
}

// ─── Status badge style ───────────────────────────────────────────────────────

/** Tailwind classes scoped for the glassy status badge. */
export function bucketStatusBadgeClass(status: BucketStatus): string {
  switch (status) {
    case "active":
      return "bg-lime-400/20 text-lime-400 border-lime-400/40";
    case "booked":
    case "scheduled":
    case "funded":
      return "bg-emerald-400/15 text-emerald-300 border-emerald-400/30";
    case "planning":
    case "exploring":
      return "bg-amber-400/15 text-amber-300 border-amber-400/30";
    case "dreaming":
      return "bg-sky-400/15 text-sky-300 border-sky-400/30";
    case "completed":
      return "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30";
    case "paused":
      return "bg-white/5 text-white/60 border-white/15";
    case "archived":
      return "bg-white/5 text-white/40 border-white/10";
    default:
      return "bg-white/10 text-white/80 border-white/20";
  }
}

export function bucketTypeBadgeClass(type: BucketType): string {
  switch (type) {
    case "travel":
      return "bg-cyan-400/10 text-cyan-300";
    case "achievement":
      return "bg-yellow-400/10 text-yellow-300";
    case "growth":
      return "bg-emerald-400/10 text-emerald-300";
    case "relationship":
      return "bg-rose-400/10 text-rose-300";
    case "purchase":
      return "bg-indigo-400/10 text-indigo-300";
    case "lifestyle":
      return "bg-orange-400/10 text-orange-300";
  }
}

/** Emoji fallback for covers — shown when no `cover_image_url` is set. */
export function getBucketTypeEmoji(type: BucketType): string {
  switch (type) {
    case "travel":
      return "✈️";
    case "achievement":
      return "🏆";
    case "growth":
      return "🌱";
    case "relationship":
      return "❤️";
    case "purchase":
      return "🎁";
    case "lifestyle":
      return "🌅";
  }
}

// ─── Progress / funded estimation ─────────────────────────────────────────────

/**
 * Lightweight "funded" estimation used before Finance + Project integrations
 * are wired up. If the user has linked a savings goal we use that; otherwise
 * we derive a coarse progress number from the status enum so the Progress bar
 * isn't always zero for seed data.
 */
export function estimateBucketProgress(item: BucketItem): number {
  if (item.status === "completed") return 100;
  if (item.status === "booked" || item.status === "scheduled") return 90;
  if (item.status === "funded") return 75;
  if (item.status === "active") return 55;
  if (item.status === "planning") return 35;
  if (item.status === "exploring") return 20;
  if (item.status === "dreaming") return 8;
  if (item.status === "paused") return 25;
  return 0;
}

/**
 * Humanised "X months out" helper for headline cards. Returns `null` when no
 * target date / month is set.
 */
export function bucketMonthsOut(item: BucketItem): number | null {
  const isoDate = item.target_date
    ? item.target_date
    : item.target_month
      ? `${item.target_month}-01`
      : null;
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return null;
  const diffDays = Math.max(0, (then - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 30);
}

export function bucketTargetMonthLabel(item: BucketItem): string | null {
  if (item.target_month) {
    const [y, m] = item.target_month.split("-");
    const mi = Number(m) - 1;
    if (mi >= 0 && mi < 12) return `Q${Math.floor(mi / 3) + 1} ${y} target`;
  }
  if (item.target_date) {
    const d = new Date(item.target_date);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })} target`;
    }
  }
  return null;
}

// ─── Dream-type integration suggestions ───────────────────────────────────────

export type ActivateSuggestion =
  | "project"
  | "tasks"
  | "budget"
  | "savings"
  | "calendar"
  | "map"
  | "flight"
  | "research"
  | "memory";

export function getSuggestedActivations(
  type: BucketType,
): ActivateSuggestion[] {
  switch (type) {
    case "travel":
      return [
        "map",
        "flight",
        "budget",
        "savings",
        "calendar",
        "research",
        "memory",
      ];
    case "achievement":
      return ["project", "tasks", "calendar", "memory"];
    case "growth":
      return ["project", "tasks", "research", "calendar"];
    case "purchase":
      return ["budget", "savings", "project", "tasks"];
    case "relationship":
      return ["calendar", "budget", "tasks", "memory"];
    case "lifestyle":
      return ["tasks", "project", "calendar"];
  }
}
