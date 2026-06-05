/**
 * Brain-Shaped Layout Engine
 *
 * Converts a flat ConstellationGraphData into a spatially organized brain.
 * The layout metaphor:
 *   - Left hemisphere = inner life, reflection, memory (journal, finance,
 *     relationships, gratitude, personal growth)
 *   - Right hemisphere = execution, systems, work (projects, tasks, career,
 *     AI/product, documents, tools)
 *   - Central bridge = synthesis, knowledge, identity, values (knowledge,
 *     goals, about_me, decisions)
 *   - Lower center = emotional/limbic (quotes, values, relationships)
 *   - Lower back = routines/cerebellum (habits, daily plans)
 *
 * Hub nodes (life_area, value anchors, high-importance nodes) are PINNED
 * with fx/fy so force simulation never moves them. Child nodes receive
 * initial x/y near their hub and let the simulation settle them.
 *
 * World coordinate system:
 *   Brain half-width  ≈ 560  (so full brain ~1120 wide)
 *   Brain half-height ≈ 330  (so full brain ~660 tall)
 *   Origin at center (0, 0)
 *
 * All returned nodes have extra properties (x, y, fx?, fy?) that
 * react-force-graph-2d reads for initial / fixed positions.
 */

import type {
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

// ────────────────────────────────────────────────────────────────────────────
// World-space scale
// ────────────────────────────────────────────────────────────────────────────
export const BRAIN_HW = 560; // half-width
export const BRAIN_HH = 330; // half-height

/** Convert normalized [-1,1] coordinates to world space. */
export function norm2world(nx: number, ny: number): [number, number] {
  return [nx * BRAIN_HW, ny * BRAIN_HH];
}

// ────────────────────────────────────────────────────────────────────────────
// Brain boundary (superellipse)
// ────────────────────────────────────────────────────────────────────────────
const BWEXP = 2.3;
const BHEXP = 2.1;

export function isInsideBrain(wx: number, wy: number): boolean {
  return (
    Math.pow(Math.abs(wx) / BRAIN_HW, BWEXP) +
      Math.pow(Math.abs(wy) / BRAIN_HH, BHEXP) <=
    1.0
  );
}

/**
 * Project a world-space point onto (or inside) the brain boundary.
 * Uses binary search along the ray from origin to (wx, wy).
 */
export function clampToBrain(wx: number, wy: number): [number, number] {
  if (isInsideBrain(wx, wy)) return [wx, wy];
  const len = Math.sqrt(wx * wx + wy * wy);
  if (len < 0.001) return [0, 0];
  const dx = wx / len;
  const dy = wy / len;
  let lo = 0;
  let hi = len;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (isInsideBrain(dx * mid, dy * mid)) lo = mid;
    else hi = mid;
  }
  return [dx * lo * 0.97, dy * lo * 0.97]; // 3% inset so node stays clearly inside
}

// ────────────────────────────────────────────────────────────────────────────
// Anchor positions per domain (normalized)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Per-ConstellationNodeType or "brainType" anchor. Used when we don't have
 * a more specific life-area or value slug.
 */
