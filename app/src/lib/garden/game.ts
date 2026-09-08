/** Pure simulation shared by WebGL, accessible controls and deterministic tests. */
export type Point = { x: number; z: number };
export type GardenMode = "relaxed" | "challenge";
export type GardenPhase = "ready" | "playing" | "paused" | "won" | "timeout";
export type GardenSignal = "pickup" | "bloom" | "full" | "need-dew" | "win" | null;
export type GardenRound = {
  day: string;
  mode: GardenMode;
  phase: GardenPhase;
  player: Point;
  target: Point | null;
  drops: (Point & { id: number; collected: boolean })[];
  beds: (Point & { id: number; bloomed: boolean })[];
  dew: number;
  elapsed: number;
  signal: GardenSignal;
  revision: number;
};
export const GARDEN_CAPACITY = 3;
export const BED_COST = 2;
export const ROUND_SECONDS = 90;
export const GARDEN_SPEED = 3.2;
export const POND = { x: 1.7, z: 0.55, radius: 1.1 };

export function gardenDay(date = new Date()): string {
  // Matches the existing account-backed garden's UTC date boundary on every device.
  return date.toISOString().slice(0, 10);
}
export function dayBefore(day: string, amount = 1): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) - amount * 86400000).toISOString().slice(0, 10);
}
export function daySeed(day: string): number {
  let value = 2166136261;
  for (const char of day) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}
export function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createGardenRound(day: string, mode: GardenMode = "relaxed", startingDew = 0): GardenRound {
  const rng = seededRandom(daySeed(day));
  const flip = rng() > 0.5 ? 1 : -1;
  const spots: Point[] = [
    { x: -3.3, z: 0.25 }, { x: -1.2, z: -2.1 }, { x: 0.3, z: -2.8 },
    { x: 3.15, z: -0.55 }, { x: 2.5, z: 2.2 }, { x: -0.8, z: 2.8 },
  ];
  return {
    day, mode, phase: "ready", player: { x: 0, z: 2.1 }, target: null,
    drops: spots.map((p, id) => ({ id, x: p.x * flip + (rng() - 0.5) * 0.35, z: p.z + (rng() - 0.5) * 0.35, collected: false })),
    beds: [{ id: 0, x: -3.1, z: -1.8, bloomed: false }, { id: 1, x: 2.3, z: -2.35, bloomed: false }, { id: 2, x: -2.25, z: 2.2, bloomed: false }],
    dew: Math.max(0, Math.min(2, Math.floor(startingDew))), elapsed: 0, signal: null, revision: 0,
  };
}
export function boundPoint(point: Point): Point {
  const length = Math.hypot(point.x / 4.55, point.z / 3.6);
  return length > 1 ? { x: point.x / length, z: point.z / length } : point;
}
export function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z); }

/** Mutates only the round owned by one renderer. Delta is clamped to avoid tab-resume jumps. */
export function stepGarden(round: GardenRound, delta: number, direction?: Point): void {
  if (round.phase !== "playing") return;
  const dt = Math.max(0, Math.min(delta, 0.05));
  round.elapsed += dt;
  if (round.mode === "challenge" && round.elapsed >= ROUND_SECONDS) {
    round.phase = "timeout"; round.target = null; round.revision++; return;
  }
  let dx = direction?.x ?? 0, dz = direction?.z ?? 0;
  if (dx || dz) round.target = null;
  else if (round.target) {
    dx = round.target.x - round.player.x; dz = round.target.z - round.player.z;
    if (Math.hypot(dx, dz) < 0.04) { round.target = null; dx = 0; dz = 0; }
  }
  const length = Math.hypot(dx, dz);
  if (length) {
    const slowed = distance(round.player, POND) < POND.radius ? 0.58 : 1;
    const step = Math.min(GARDEN_SPEED * dt * slowed, round.target ? length : Infinity);
    round.player = boundPoint({ x: round.player.x + dx / length * step, z: round.player.z + dz / length * step });
  }
  for (const drop of round.drops) {
    if (drop.collected || distance(round.player, drop) > 0.48) continue;
    if (round.dew >= GARDEN_CAPACITY) continue;
    drop.collected = true; round.dew++; round.signal = "pickup"; round.revision++;
  }
  for (const bed of round.beds) {
    if (bed.bloomed || distance(round.player, bed) > 0.72 || round.dew < BED_COST) continue;
    bed.bloomed = true; round.dew -= BED_COST; round.signal = "bloom"; round.revision++;
  }
  if (round.beds.every(b => b.bloomed)) {
    round.phase = "won"; round.target = null; round.signal = "win"; round.revision++;
  }
}
export function gardenSnapshot(round: GardenRound): GardenRound {
  return { ...round, player: { ...round.player }, drops: round.drops.map(d => ({ ...d })), beds: round.beds.map(b => ({ ...b })) };
}
export function gardenMedal(round: GardenRound): number {
  if (round.phase !== "won") return 0;
  return round.mode === "relaxed" ? 1 : round.elapsed < 35 ? 3 : round.elapsed < 60 ? 2 : 1;
}
