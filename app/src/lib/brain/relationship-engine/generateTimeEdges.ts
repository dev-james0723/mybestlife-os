/**
 * Time-proximity edge generator.
 *
 * Time alone is a weak signal, so this generator is conservative:
 *
 *   - Only emits edges between *task-flavored* nodes (task, daily_plan,
 *     habit, journal_entry, gratitude_entry, career_event) within the
 *     same week.
 *   - Strength caps at 0.55 so other signals (entity, taxonomy) outrank
 *     same-week edges in the dedup step.
 *   - One edge per (sourceNode, targetNode) at most — no multi-edges
 *     between the same pair.
 *
 * The output is intended to add light visual pull between things the user
 * worked on at the same time, not to imply causation.
 */

import type { BrainEdge, BrainNode, BrainNodeType } from "@/types/brain-graph";
import type { FeatureIndex } from "./featurize";
import { buildEdge } from "./scoreEdge";

const TIME_ELIGIBLE: ReadonlySet<BrainNodeType> = new Set<BrainNodeType>([
  "task",
  "daily_plan",
  "habit",
  "journal_entry",
  "gratitude_entry",
  "career_event",
]);

/** Convert ISO date `YYYY-MM-DD` to `YYYY-Www` ISO week bucket. */
function isoWeekBucket(date: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return undefined;
  // ISO week algorithm.
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber =
    1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function generateTimeEdges(input: {
  nodes: BrainNode[];
  index: FeatureIndex;
  userId: string;
}): BrainEdge[] {
  const eligible = input.nodes.filter((n) => TIME_ELIGIBLE.has(n.type));
  if (eligible.length < 2) return [];

  // Bucket by ISO week.
  const byWeek = new Map<string, string[]>();
  for (const n of eligible) {
    const features = input.index.byNodeId.get(n.id);
    if (!features?.dateBucket) continue;
    const week = isoWeekBucket(features.dateBucket);
    if (!week) continue;
    let list = byWeek.get(week);
    if (!list) {
      list = [];
      byWeek.set(week, list);
    }
    list.push(n.id);
  }

  const out: BrainEdge[] = [];
  const seenPairs = new Set<string>();

  for (const [week, ids] of byWeek) {
    if (ids.length < 2) continue;
    // Cap fan-out per week to avoid O(N^2) explosion.
    const capped = ids.slice(0, 30);
    for (let i = 0; i < capped.length; i++) {
      for (let j = i + 1; j < capped.length; j++) {
        const a = capped[i];
        const b = capped[j];
        const pairKey = a < b ? `${a}::${b}` : `${b}::${a}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        const aNode = input.index.byNodeId.get(a);
        const bNode = input.index.byNodeId.get(b);
        if (!aNode || !bNode) continue;
        out.push(
          buildEdge({
            userId: input.userId,
            sourceNodeId: a,
            targetNodeId: b,
            sourceNodeType: aNode.nodeType,
            targetNodeType: bNode.nodeType,
            type: "same_time_period",
            strength: 0.4,
            confidence: 0.55,
            reason: `Both fall in ISO week ${week}.`,
            sourceMethod: "time",
            // Time-only edges aren't visible by default — they wait for
            // a corroborating signal during the dedup/merge step.
            status: "hidden",
            evidence: { sameWeek: week },
          }),
        );
      }
    }
  }

  return out;
}
