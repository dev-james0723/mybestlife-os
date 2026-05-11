/**
 * Tiny deterministic force-directed layout for small career networks.
 *
 * This is a pragmatic single-pass layout, not a simulation. It:
 *   1. Seeds each node's position using a stable hash of its id.
 *   2. Runs a small fixed number of Fruchterman–Reingold iterations with
 *      mild gravity, so the picture settles in deterministic coordinates.
 *   3. Returns absolute 2D positions for rendering with plain SVG.
 *
 * Node/edge input is intentionally kept untyped beyond the fields the
 * layout needs, so callers can feed the DB rows directly.
 */
export type ForceNode = { id: string; size?: number };
export type ForceEdge = { source: string; target: string };

export type LayoutPosition = { id: string; x: number; y: number };

export function layoutNetwork(
  nodes: ForceNode[],
  edges: ForceEdge[],
  opts?: {
    width?: number;
    height?: number;
    iterations?: number;
    seed?: string;
  },
): LayoutPosition[] {
  const width = opts?.width ?? 800;
  const height = opts?.height ?? 600;
  const iterations = opts?.iterations ?? 80;
  const seed = opts?.seed ?? "career-network";

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const h = hash(seed + ":" + n.id);
    // Distribute nodes on a shrinking spiral for a visually calm initial state.
    const theta = (h % 360) * (Math.PI / 180);
    const r = Math.sqrt((h * 2654435761) % 1_000_000) / 1000;
    positions.set(n.id, {
      x: width / 2 + r * Math.cos(theta) * (width / 6),
      y: height / 2 + r * Math.sin(theta) * (height / 6),
    });
  }

  if (nodes.length === 0) return [];

  const adj = buildAdjacency(edges);
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1));
  const area = width * height;
  const idealDist = 0.6 * Math.sqrt(area / Math.max(nodes.length, 1));

  for (let iter = 0; iter < iterations; iter += 1) {
    const temp = Math.max(1, (1 - iter / iterations) * (Math.max(width, height) / 10));

    const disp = new Map<string, { dx: number; dy: number }>();
    for (const n of nodes) disp.set(n.id, { dx: 0, dy: 0 });

    // Repulsion between every pair.
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const pa = positions.get(a.id);
      if (!pa) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const pb = positions.get(b.id);
        if (!pb) continue;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        // Prevent extreme spikes at zero distance.
        if (dist < 0.1) {
          dx = (Math.random() - 0.5) * 0.1;
          dy = (Math.random() - 0.5) * 0.1;
          dist = 0.1;
        }
        const force = (k * k) / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        const da = disp.get(a.id)!;
        const db = disp.get(b.id)!;
        da.dx += ux * force;
        da.dy += uy * force;
        db.dx -= ux * force;
        db.dy -= uy * force;
      }
    }

    // Attraction along edges.
    for (const [s, neighbours] of adj) {
      const ps = positions.get(s);
      if (!ps) continue;
      for (const t of neighbours) {
        const pt = positions.get(t);
        if (!pt) continue;
        const dx = ps.x - pt.x;
        const dy = ps.y - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist * dist) / idealDist;
        const ux = dx / dist;
        const uy = dy / dist;
        const ds = disp.get(s)!;
        ds.dx -= ux * force;
        ds.dy -= uy * force;
      }
    }

    // Apply displacement + gentle gravity pulling toward center.
    for (const n of nodes) {
      const p = positions.get(n.id);
      const d = disp.get(n.id);
      if (!p || !d) continue;
      const mag = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 0.01;
      const capped = Math.min(mag, temp);
      p.x += (d.dx / mag) * capped;
      p.y += (d.dy / mag) * capped;

      const gx = width / 2 - p.x;
      const gy = height / 2 - p.y;
      p.x += gx * 0.01;
      p.y += gy * 0.01;

      p.x = Math.max(20, Math.min(width - 20, p.x));
      p.y = Math.max(20, Math.min(height - 20, p.y));
    }
  }

  return nodes.map((n) => ({
    id: n.id,
    ...positions.get(n.id)!,
  }));
}

function buildAdjacency(edges: ForceEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  return adj;
}

/** djb2-style hash — stable across renders. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}
