/**
 * Concentric ring layout for local-graph depth mode (center = depth 0).
 * Depth-1 nodes sit on the inner ring; depth-2 on the middle ring in
 * angular wedges around their depth-1 parent; depth-3 on the outer ring
 * around their depth-2 parent. Radii scale with viewport so rings stay
 * separated on large canvases.
 *
 * Depth-1 nodes are grouped into visual sectors by type / category /
 * relation metadata so the inner ring reads as grouped arcs rather than
 * a random shuffle.
 */

import type { ConstellationNode } from "@/types/constellation";

export type LocalSubgraphRingLayoutInput = {
  centerNodeId: string;
  nodeDepthMap: ReadonlyMap<string, number>;
  parentIdMap: ReadonlyMap<string, string | null>;
  /** Larger radii + wider wedges when the user triggers exploded focus. */
  exploded: boolean;
  /** Min(width,height) of the graph container — drives ring radii. */
  viewportMin?: number;
  /**
   * When provided, depth-1 nodes are laid out in sectors (one arc per
   * group). Falls back to an even ring when omitted or empty.
   */
  nodes?: readonly ConstellationNode[];
  /** Orbit depth selector — widens ring spacing at 2 and 3 for context. */
  viewDepth?: 1 | 2 | 3;
};

/** Stable sector key for grouping direct neighbors on the inner ring. */
export function localOrbitSectorKey(node: ConstellationNode): string {
  const meta = (node.metadata ?? {}) as Record<string, unknown>;
  const rel =
    meta.relationType ?? meta.brainRelationType ?? meta.relation_type;
  if (typeof rel === "string" && rel.trim().length > 0) return `r:${rel}`;
  if (node.category && String(node.category).trim())
    return `c:${String(node.category)}`;
  if (node.sourceType) return `s:${node.sourceType}`;
  return `t:${node.type}`;
}

/**
 * Returns map of node id → position offset from the center node.
 */
export function computeLocalSubgraphRingLayout(
  input: LocalSubgraphRingLayoutInput,
): Map<string, { x: number; y: number }> {
  const {
    centerNodeId,
    nodeDepthMap,
    parentIdMap,
    exploded,
    viewportMin,
    nodes,
    viewDepth = 1,
  } = input;
  const pos = new Map<string, { x: number; y: number }>();
  if (!nodeDepthMap.has(centerNodeId)) return pos;

  const vmin = viewportMin && viewportMin > 160 ? viewportMin : 640;
  const scale = Math.min(1.3, Math.max(0.84, vmin / 680));
  const depthBoost = viewDepth >= 3 ? 1.1 : viewDepth === 2 ? 1.05 : 1;

  const R1 = scale * (exploded ? 268 : 218) * depthBoost;
  const R2 = scale * (exploded ? 438 : 378) * depthBoost;
  const R3 = scale * (exploded ? 655 : 568) * depthBoost;

  pos.set(centerNodeId, { x: 0, y: 0 });

  const base = -Math.PI / 2;

  const d1Ids = [...nodeDepthMap.entries()]
    .filter(([, d]) => d === 1)
    .map(([id]) => id);

  const nodeById = new Map((nodes ?? []).map((n) => [n.id, n]));

  if (d1Ids.length > 0 && nodeById.size > 0) {
    const groups = new Map<string, string[]>();
    for (const id of d1Ids) {
      const n = nodeById.get(id);
      const key = n ? localOrbitSectorKey(n) : "t:unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(id);
    }
    const sectorKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    const sectorCount = Math.max(1, sectorKeys.length);
    const fullCircle = Math.PI * 2;
    const pad = 0.035 * fullCircle;
    let cursor = base + pad / 2;
    for (const sk of sectorKeys) {
      const ids = (groups.get(sk) ?? []).sort((a, b) => a.localeCompare(b));
      const sectorWidth = (fullCircle - pad) / sectorCount;
      const innerPad = sectorWidth * 0.07;
      const span = Math.max(sectorWidth - innerPad, 0.02);
      const n = ids.length;
      ids.forEach((id, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const ang = cursor + innerPad / 2 + t * span;
        pos.set(id, { x: Math.cos(ang) * R1, y: Math.sin(ang) * R1 });
      });
      cursor += sectorWidth;
    }
  } else {
    const sorted = d1Ids.sort((a, b) => a.localeCompare(b));
    const n1 = sorted.length;
    sorted.forEach((id, i) => {
      const ang = base + (n1 > 0 ? (i / n1) : 0) * Math.PI * 2;
      pos.set(id, { x: Math.cos(ang) * R1, y: Math.sin(ang) * R1 });
    });
  }

  const angleOf = (id: string): number => {
    const p = pos.get(id);
    if (!p) return 0;
    return Math.atan2(p.y, p.x);
  };

  const d2ByParent = new Map<string, string[]>();
  for (const [id, d] of nodeDepthMap) {
    if (d !== 2) continue;
    const p = parentIdMap.get(id);
    if (!p || p === centerNodeId) continue;
    if (!d2ByParent.has(p)) d2ByParent.set(p, []);
    d2ByParent.get(p)!.push(id);
  }
  for (const kids of d2ByParent.values()) {
    kids.sort((a, b) => a.localeCompare(b));
  }

  const maxWedge2 = exploded ? Math.PI * 0.95 : Math.PI * 0.64;
  for (const [parentId, kids] of d2ByParent) {
    const pAng = angleOf(parentId);
    const m = kids.length;
    const wedge = Math.min(maxWedge2, Math.PI / Math.max(2.1, m));
    kids.forEach((id, k) => {
      const t = m === 1 ? 0 : (k / (m - 1) - 0.5) * wedge;
      const ang = pAng + t;
      pos.set(id, { x: Math.cos(ang) * R2, y: Math.sin(ang) * R2 });
    });
  }

  const d2CenterKids: string[] = [];
  for (const [id, d] of nodeDepthMap) {
    if (d !== 2) continue;
    const p = parentIdMap.get(id);
    if (p === centerNodeId) d2CenterKids.push(id);
  }
  d2CenterKids.sort((a, b) => a.localeCompare(b));
  if (d2CenterKids.length > 0) {
    const m = d2CenterKids.length;
    d2CenterKids.forEach((id, k) => {
      const ang =
        base + (m > 0 ? ((k + 0.5) / m) * Math.PI * 2 : 0);
      pos.set(id, { x: Math.cos(ang) * R2, y: Math.sin(ang) * R2 });
    });
  }

  const d3ByParent = new Map<string, string[]>();
  for (const [id, d] of nodeDepthMap) {
    if (d !== 3) continue;
    const p = parentIdMap.get(id);
    if (!p) continue;
    if (!d3ByParent.has(p)) d3ByParent.set(p, []);
    d3ByParent.get(p)!.push(id);
  }
  for (const kids of d3ByParent.values()) {
    kids.sort((a, b) => a.localeCompare(b));
  }

  const maxWedge3 = exploded ? Math.PI * 0.78 : Math.PI * 0.52;
  for (const [parentId, kids] of d3ByParent) {
    const pAng = angleOf(parentId);
    const m = kids.length;
    const wedge = Math.min(maxWedge3, Math.PI / Math.max(2.3, m));
    kids.forEach((id, k) => {
      const t = m === 1 ? 0 : (k / (m - 1) - 0.5) * wedge;
      const ang = pAng + t;
      pos.set(id, { x: Math.cos(ang) * R3, y: Math.sin(ang) * R3 });
    });
  }

  return pos;
}
