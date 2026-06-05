import type { ContextOpenLoop, LifeAgentContextSources } from "@/lib/life-agent/context-types";
import { extractOpenLoops } from "@/lib/life-agent/open-loops";
import type {
  OpenLoopCategory,
  OpenLoopRadarGroup,
  RadarOpenLoop,
} from "@/lib/life-agent/workflow-types";

const CATEGORY_ORDER: OpenLoopCategory[] = [
  "urgent",
  "important",
  "relationship",
  "document",
  "admin",
  "waiting",
  "creative",
  "finance",
  "unclear",
  "emotional",
];

const CATEGORY_LABELS: Record<OpenLoopCategory, string> = {
  urgent: "Urgent",
  important: "Important",
  waiting: "Waiting",
  unclear: "Unclear",
  emotional: "Emotional",
  admin: "Admin",
  relationship: "Relationship",
  creative: "Creative",
  finance: "Finance",
  document: "Document",
};

const CREATIVE_PATTERN =
  /\b(festival|creative|music|art|write|design|product|idea|album|compose)\b/i;
const EMOTIONAL_PATTERN =
  /\b(feel|stress|anxious|overwhelm|burnout|tired|emotion|heart)\b/i;

export function categorizeOpenLoop(loop: ContextOpenLoop): OpenLoopCategory {
  switch (loop.kind) {
    case "overdue_task":
      return "urgent";
    case "expiring_document":
      return loop.priority === "high" ? "urgent" : "document";
    case "relationship_follow_up":
    case "open_promise":
      return "relationship";
    case "project_without_next_action":
      if (CREATIVE_PATTERN.test(loop.title)) return "creative";
      return "unclear";
    case "asset_missing_docs":
      return "admin";
    case "goal_without_task":
      return "unclear";
    case "note_action_hint":
      if (CREATIVE_PATTERN.test(`${loop.title} ${loop.detail ?? ""}`)) return "creative";
      if (EMOTIONAL_PATTERN.test(`${loop.title} ${loop.detail ?? ""}`)) return "emotional";
      return "admin";
    case "incomplete_task":
      if (loop.priority === "high") return "important";
      if (EMOTIONAL_PATTERN.test(loop.title)) return "emotional";
      if (CREATIVE_PATTERN.test(loop.title)) return "creative";
      if (/\b(wait|waiting|pending|reply)\b/i.test(loop.title)) return "waiting";
      return "important";
    default:
      return "unclear";
  }
}

export function buildRadarOpenLoops(
  sources: LifeAgentContextSources,
  referenceDate: Date = new Date(),
): RadarOpenLoop[] {
  return extractOpenLoops(sources, referenceDate).map((loop) => ({
    ...loop,
    category: categorizeOpenLoop(loop),
  }));
}

export function groupOpenLoops(loops: RadarOpenLoop[]): OpenLoopRadarGroup[] {
  const byCategory = new Map<OpenLoopCategory, RadarOpenLoop[]>();
  for (const loop of loops) {
    const list = byCategory.get(loop.category) ?? [];
    list.push(loop);
    byCategory.set(loop.category, list);
  }

  return CATEGORY_ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0).map(
    (category) => {
      const categoryLoops = byCategory.get(category) ?? [];
      return {
        category,
        label: CATEGORY_LABELS[category],
        count: categoryLoops.length,
        loops: categoryLoops,
      };
    },
  );
}

export function getCategoryLabel(category: OpenLoopCategory): string {
  return CATEGORY_LABELS[category];
}
