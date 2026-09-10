import { z } from "zod";

export const POND_VERSION = 3 as const;
export const POND_COLUMNS = 4;
export const POND_SLOTS = 12;
export const pondKindSchema = z.enum(["reed", "leaf", "stone", "perch"]);
export const pondSpeciesSchema = z.enum(["dawnfish", "leafsnail", "dragonfly"]);
export type PondKind = z.infer<typeof pondKindSchema>;
export type PondSpecies = z.infer<typeof pondSpeciesSchema>;
export const pondObjectSchema = z.object({
  id: z.string().min(1).max(80),
  kind: pondKindSchema,
  slot: z.number().int().min(0).max(11).nullable(),
  rotation: z.number().int().min(0).max(3),
  grant_id: z.string().uuid().nullable(),
});
export type PondObject = z.infer<typeof pondObjectSchema>;
export const pondWorldSchema = z.object({
  schema_version: z.literal(POND_VERSION),
  revision: z.number().int().nonnegative(),
  objects: z.array(pondObjectSchema).max(2000),
  discoveries: z.array(pondSpeciesSchema).max(3),
  observed_layouts: z.array(z.string().max(160)).max(64),
  fish_ready_at: z.string().datetime({ offset: true }).nullable(),
  fish_adult: z.boolean(),
});
export type PondWorld = z.infer<typeof pondWorldSchema>;

export function createStarterPond(): PondWorld {
  return {
    schema_version: POND_VERSION, revision: 0,
    objects: [
      { id: "starter-reed-1", kind: "reed", slot: 0, rotation: 0, grant_id: null },
      { id: "starter-reed-2", kind: "reed", slot: null, rotation: 0, grant_id: null },
      { id: "starter-stone", kind: "stone", slot: 5, rotation: 0, grant_id: null },
      { id: "starter-leaf", kind: "leaf", slot: null, rotation: 0, grant_id: null },
    ],
    discoveries: [], observed_layouts: [], fish_ready_at: null, fish_adult: false,
  };
}

export function pondNeighbours(slot: number): number[] {
  if (!Number.isInteger(slot) || slot < 0 || slot >= POND_SLOTS) return [];
  return [slot - 4, ...(slot % 4 < 3 ? [slot + 1] : []), slot + 4,
    ...(slot % 4 > 0 ? [slot - 1] : [])].filter((n) => n >= 0 && n < POND_SLOTS);
}

export function pondCells(objects: readonly PondObject[]): (PondKind | null)[] {
  const cells: (PondKind | null)[] = Array(POND_SLOTS).fill(null);
  for (const object of objects) if (object.slot !== null) cells[object.slot] = object.kind;
  return cells;
}

/** Canonical spatial identity ignores object IDs and storage; moving a copy is not a new solution. */
export function pondLayoutKey(objects: readonly PondObject[]): string {
  return Array.from({ length: POND_SLOTS }, (_, slot) => {
    const o = objects.find((item) => item.slot === slot);
    return o ? `${o.kind}:${o.kind === "stone" ? o.rotation : 0}` : "water";
  }).join("|");
}

export function assessPond(objects: readonly PondObject[], discoveries: readonly PondSpecies[] = []) {
  const cells = pondCells(objects), visited = new Set<number>();
  let largestOpenWater = 0;
  const components: number[][] = [];
  for (let i = 0; i < POND_SLOTS; i++) {
    if (cells[i] !== null || visited.has(i)) continue;
    const queue = [i], component: number[] = [];
    visited.add(i);
    while (queue.length) {
      const slot = queue.shift()!;
      component.push(slot);
      for (const n of pondNeighbours(slot)) if (cells[n] === null && !visited.has(n)) {
        visited.add(n); queue.push(n);
      }
    }
    components.push(component);
    largestOpenWater = Math.max(largestOpenWater, component.length);
  }
  const reedPair = cells.some((kind, slot) => kind === "reed" &&
    pondNeighbours(slot).some((n) => cells[n] === "reed") &&
    pondNeighbours(slot).some((n) => cells[n] === null));
  const openWater = cells.filter((cell) => cell === null).length;
  return {
    largestOpenWater, openWater, components,
    dawnfish: largestOpenWater >= 3,
    leafsnail: reedPair,
    dragonfly: discoveries.includes("dawnfish") && discoveries.includes("leafsnail") &&
      cells.includes("perch") && cells.includes("leaf") && openWater >= 2,
  };
}

