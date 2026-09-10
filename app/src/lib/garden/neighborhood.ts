import { z } from "zod";
import type { Point } from "./game";

export const GARDEN_NEIGHBORHOOD_EVENT = "mblos:garden-neighborhood-changed";
export const plotIds = ["terrace", "meadow", "orchard", "retreat"] as const;
export type GardenPlotId = (typeof plotIds)[number];
export const gardenPlots = [
  { id: "terrace", name: "Sunrise terrace", zh: "晨光露台", price: 60, x: 21, z: 0, radius: 6, bridge: { x: 15.5, z: 0, halfX: 3.6, halfZ: 1.25 }, entry: { x: 12.5, z: 0 }, center: { x: 18, z: 0 } },
  { id: "meadow", name: "Cloud meadow", zh: "雲間草地", price: 180, x: -21, z: 0, radius: 6, bridge: { x: -15.5, z: 0, halfX: 3.6, halfZ: 1.25 }, entry: { x: -12.5, z: 0 }, center: { x: -18, z: 0 } },
  { id: "orchard", name: "Memory orchard", zh: "回憶果園", price: 420, x: 0, z: -19, radius: 6, bridge: { x: 0, z: -13.5, halfX: 1.25, halfZ: 3.6 }, entry: { x: 0, z: -10.5 }, center: { x: 0, z: -16 } },
  { id: "retreat", name: "Quiet retreat", zh: "靜心小島", price: 900, x: 5, z: 19, radius: 6, bridge: { x: 5, z: 13.5, halfX: 1.25, halfZ: 3.6 }, entry: { x: 5, z: 10 }, center: { x: 5, z: 16 } },
] as const;
export const itemKinds = ["flowerbed", "lantern", "bench", "birdbath", "tree", "pergola"] as const;
export const gardenCatalog = [
  { id: "flowerbed", name: "Wildflower planter", zh: "野花花圃", price: 20, color: "#d8a5ae" },
  { id: "lantern", name: "Evening lantern", zh: "黃昏暖燈", price: 25, color: "#e8c27c" },
  { id: "bench", name: "Oak reading bench", zh: "橡木閱讀椅", price: 30, color: "#b98963" },
  { id: "birdbath", name: "Bird water bowl", zh: "小鳥飲水台", price: 40, color: "#a7bec1" },
  { id: "tree", name: "Blossom tree", zh: "花開小樹", price: 45, color: "#e5b5b9" },
  { id: "pergola", name: "Climbing rose arch", zh: "攀藤玫瑰拱門", price: 60, color: "#9baf8b" },
] as const;
export const gardenResidents = [
  { id: "jun", name: "Jun", zh: "阿樹", role: "A gardener who enjoys a quiet walk", roleZh: "鍾意慢慢散步嘅園丁", price: 0, palette: "sage" },
  { id: "hana", name: "Hana", zh: "小花", role: "A botanist with a notebook", roleZh: "隨身帶住筆記簿嘅植物學家", price: 80, palette: "rose" },
  { id: "bo", name: "Bo", zh: "阿博", role: "A traveler who stops to read", roleZh: "鍾意停低閱讀嘅旅人", price: 120, palette: "indigo" },
] as const;
export const avatarPalette = { sage: "#738d73", clay: "#b57d64", indigo: "#6c80a3", rose: "#b88897" } as const;
const avatarSchema = z.object({ name: z.string().min(1).max(40), palette: z.enum(["sage", "clay", "indigo", "rose"]) });
export type GardenAvatar = z.infer<typeof avatarSchema>;
export const estateItemSchema = z.object({ id: z.string().uuid(), kind: z.enum(itemKinds), plot: z.enum(plotIds).nullable(), slot: z.number().int().min(0).max(15).nullable(), rotation: z.number().int().min(0).max(3) });
export type EstateItem = z.infer<typeof estateItemSchema>;
export const estateSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(), balance: z.number().int().nonnegative(),
  plots: z.array(z.enum(plotIds)).max(4), items: z.array(estateItemSchema).max(96),
  residents: z.array(z.enum(["jun", "hana", "bo"])).max(3), avatar: avatarSchema,
});
export type GardenEstate = z.infer<typeof estateSchema>;
export type GardenLand = Pick<GardenEstate, "plots" | "items">;
export const visitorSchema = z.object({ session_id: z.string().uuid(), avatar: avatarSchema, last_seen: z.string(), wave_at: z.string().nullable() });
export const inviteSchema = z.object({ id: z.string().uuid(), expires_at: z.string(), uses: z.number().int(), max_uses: z.number().int(), revoked: z.boolean(), allow_avatar: z.boolean(), shared_count: z.number().int() });
export const neighborhoodSchema = z.object({ estate: estateSchema, invites: z.array(inviteSchema), visitors: z.array(visitorSchema), ledger: z.array(z.object({ amount: z.number().int(), reason: z.string(), created_at: z.string() })) });
export type GardenNeighborhood = z.infer<typeof neighborhoodSchema>;
export const shareChoiceSchema = z.object({ kind: z.enum(["goal", "project", "role_model"]), id: z.string().uuid(), title: z.string(), status: z.string().nullable(), progress: z.number().nullable() });
export type GardenShareChoice = z.infer<typeof shareChoiceSchema>;
export type GardenShareSelection = Pick<GardenShareChoice, "kind" | "id"> & { show_status: boolean; show_progress: boolean };
export const visitSchema = z.object({ session_id: z.string().uuid(), expires_at: z.string(), owner_avatar: avatarSchema, estate: estateSchema.omit({ balance: true, revision: true }), visitors: z.array(visitorSchema), cards: z.array(shareChoiceSchema), collection: z.array(z.enum(["grass", "sunflower", "lily", "orchid", "apple_tree"])), plant: z.enum(["grass", "sunflower", "lily", "orchid", "apple_tree"]), stage: z.number().int().min(1).max(5) });
export type GardenVisit = z.infer<typeof visitSchema>;
export type NeighborhoodFrame = { estate: GardenLand & Pick<GardenEstate, "residents" | "avatar">; visitors: z.infer<typeof visitorSchema>[] } | null;
export const emptyGardenLand: GardenLand = { plots: [], items: [] };

