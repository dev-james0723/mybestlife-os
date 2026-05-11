/**
 * 3D Sphere Mode — node position & cluster region generator.
 *
 * Goals:
 *   1. Predictable, even spacing on the surface of a sphere (Fibonacci
 *      lattice — looks visually similar to the reference image).
 *   2. Clustered "regions" of color, where nodes that share a cluster key
 *      (category / type / library …) sit near each other on the sphere.
 *   3. Stable across re-renders for the same input — no shuffling jitter.
 *
 * Strategy:
 *   - Generate one global Fibonacci sphere slot per node first. This is
 *     the shape contract: every final node occupies a near-even point on
 *     the sphere shell.
 *   - Group nodes by `clusterBy`.
 *   - Sort groups by size (largest → smallest) to keep big clusters as
 *     dominant regions.
 *   - Assign each group a centroid direction on the sphere via a
 *     deterministic Fibonacci scatter over groups.
 *   - Give each group the unused global slots nearest its centroid.
 *     Color becomes regional, but spacing stays global and even.
 *   - Keep radial jitter tiny (or zero) so nodes remain on the globe
 *     surface rather than becoming a thick random cloud.
 *
 * The returned positions are pre-positioned (`fx/fy/fz`) so the
 * renderer can disable the force simulation and the layout stays
 * cinematic and stable. Edges still draw between the fixed nodes.
 */

import type {
  ConstellationClusterBy,
  ConstellationNode,
} from "@/types/constellation";

export type SpherePositions = Map<
  string,
  { x: number; y: number; z: number; clusterKey: string }
>;

export type GenerateSpherePositionsOptions = {
  /** Sphere radius in graph units. */
  radius?: number;
  /** Node grouping dimension. Defaults to category-then-type. */
  clusterBy?: ConstellationClusterBy;
  /**
   * Deprecated tuning hooks retained for call-site compatibility.
   * The current layout assigns even Fibonacci slots first, so these no
   * longer control the primary distribution.
   */
  minCapAngle?: number;
  maxCapAngle?: number;
  /**
   * Tiny radial variation (0 = exact sphere shell). Keep this near zero:
   * the mode should read as a globe surface, not a thick 3D cloud.
   */
  jitter?: number;
  /** Importance scale; not used by the slot layout but kept for parity. */
  importanceScale?: number;
};

