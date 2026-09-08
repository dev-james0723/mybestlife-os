import { createClient } from "@/lib/supabase/client";
import {
  adventureActionSchema,
  adventureSaveSchema,
  adventureSettingsSchema,
  defaultAdventureSettings,
  resolveGardenTimezone,
  type AdventureSave,
  type AdventureSettings,
} from "@/lib/garden/persistence";
import type { AdventureAction } from "@/lib/garden/adventure";

async function clientFor(expectedUserId: string) {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== expectedUserId)
    throw new Error("Garden account changed. Reopen your garden.");
  return client;
}
export const gardenAdventureRepository = {
  async notificationEnabled(userId: string): Promise<boolean> {
    const client = await clientFor(userId);
    const { data, error } = await client
      .from("notification_preferences")
      .select("daily_summary")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.daily_summary === true;
  },
  async identity(userId: string): Promise<{
    pet: "xiaoba" | "doge";
    name: string;
    enabled: boolean;
    timezone: string;
  }> {
    const client = await clientFor(userId);
    const { data, error } = await client
      .from("profiles")
      .select("id,os_buddy_pet_id,os_buddy_name,os_buddy_enabled,timezone")
      .eq("id", userId)
      .single();
    if (error) throw error;
    if (data.id !== userId) throw new Error("Garden account changed");
    const pet = data.os_buddy_pet_id === "doge" ? "doge" : "xiaoba";
    return {
      pet,
      name: String(
        data.os_buddy_name || (pet === "doge" ? "Doge" : "Xiaoba"),
      ).slice(0, 60),
      enabled: data.os_buddy_enabled !== false,
      timezone: resolveGardenTimezone(
        data.timezone,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    };
  },
  async read(userId: string, day: string): Promise<AdventureSave> {
    const client = await clientFor(userId);
    const [events, count, settings] = await Promise.all([
      client
        .from("garden_adventure_events")
        .select("action,created_at")
        .eq("user_id", userId)
        .eq("day", day)
        .order("created_at"),
      client
        .from("garden_adventure_events")
        .select("action", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "deliver"),
      client
        .from("garden_adventure_settings")
        .select(
          "decoration,reminders_enabled,quiet_start,quiet_end,last_invited_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (events.error) throw events.error;
    if (count.error) throw count.error;
    if (settings.error) throw settings.error;
    return {
      day,
      actions: (events.data ?? []).map((row) =>
        adventureActionSchema.parse(row.action),
      ),
      stamps: count.count ?? 0,
      settings: settings.data
        ? adventureSettingsSchema.parse(settings.data)
        : defaultAdventureSettings,
      watered_at: Object.fromEntries(
        (events.data ?? [])
          .filter((row) => row.action.startsWith("water:"))
          .map((row) => [row.action, row.created_at]),
      ),
    };
  },
  async action(
    userId: string,
    day: string,
    action: AdventureAction | "settings" | "invite",
    value: Partial<AdventureSettings> & { timezone?: string } = {},
  ): Promise<AdventureSave> {
    const client = await clientFor(userId);
    const { data, error } = await client.rpc("garden_adventure_action", {
      p_day: day,
      p_action: action,
      p_value: { ...value, account: userId },
    });
    if (error) throw error;
    return adventureSaveSchema.parse(data);
  },
};