export function gardenItemPosition(item: EstateItem): Point | null {
  const plot = gardenPlots.find(p => p.id === item.plot);
  if (!plot || item.slot === null) return null;
  return { x: plot.x + (item.slot % 4 - 1.5) * 1.7, z: plot.z + (Math.floor(item.slot / 4) - 1.5) * 1.7 };
}
export function gardenLandContains(p: Point, plots: readonly string[]): boolean {
  if (Math.hypot(p.x / 15.1, p.z / 12.8) <= 1.00001) return true;
  return gardenPlots.some(plot => plots.includes(plot.id) && (
    Math.hypot(p.x - plot.x, p.z - plot.z) <= plot.radius - 0.5 ||
    (Math.abs(p.x - plot.bridge.x) <= plot.bridge.halfX && Math.abs(p.z - plot.bridge.z) <= plot.bridge.halfZ)
  ));
}
/** Project into the union of owned land and bridges, never into unpurchased sky. */
export function projectGardenLand(p: Point, plots: readonly string[]): Point {
  if (gardenLandContains(p, plots)) return p;
  const edge = Math.max(1, Math.hypot(p.x / 15.1, p.z / 12.8));
  const choices: Point[] = [{ x: p.x / edge, z: p.z / edge }];
  for (const plot of gardenPlots.filter(q => plots.includes(q.id))) {
    const dx = p.x - plot.x, dz = p.z - plot.z, d = Math.max(1e-9, Math.hypot(dx, dz));
    choices.push({ x: plot.x + dx / d * Math.min(d, plot.radius - 0.5), z: plot.z + dz / d * Math.min(d, plot.radius - 0.5) });
    choices.push({ x: Math.max(plot.bridge.x - plot.bridge.halfX, Math.min(plot.bridge.x + plot.bridge.halfX, p.x)), z: Math.max(plot.bridge.z - plot.bridge.halfZ, Math.min(plot.bridge.z + plot.bridge.halfZ, p.z)) });
  }
  return choices.reduce((best, next) => Math.hypot(next.x - p.x, next.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? next : best);
}
export function gardenLandObstacles(land?: GardenLand) {
  return (land?.items ?? []).flatMap(item => {
    const p = gardenItemPosition(item);
    return p && land?.plots.includes(item.plot!) ? [{ ...p, radius: item.kind === "pergola" ? 0.62 : 0.48 }] : [];
  });
}
export function newGardenInviteCode(): string { return crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase(); }
export function normalizeGardenInviteCode(code: string): string { return code.replace(/[\s-]/g, "").toUpperCase(); }
export function formatGardenInviteCode(code: string): string { return normalizeGardenInviteCode(code).match(/.{1,4}/g)?.join("-") ?? ""; }