const DEFAULTS: Required<GenerateSpherePositionsOptions> = {
  radius: 360,
  clusterBy: "category",
  // No longer used by the slot-based layout, but retained so older calls
  // with cap tuning options remain harmless.
  minCapAngle: 0.5,
  maxCapAngle: 1.3,
  jitter: 0.008,
  importanceScale: 1,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type Vec3 = [number, number, number];

/**
 * Cheap, stable, branch-free string hash. Used to seed jitter without
 * pulling in a real PRNG dependency. Same input ⇒ same output forever.
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry-style fast deterministic [0,1) generator seeded by hash. */
function seededRand(seed: number): () => number {
  let t = seed || 1;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function fibonacciDirection(index: number, total: number): Vec3 {
  if (total <= 1) return [0, 0, 1];
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * index;
  return [
    Math.cos(theta) * radiusAtY,
    y,
    Math.sin(theta) * radiusAtY,
  ];
}

/** Return the cluster key for a node. Always returns a non-empty string. */
export function clusterKeyForNode(
  node: ConstellationNode,
  clusterBy: ConstellationClusterBy,
): string {
  switch (clusterBy) {
    case "node_type":
      return node.type ?? "other";
    case "category":
      return (
        node.category ??
        // Fall back to type so "category=undefined" doesn't bucket the
        // entire graph into one anonymous region.
        node.type ??
        "other"
      );
    case "library":
      // No first-class "library" field on ConstellationNode — collections
      // are the closest analogue in this product. Prefer collection name,
      // then type as fallback.
      return node.collectionName ?? node.type ?? "other";
    case "collection":
      return node.collectionName ?? "other";
    case "project":
      return node.projectId ? `project:${node.projectId}` : node.type ?? "other";
    case "source_type":
      return node.sourceType ?? "other";
    case "none":
      return "all";
    default:
      return node.type ?? "other";
  }
}

/**
 * Generate stable 3D positions for every node, grouped into spherical
 * "patches" by clusterBy. The result is keyed by node id; consumers
 * should set `fx/fy/fz` on a graph copy so the force engine can be
 * disabled.
 */
export function generateSpherePositions(
  nodes: ConstellationNode[],
  opts: GenerateSpherePositionsOptions = {},
): SpherePositions {
  const o: Required<GenerateSpherePositionsOptions> = { ...DEFAULTS, ...opts };
  const out: SpherePositions = new Map();
  if (nodes.length === 0) return out;

  // 1. Group nodes by clusterBy. Use a Map to preserve discovery order
  //    (deterministic — same data ⇒ same regions every time).
  const groups = new Map<string, ConstellationNode[]>();
  for (const n of nodes) {
    const key = clusterKeyForNode(n, o.clusterBy);
    const list = groups.get(key);
    if (list) list.push(n);
    else groups.set(key, [n]);
  }

  // 2. Order groups: largest first, then alpha (deterministic for ties).
  const orderedGroups = [...groups.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  // 3. Assign each group a Fibonacci-spaced centroid on the sphere. With
  //    only one group this lands on the equator pointing forward, which
  //    looks great for the "sphere = one big region" case too.
  const totalNodes = nodes.length;
  const groupCount = orderedGroups.length;
  const slots = nodes.map((_, i) => ({
    index: i,
    dir: fibonacciDirection(i, totalNodes),
  }));
  const unusedSlots = new Set(slots.map((slot) => slot.index));
  const assigned = new Map<string, Vec3>();

  for (let gi = 0; gi < groupCount; gi += 1) {
    const [groupKey, members] = orderedGroups[gi];

    // Cluster centroid via Fibonacci over groups. It only determines
    // which already-even global slots a group receives; it never pulls
    // nodes inward or packs them into a random cap.
    const centroid = normalize(fibonacciDirection(gi, groupCount));

    // Deterministic per-group RNG: same group key ⇒ same intra-group
    // tie-breaks across renders.
    const rand = seededRand(hashString(`${o.clusterBy}::${groupKey}`));

    // Sort members within group for stable order (importance / connection
    // count first, then label) so prominent nodes receive the slots
    // closest to the cluster centroid.
    const ordered = [...members].sort((a, b) => {
      const ai = (a.importance ?? 0) + (a.connectionCount ?? 0) * 0.05;
      const bi = (b.importance ?? 0) + (b.connectionCount ?? 0) * 0.05;
      if (ai !== bi) return bi - ai;
      return (a.label ?? "").localeCompare(b.label ?? "");
    });

    // Pick the group's nearest still-unused Fibonacci slots. This is the
    // critical change: every node occupies one globally even slot, so
    // spacing and the sphere silhouette remain stable while color still
    // forms regional patches.
    const rankedSlots = [...unusedSlots]
      .map((slotIndex) => {
        const dir = slots[slotIndex].dir;
        const dot =
          dir[0] * centroid[0] + dir[1] * centroid[1] + dir[2] * centroid[2];
        return {
          slotIndex,
          score: dot + rand() * 0.000001,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, ordered.length);

    for (let i = 0; i < ordered.length; i += 1) {
      const n = ordered[i];
      const slot = rankedSlots[i];
      if (!slot) continue;
      unusedSlots.delete(slot.slotIndex);
      assigned.set(n.id, slots[slot.slotIndex].dir);
    }
  }

  // Safety net: if pathological input somehow leaves slots unassigned,
  // fill from remaining Fibonacci slots. This keeps the contract total.
  for (const n of nodes) {
    if (assigned.has(n.id)) continue;
    const slotIndex = unusedSlots.values().next().value;
    if (slotIndex == null) continue;
    unusedSlots.delete(slotIndex);
    assigned.set(n.id, slots[slotIndex].dir);
  }

  for (const n of nodes) {
    const dir = assigned.get(n.id) ?? fibonacciDirection(0, 1);
    const groupKey = clusterKeyForNode(n, o.clusterBy);
    const rand = seededRand(hashString(`${n.id}::${groupKey}`));
    const radius =
      o.radius * (1 + (rand() * 2 - 1) * o.jitter); // tiny ±jitter only
    out.set(n.id, {
      x: dir[0] * radius,
      y: dir[1] * radius,
      z: dir[2] * radius,
      clusterKey: groupKey,
    });
  }

  return out;
}

/**
 * Stable color palette for cluster regions when clusterBy is *not*
 * "node_type" (in which case NODE_COLORS already gives us the right
 * regional colors).
 *
 * Cosmic, dark-mode-tuned, never neon-rainbow. Hand-picked HSL
 * saturations to stay coherent with the rest of the constellation.
 */
const CLUSTER_PALETTE: Array<{ core: string; glow: string; ring: string }> = [
  { core: "#a78bfa", glow: "rgba(139, 92, 246, 0.55)", ring: "rgba(167, 139, 250, 0.95)" }, // violet
  { core: "#fbbf24", glow: "rgba(245, 158, 11, 0.55)", ring: "rgba(251, 191, 36, 0.95)" }, // amber
  { core: "#34d399", glow: "rgba(16, 185, 129, 0.55)", ring: "rgba(52, 211, 153, 0.95)" }, // emerald
  { core: "#f472b6", glow: "rgba(236, 72, 153, 0.55)", ring: "rgba(244, 114, 182, 0.95)" }, // pink
  { core: "#5eead4", glow: "rgba(45, 212, 191, 0.55)", ring: "rgba(94, 234, 212, 0.95)" }, // teal
  { core: "#fb923c", glow: "rgba(249, 115, 22, 0.55)", ring: "rgba(251, 146, 60, 0.95)" }, // orange
  { core: "#7dd3fc", glow: "rgba(56, 189, 248, 0.55)", ring: "rgba(125, 211, 252, 0.95)" }, // sky
  { core: "#c4b5fd", glow: "rgba(167, 139, 250, 0.5)", ring: "rgba(196, 181, 253, 0.95)" }, // violet-light
  { core: "#a3e635", glow: "rgba(132, 204, 22, 0.55)", ring: "rgba(163, 230, 53, 0.95)" }, // lime
  { core: "#f0abfc", glow: "rgba(232, 121, 249, 0.55)", ring: "rgba(240, 171, 252, 0.95)" }, // fuchsia
  { core: "#fde047", glow: "rgba(250, 204, 21, 0.55)", ring: "rgba(253, 224, 71, 0.95)" }, // yellow
  { core: "#fda4af", glow: "rgba(251, 113, 133, 0.55)", ring: "rgba(253, 164, 175, 0.95)" }, // rose
];

const OTHER_COLOR = {
  core: "#94a3b8",
  glow: "rgba(100, 116, 139, 0.45)",
  ring: "rgba(148, 163, 184, 0.85)",
} as const;

/**
 * Build a stable map of cluster key → color. Pure function of the
 * (sorted) cluster keys, so the same key always lands on the same
 * palette slot for a given dataset shape.
 *
 * "Other" / "uncategorized" / unknown buckets always get the neutral
 * slate color, never a vivid hue.
 */
export function buildClusterColorMap(
  positions: SpherePositions,
): Map<string, { core: string; glow: string; ring: string }> {
  const out = new Map<string, { core: string; glow: string; ring: string }>();
  const keys = new Set<string>();
  for (const v of positions.values()) keys.add(v.clusterKey);

  // Neutral keys are always slate so the eye reads them as background.
  const NEUTRAL = new Set([
    "other",
    "uncategorized",
    "misc",
    "unknown",
    "all",
  ]);

  // Sort by hash for stable assignment regardless of insertion order
  // (same dataset ⇒ same colors across reloads).
  const ordered = [...keys].sort((a, b) => hashString(a) - hashString(b));
  let paletteIdx = 0;
  for (const key of ordered) {
    if (NEUTRAL.has(key.toLowerCase())) {
      out.set(key, OTHER_COLOR);
      continue;
    }
    out.set(key, CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length]);
    paletteIdx += 1;
  }
  return out;
}
