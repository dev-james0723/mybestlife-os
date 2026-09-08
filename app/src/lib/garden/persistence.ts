import { z } from "zod";
import type { AdventureAction } from "./adventure";

export const adventureActionSchema = z
  .string()
  .regex(
    /^(plant:[0-2]|water:[0-2]|harvest:[0-2]|forage:[0-5]|discover:(pond|orchard|lookout)|butterfly|deliver)$/,
  )
  .transform((value) => value as AdventureAction);
export const adventureSettingsSchema = z.object({
  decoration: z
    .enum(["none", "lantern", "bench", "flower-cart"])
    .default("none"),
  reminders_enabled: z.boolean().default(false),
  quiet_start: z.number().int().min(0).max(23).default(22),
  quiet_end: z.number().int().min(0).max(23).default(8),
  last_invited_at: z.string().nullable().default(null),
});
export type AdventureSettings = z.infer<typeof adventureSettingsSchema>;
export const defaultAdventureSettings = adventureSettingsSchema.parse({});
export const adventureSaveSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actions: z.array(adventureActionSchema),
  stamps: z.number().int().nonnegative(),
  settings: adventureSettingsSchema,
  invited: z.boolean().optional(),
  watered_at: z.record(z.string(), z.string()).default({}),
});
export type AdventureSave = z.infer<typeof adventureSaveSchema>;
export type PendingAdventureAction = { day: string; action: AdventureAction };
const pendingSchema = z
  .array(
    z.object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      action: adventureActionSchema,
    }),
  )
  .max(10_000);
export const adventureOutboxKey = (userId: string) =>
  `mblos:garden-adventure:outbox:v2:${userId}`;
export function readAdventureOutbox(
  storage: Pick<Storage, "getItem">,
  userId: string,
): PendingAdventureAction[] {
  try {
    return pendingSchema.parse(
      JSON.parse(storage.getItem(adventureOutboxKey(userId)) ?? "[]"),
    );
  } catch {
    return [];
  }
}
export function addAdventurePending(
  pending: PendingAdventureAction[],
  action: PendingAdventureAction,
): PendingAdventureAction[] {
  return pending.some((p) => p.day === action.day && p.action === action.action)
    ? pending
    : [...pending, action];
}
export function mergeAdventurePending(
  a: PendingAdventureAction[],
  b: PendingAdventureAction[],
  acknowledged?: PendingAdventureAction,
): PendingAdventureAction[] {
  const unique = new Map(
    [...a, ...b].map((item) => [`${item.day}:${item.action}`, item]),
  );
  if (acknowledged) unique.delete(`${acknowledged.day}:${acknowledged.action}`);
  const rank = (action: string) =>
    action.startsWith("plant:")
      ? 0
      : action.startsWith("water:")
        ? 1
        : action.startsWith("harvest:")
          ? 2
          : action === "deliver"
            ? 4
            : 3;
  return [...unique.values()].sort(
    (x, y) => x.day.localeCompare(y.day) || rank(x.action) - rank(y.action),
  );
}
export const decorationMilestones = [
  { id: "none", stamps: 0 },
  { id: "lantern", stamps: 1 },
  { id: "bench", stamps: 3 },
  { id: "flower-cart", stamps: 7 },
] as const;

/** Profiles use "auto" by default. Resolve it before checking local quiet hours. */
export function resolveGardenTimezone(
  value: string | null | undefined,
  deviceTimezone = "UTC",
): string {
  for (const zone of [value, deviceTimezone, "UTC"]) {
    if (!zone || zone.toLowerCase() === "auto") continue;
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
      return zone;
    } catch {
      /* Try the device zone, then UTC. */
    }
  }
  return "UTC";
}

export function gardenInvitationEligible(input: {
  now: Date;
  timezone: string;
  settings: AdventureSettings;
  notificationEnabled: boolean;
  buddyEnabled: boolean;
  focusing: boolean;
  inGarden: boolean;
  playedToday: boolean;
  lastBubbleAt: number | null;
  hidden: boolean;
}): boolean {
  if (
    !input.settings.reminders_enabled ||
    !input.notificationEnabled ||
    !input.buddyEnabled ||
    input.focusing ||
    input.inGarden ||
    input.playedToday ||
    input.hidden
  )
    return false;
  if (
    input.lastBubbleAt &&
    input.now.getTime() - input.lastBubbleAt < 15 * 60_000
  )
    return false;
  if (
    input.settings.last_invited_at &&
    input.now.getTime() - Date.parse(input.settings.last_invited_at) <
      24 * 60 * 60_000
  )
    return false;
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: input.timezone,
        hour: "numeric",
        hourCycle: "h23",
      }).format(input.now),
    );
  } catch {
    return false;
  }
  const { quiet_start: start, quiet_end: end } = input.settings;
  if (start === end) return false;
  return !(start < end
    ? hour >= start && hour < end
    : hour >= start || hour < end);
}