const DOMAIN_ANCHORS: Record<string, [number, number]> = {
  // ── Knowledge / learning (upper center — parietal synthesis)
  knowledge: [0.0, -0.55],
  category: [-0.18, -0.60],
  knowledge_category: [-0.18, -0.60],
  collection: [0.22, -0.55],
  knowledge_collection: [0.22, -0.55],
  tag: [0.06, -0.46],
  smart_tag: [0.06, -0.46],
  source: [0.35, -0.50],
  concept: [0.10, -0.44],

  // ── Goals / personal growth (upper left — frontal lobe left)
  goal: [-0.54, -0.40],

  // ── Projects / execution (upper right — frontal lobe right)
  project: [0.54, -0.40],
  career_project: [0.54, -0.40],
  idea: [0.58, -0.55],

  // ── Tasks / action (right mid — execution cortex)
  task: [0.71, -0.07],

  // ── Career (right — work/professional)
  career_event: [0.62, 0.17],

  // ── AI / tools (upper right-center)
  ai_prompt: [0.36, 0.40],
  ai_knowledge: [0.36, 0.40],
  tool: [0.52, 0.50],
  software: [0.50, 0.50],
  workflow: [0.46, 0.56],

  // ── Documents / archives (lower right — temporal)
  document: [0.60, 0.42],
  asset: [-0.48, 0.28],

  // ── Journal / memory (center left — temporal lobe)
  journal_entry: [-0.34, -0.04],
  memory: [-0.28, 0.14],
  decision: [0.04, 0.18],

  // ── Finance / resources (left center)
  finance_goal: [-0.44, 0.08],
  finance_item: [-0.44, 0.08],

  // ── People / relationships (lower center-left — limbic social)
  person: [-0.18, 0.26],
  relationship_person: [-0.18, 0.26],
  role_model: [-0.26, 0.40],
  organization: [0.14, 0.28],

  // ── Gratitude / emotional (lower left)
  gratitude: [-0.54, 0.38],
  gratitude_entry: [-0.54, 0.38],

  // ── Quotes / values (lower center — meaning)
  quote: [-0.10, 0.50],
  value: [-0.04, 0.54],

  // ── Bucket list / desires (lower center-left)
  bucket_item: [-0.34, 0.52],
  bucket_list_item: [-0.34, 0.52],

  // ── Health (lower left-center)
  health_goal: [-0.27, 0.54],

  // ── Identity / core self (center)
  about_me: [0.0, 0.04],

  // ── Habits / routines (lower center — cerebellum)
  habit: [0.08, 0.60],

  // ── Daily plans (lower right-center — cerebellum)
  daily_plan: [0.24, 0.58],

  // ── Events (right-center)
  event: [0.33, 0.14],
};

/** Life-area-specific anchors (used when brainType === "life_area"). */
const LIFE_AREA_ANCHORS: Record<string, [number, number]> = {
  career: [0.62, 0.17],
  finance: [-0.44, 0.08],
  health: [-0.27, 0.54],
  relationships: [-0.18, 0.26],
  learning: [0.0, -0.55],
  creativity: [-0.62, -0.10],
  music: [-0.54, 0.22],
  ai_product: [0.36, 0.40],
  personal_growth: [-0.54, -0.40],
  travel: [-0.38, 0.56],
  family: [-0.42, 0.38],
  business: [0.42, 0.10],
};

/** Value-anchor positions (all cluster in lower-center meaning zone). */
function valueAnchorPos(slug: string): [number, number] {
  // Spread values across lower-center so they don't all stack at 0,0.
  const spread: Record<string, [number, number]> = {
    discipline: [-0.06, 0.52],
    freedom: [0.08, 0.54],
    growth: [-0.14, 0.48],
    courage: [-0.02, 0.58],
    resilience: [-0.18, 0.52],
    kindness: [0.16, 0.46],
    honesty: [0.06, 0.50],
    curiosity: [0.22, 0.44],
    creativity: [-0.24, 0.46],
    love: [-0.10, 0.60],
    gratitude: [-0.20, 0.58],
    service: [0.20, 0.52],
    purpose: [-0.04, 0.62],
    wisdom: [-0.16, 0.44],
    simplicity: [0.14, 0.58],
    excellence: [0.24, 0.56],
    presence: [0.02, 0.44],
    patience: [-0.26, 0.42],
    responsibility: [0.18, 0.40],
  };
  return spread[slug] ?? [0.0, 0.54];
}

/** Smart-tag anchors (mapped via their topic's life areas). */
const TOPIC_ANCHORS: Record<string, [number, number]> = {
  "ai": [0.36, 0.40],
  "ai-agents": [0.44, 0.36],
  "ai-music": [-0.28, 0.16],
  "llm": [0.40, 0.42],
  "product-management": [0.55, -0.28],
  "startup": [0.48, 0.06],
  "music-education": [-0.50, 0.10],
  "piano": [-0.56, 0.14],
  "d-festival": [-0.46, -0.04],
  "performance": [-0.58, 0.08],
  "competition": [-0.52, -0.10],
  "student-recruitment": [-0.40, 0.04],
  "graduate-school": [-0.38, -0.32],
  "law-school": [-0.32, -0.30],
  "personal-brand": [0.46, -0.16],
  "savings": [-0.46, 0.04],
  "investment": [-0.50, 0.02],
  "budget": [-0.42, 0.14],
  "discipline": [-0.06, 0.52],
  "anxiety": [-0.22, 0.36],
  "habits": [0.08, 0.60],
  "reflection": [-0.26, 0.28],
  "productivity": [0.14, -0.22],
  "automation": [0.42, 0.30],
  "sleep": [-0.28, 0.56],
  "exercise": [-0.22, 0.52],
  "mentor": [-0.12, 0.30],
};

