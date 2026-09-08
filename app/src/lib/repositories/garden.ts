import { createClient } from "@/lib/supabase/client";
import type {
  UserGarden,
  PlantCollectionEntry,
  GardenInventory,
  GardenDailyLog,
  PlantType,
  GardenItemType,
} from "@/types/database";
import { gardenDay, dayBefore } from "@/lib/garden/game";

export const POINTS_PER_STAGE: Record<PlantType, number> = {
  grass: 3,
  sunflower: 5,
  lily: 6,
  orchid: 7,
  apple_tree: 10,
};

const STREAK_BONUS_MULTIPLIER = (streak: number): number => {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
};

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function recordDailyCare(userId: string, day: string): Promise<void> {
  const { error } = await createClient().from("garden_daily_log").upsert(
    { user_id: userId, log_date: day, watered: true }, { onConflict: "user_id,log_date" },
  );
  if (error) throw error;
}

export const gardenRepository = {
  async getCareHistory(day = gardenDay()): Promise<{ dates: string[]; total: number }> {
    const supabase = createClient();
    const userId = await requireUserId();
    const [history, total] = await Promise.all([
      supabase.from("garden_daily_log").select("log_date").eq("user_id", userId).eq("watered", true).gte("log_date", dayBefore(day, 6)).lte("log_date", day),
      supabase.from("garden_daily_log").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("watered", true).lte("log_date", day),
    ]);
    if (history.error) throw history.error;
    if (total.error) throw total.error;
    return { dates: (history.data ?? []).map(row => row.log_date as string), total: total.count ?? 0 };
  },

  async getLifeActivity(day = gardenDay()): Promise<{ task: boolean; journal: boolean; unavailable: boolean }> {
    const supabase = createClient();
    const userId = await requireUserId();
    const nextDay = dayBefore(day, -1);
    // Existence only: no task descriptions or private journal content enters the game.
    const [tasks, journal] = await Promise.all([
      supabase.from("tasks").select("id").eq("user_id", userId).eq("status", "done").gte("completed_at", `${day}T00:00:00Z`).lt("completed_at", `${nextDay}T00:00:00Z`).limit(1),
      supabase.from("journal_entries").select("id").eq("user_id", userId).eq("entry_date", day).limit(1),
    ]);
    return { task: !tasks.error && !!tasks.data?.length, journal: !journal.error && !!journal.data?.length, unavailable: !!tasks.error || !!journal.error };
  },

  async getActiveGarden(): Promise<UserGarden | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_garden")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async plantSeed(plantType: PlantType): Promise<UserGarden> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data: existing } = await supabase
      .from("user_garden")
      .select("id")
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("user_garden")
        .update({
          plant_type: plantType,
          growth_stage: 1,
          growth_points: 0,
          streak_days: 0,
          last_watered_at: null,
          planted_at: new Date().toISOString(),
          variant: "normal",
          is_wilted: false,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("user_garden")
      .insert({ user_id: userId, plant_type: plantType })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async waterPlant(): Promise<UserGarden> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data: garden, error: fetchErr } = await supabase
      .from("user_garden")
      .select("*")
      .single();
    if (fetchErr) throw fetchErr;

    const today = new Date().toISOString().slice(0, 10);
    if (garden.last_watered_at === today) {
      // A previous growth write may have succeeded before its log write failed.
      // Repair that partial save on retry without granting growth again.
      await recordDailyCare(userId, today);
      return garden;
    }
    if (garden.growth_stage >= 5) return garden;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const isConsecutive = garden.last_watered_at === yesterday;
    const newStreak = isConsecutive ? garden.streak_days + 1 : 1;

    const multiplier = STREAK_BONUS_MULTIPLIER(newStreak);
    const basePoints = 1;
    const earnedPoints = Math.ceil(basePoints * multiplier);
    const totalPoints = garden.growth_points + earnedPoints;

    const threshold = POINTS_PER_STAGE[garden.plant_type as PlantType];
    let newStage = garden.growth_stage;
    let remainingPoints = totalPoints;

    if (totalPoints >= threshold && garden.growth_stage < 5) {
      newStage = garden.growth_stage + 1;
      remainingPoints = totalPoints - threshold;
    }

    // Compare-and-set prevents two devices from overwriting each other's growth.
    let update = supabase
      .from("user_garden")
      .update({
        growth_points: remainingPoints,
        growth_stage: newStage,
        streak_days: newStreak,
        last_watered_at: today,
        is_wilted: false,
      })
      .eq("id", garden.id)
      .eq("growth_stage", garden.growth_stage)
      .eq("growth_points", garden.growth_points);
    update = garden.last_watered_at === null ? update.is("last_watered_at", null) : update.eq("last_watered_at", garden.last_watered_at);
    const { data, error } = await update.select().maybeSingle();
    if (error) throw error;
    if (!data) {
      const current = await gardenRepository.getActiveGarden();
      if (current?.last_watered_at === today) { await recordDailyCare(userId, today); return current; }
      throw new Error("Garden changed on another device. Please try again.");
    }

    await recordDailyCare(userId, today);

    return data;
  },

  async useFertilizer(): Promise<UserGarden | null> {
    const supabase = createClient();

    const { data: inv } = await supabase
      .from("garden_inventory")
      .select("*")
      .eq("item_type", "fertilizer")
      .maybeSingle();

    if (!inv || inv.quantity <= 0) return null;

    await supabase
      .from("garden_inventory")
      .update({ quantity: inv.quantity - 1 })
      .eq("id", inv.id);

    const { data: garden, error: fetchErr } = await supabase
      .from("user_garden")
      .select("*")
      .single();
    if (fetchErr) throw fetchErr;

    if (garden.growth_stage >= 5) return garden;

    const { data, error } = await supabase
      .from("user_garden")
      .update({
        growth_stage: garden.growth_stage + 1,
        growth_points: 0,
      })
      .eq("id", garden.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async harvestPlant(): Promise<PlantCollectionEntry> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data: garden, error: fetchErr } = await supabase
      .from("user_garden")
      .select("*")
      .single();
    if (fetchErr) throw fetchErr;

    if (garden.growth_stage < 5) {
      throw new Error("Plant is not fully grown yet");
    }

    const { data: entry, error: insertErr } = await supabase
      .from("plant_collection")
      .insert({
        user_id: userId,
        plant_type: garden.plant_type,
        variant: garden.variant,
        streak_days: garden.streak_days,
        bloom_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    await supabase.from("user_garden").delete().eq("id", garden.id);

    return entry;
  },

  async getCollection(): Promise<PlantCollectionEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plant_collection")
      .select("*")
      .order("harvested_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getInventory(): Promise<GardenInventory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("garden_inventory")
      .select("*");
    if (error) throw error;
    return data ?? [];
  },

  async getTodayLog(): Promise<GardenDailyLog | null> {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("garden_daily_log")
      .select("*")
      .eq("log_date", today)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async claimDailyChest(): Promise<{ items: { type: GardenItemType; qty: number }[] }> {
    const supabase = createClient();
    const userId = await requireUserId();
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("garden_daily_log")
      .select("*")
      .eq("log_date", today)
      .maybeSingle();

    if (existing?.chest_claimed) {
      return { items: [] };
    }

    const roll = Math.random();
    let rewards: { type: GardenItemType; qty: number }[];

    if (roll < 0.01) {
      rewards = [{ type: "rare_seed", qty: 1 }];
    } else if (roll < 0.08) {
      rewards = [{ type: "fertilizer", qty: 1 }];
    } else if (roll < 0.35) {
      rewards = [{ type: "sunlight", qty: 1 }];
    } else {
      rewards = [{ type: "water", qty: 1 }];
    }

    for (const reward of rewards) {
      const { data: inv } = await supabase
        .from("garden_inventory")
        .select("*")
        .eq("item_type", reward.type)
        .maybeSingle();

      if (inv) {
        await supabase
          .from("garden_inventory")
          .update({ quantity: inv.quantity + reward.qty })
          .eq("id", inv.id);
      } else {
        await supabase
          .from("garden_inventory")
          .insert({ user_id: userId, item_type: reward.type, quantity: reward.qty });
      }
    }

    await supabase
      .from("garden_daily_log")
      .upsert(
        { user_id: userId, log_date: today, chest_claimed: true, bonus_items: rewards },
        { onConflict: "user_id,log_date" }
      );

    return { items: rewards };
  },

  async checkAndApplyWilt(): Promise<UserGarden | null> {
    const supabase = createClient();
    const { data: garden } = await supabase
      .from("user_garden")
      .select("*")
      .maybeSingle();

    if (!garden || garden.is_wilted) return garden;

    if (garden.last_watered_at && garden.last_watered_at < new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      const { data, error } = await supabase
        .from("user_garden")
        .update({ is_wilted: true })
        .eq("id", garden.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    return garden;
  },
};

export function getPlantUnlockRequirement(plantType: PlantType): number {
  switch (plantType) {
    case "grass": return 0;
    case "sunflower": return 0;
    case "lily": return 1;
    case "orchid": return 3;
    case "apple_tree": return 5;
  }
}

export function getPlantBloomDays(plantType: PlantType): number {
  let stage = 1, points = 0, days = 0;
  while (stage < 5) {
    days++;
    points += Math.ceil(STREAK_BONUS_MULTIPLIER(days));
    if (points >= POINTS_PER_STAGE[plantType]) { stage++; points -= POINTS_PER_STAGE[plantType]; }
  }
  return days;
}