/** Stones influence a route's preferred direction; obstacles and all movement stay on the grid. */
export function pondFlowDirection(slot: number, objects: readonly PondObject[]): number | null {
  const stone = objects.find((object) => object.kind === "stone" && object.slot !== null &&
    pondNeighbours(slot).includes(object.slot));
  return stone?.rotation ?? null;
}

export function pondPathBetween(from: number, to: number, objects: readonly PondObject[]): number[] | null {
  const cells = pondCells(objects);
  if (!pondNeighbours(from).length || !pondNeighbours(to).length || cells[from] || cells[to]) return null;
  const queue = [from], previous = new Map<number, number | null>([[from, null]]);
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) {
      const result = [to]; let cursor = previous.get(to);
      while (cursor !== null && cursor !== undefined) { result.unshift(cursor); cursor = previous.get(cursor); }
      return result;
    }
    const direction = pondFlowDirection(at, objects);
    const preferred = direction === null ? -1 : [at - 4, at + 1, at + 4, at - 1][direction];
    const neighbours = pondNeighbours(at).sort((a, b) => Number(b === preferred) - Number(a === preferred));
    for (const n of neighbours) if (!cells[n] && !previous.has(n)) { previous.set(n, at); queue.push(n); }
  }
  return null;
}

/** Three ripples form a real traversable route, not a click-count reward. */
export function tracePondRoute(anchors: readonly number[], objects: readonly PondObject[]) {
  if (anchors.length !== 3 || new Set(anchors).size !== 3) return { ok: false as const, reason: "three-ripples" as const, path: [] };
  const first = pondPathBetween(anchors[0], anchors[1], objects);
  const second = pondPathBetween(anchors[1], anchors[2], objects);
  if (!first || !second) return { ok: false as const, reason: "blocked" as const, path: [] };
  const path = [...first, ...second.slice(1)];
  const turning = path.slice(2).some((slot, i) => slot - path[i + 1] !== path[i + 1] - path[i] && slot !== path[i]);
  if (!turning) return { ok: false as const, reason: "try-a-bend" as const, path };
  return { ok: true as const, reason: null, path };
}

/** Local preview only. The server independently validates ownership, slots, revision and grants. */
export function previewPondPlacement(world: PondWorld, id: string, slot: number | null, rotation: number) {
  if (slot !== null && (!Number.isInteger(slot) || slot < 0 || slot >= POND_SLOTS)) throw new Error("Invalid pond position");
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 3) throw new Error("Invalid rotation");
  if (!world.objects.some((o) => o.id === id)) throw new Error("Object is not owned");
  if (slot !== null && world.objects.some((o) => o.id !== id && o.slot === slot)) throw new Error("This position is occupied");
  return { ...world, objects: world.objects.map((o) => o.id === id ? { ...o, slot, rotation } : o) };
}

export const pondCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("move"), object_id: z.string().min(1).max(80), slot: z.number().int().min(0).max(11).nullable(), rotation: z.number().int().min(0).max(3) }).strict(),
  z.object({ kind: z.literal("build"), grant_id: z.string().uuid(), recipe: pondKindSchema, slot: z.number().int().min(0).max(11), rotation: z.number().int().min(0).max(3) }).strict(),
  z.object({ kind: z.literal("observe"), species: pondSpeciesSchema, anchors: z.array(z.number().int().min(0).max(11)).max(3).default([]) }).strict(),
  z.object({ kind: z.literal("grow") }).strict(),
]);
export type PondCommand = z.infer<typeof pondCommandSchema>;
export const pondPendingSchema = z.object({
  id: z.string().uuid(), account: z.string().uuid(), version: z.literal(POND_VERSION),
  revision: z.number().int().nonnegative(), command: pondCommandSchema,
});
export type PondPending = z.infer<typeof pondPendingSchema>;