// ────────────────────────────────────────────────────────────────────────────
// Node classification
// ────────────────────────────────────────────────────────────────────────────

type NodeTier =
  | "hub_pinned"      // life_area, value anchors — always pinned
  | "hub_domain"      // major domain nodes (goal, project, about_me) — pinned when important
  | "child";          // individual items — initial position only

type NodeClassification = {
  tier: NodeTier;
  anchorPos: [number, number]; // normalized
};

export function classifyNode(node: ConstellationNode): NodeClassification {
  const meta = (node.metadata ?? {}) as Record<string, unknown>;
  const brainType = (meta.brainType as string) ?? node.type;
  const anchorKind = meta.anchorKind as string | undefined;
  const anchorSlug = meta.anchorSlug as string | undefined;
  const importance = node.importance ?? 0.5;
  const conn = node.connectionCount ?? 0;

  // ── Tier 1: Virtual anchor nodes ───────────────────────────────────────
  if (brainType === "life_area" || anchorKind === "life_area") {
    const slug = anchorSlug ?? "";
    const pos = LIFE_AREA_ANCHORS[slug] ?? [0.0, 0.0];
    return { tier: "hub_pinned", anchorPos: pos };
  }
  if (brainType === "value" || anchorKind === "value") {
    const slug = anchorSlug ?? "";
    const pos = valueAnchorPos(slug);
    return { tier: "hub_pinned", anchorPos: pos };
  }
  if (brainType === "smart_tag" || anchorKind === "topic") {
    const slug = anchorSlug ?? "";
    const pos = TOPIC_ANCHORS[slug] ?? DOMAIN_ANCHORS["tag"] ?? [0.0, -0.3];
    return { tier: "hub_pinned", anchorPos: pos };
  }

  // ── Tier 2: Domain hubs ─────────────────────────────────────────────────
  // High-importance nodes of "hub" types get pinned.
  const isHubType =
    brainType === "about_me" ||
    (brainType === "goal" && (importance >= 0.9 || conn >= 4)) ||
    (brainType === "project" && (importance >= 0.85 || conn >= 4)) ||
    (brainType === "career_project" && importance >= 0.85);

  const rawAnchor =
    DOMAIN_ANCHORS[brainType] ??
    DOMAIN_ANCHORS[node.type] ??
    ([0.0, 0.0] as [number, number]);

  if (isHubType) {
    return { tier: "hub_domain", anchorPos: rawAnchor };
  }

  // ── Tier 3: Children ────────────────────────────────────────────────────
  return { tier: "child", anchorPos: rawAnchor };
}

// ────────────────────────────────────────────────────────────────────────────
// Seeded PRNG (deterministic jitter from node id)
// ────────────────────────────────────────────────────────────────────────────
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    h = (h >>> 0);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main layout function
// ────────────────────────────────────────────────────────────────────────────

export type PositionedNode = ConstellationNode & {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
};

/**
 * Apply brain-shaped layout to graph nodes. Returns new node objects with
 * `x`, `y`, and optionally `fx`/`fy` properties that react-force-graph-2d
 * reads for initial / fixed positions.
 *
 * Pure function — does not mutate input.
 *
 * Hub nodes (life_area, value, high-importance domain nodes) are pinned
 * (fx/fy set). Child nodes get initial x/y near their domain hub.
 */
export function generateBrainShapedLayout(
  data: ConstellationGraphData,
): ConstellationGraphData {
  const { nodes, edges } = data;
  if (nodes.length === 0) return data;

  // ── Group nodes by their anchor zone ──────────────────────────────────
  // Key = anchor position (stringified) → list of node ids at that anchor
  const anchorGroups = new Map<string, string[]>();
  const classMap = new Map<string, NodeClassification>();

  for (const node of nodes) {
    const cls = classifyNode(node);
    classMap.set(node.id, cls);
    const key = `${cls.anchorPos[0].toFixed(3)},${cls.anchorPos[1].toFixed(3)}`;
    const g = anchorGroups.get(key);
    if (g) g.push(node.id);
    else anchorGroups.set(key, [node.id]);
  }

  // ── Sort nodes within each group: hubs first, then by connection count ─
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const ids of anchorGroups.values()) {
    ids.sort((a, b) => {
      const tierRank = { hub_pinned: 0, hub_domain: 1, child: 2 };
      const ca = classMap.get(a)!;
      const cb = classMap.get(b)!;
      if (ca.tier !== cb.tier) return tierRank[ca.tier] - tierRank[cb.tier];
      const na = nodeById.get(a);
      const nb = nodeById.get(b);
      return (nb?.connectionCount ?? 0) - (na?.connectionCount ?? 0);
    });
  }

  // ── Assign positions ───────────────────────────────────────────────────
  // Golden angle for Fibonacci spiral child distribution.
  const GOLDEN_ANGLE = 2.399963; // radians ≈ 137.5°

  const positionedNodes: PositionedNode[] = nodes.map((node) => {
    const cls = classMap.get(node.id)!;
    const [nx, ny] = cls.anchorPos;
    const [hwx, hwy] = norm2world(nx, ny);

    if (cls.tier === "hub_pinned") {
      // Hard-pin virtual anchors.
      const [cx, cy] = clampToBrain(hwx, hwy);
      return { ...node, x: cx, y: cy, fx: cx, fy: cy };
    }

    if (cls.tier === "hub_domain") {
      // Semi-pin important domain nodes with slight random nudge so they
      // don't overlap perfectly when multiple "goal" nodes exist.
      const rng = seededRandom(node.id + "hub");
      const nudge = 18;
      const angle = rng() * Math.PI * 2;
      const r = rng() * nudge;
      const [cx, cy] = clampToBrain(hwx + Math.cos(angle) * r, hwy + Math.sin(angle) * r);
      return { ...node, x: cx, y: cy, fx: cx, fy: cy };
    }

    // ── Child node: spiral around hub ───────────────────────────────────
    // Find index of this node in its anchor group.
    const key = `${nx.toFixed(3)},${ny.toFixed(3)}`;
    const group = anchorGroups.get(key) ?? [];

    const rng = seededRandom(node.id + "child");

    // Hub nodes (tier 0, 1) in the same group take no child-slot radius.
    // Only count children (tier 2) for spiral index.
    const childCount = group.filter(
      (id) => classMap.get(id)?.tier === "child",
    ).length;

    // Effective index among children only.
    const childIds = group.filter((id) => classMap.get(id)?.tier === "child");
    const childIndex = childIds.indexOf(node.id);

    if (childIndex < 0) {
      // Shouldn't happen; just place at anchor.
      const [cx, cy] = clampToBrain(hwx, hwy);
      return { ...node, x: cx, y: cy };
    }

    // Base radius depends on child count — more children → larger spread.
    const baseR = Math.max(
      48,
      Math.min(205, 42 + Math.sqrt(childCount + 1) * 22),
    );
    // Fibonacci spiral radius grows with index.
    const spiralR = baseR + Math.sqrt(childIndex + 1) * 25;
    const angle = childIndex * GOLDEN_ANGLE + rng() * 0.28;
    // Slight random radial jitter for organic feel.
    const radJitter = (rng() - 0.5) * 34;
    const r = spiralR + radJitter;

    const candX = hwx + Math.cos(angle) * r;
    const candY = hwy + Math.sin(angle) * r;
    const [cx, cy] = clampToBrain(candX, candY);
    return { ...node, x: cx, y: cy };
  });

  return { nodes: positionedNodes as unknown as ConstellationNode[], edges };
}
