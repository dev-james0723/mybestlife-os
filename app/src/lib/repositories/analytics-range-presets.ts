import { createClient } from "@/lib/supabase/client";
import { validateAnalyticsDateRange } from "@/lib/analytics/date-range";
import type { AnalyticsRangePreset } from "@/types/database";

export type AnalyticsRangePresetInput = {
  name: string;
  startISO: string;
  endISO: string;
  sortOrder?: number;
};

const TABLE = "analytics_range_presets";
const MAX_NAME_LENGTH = 48;

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

function normalizeInput(input: AnalyticsRangePresetInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Range name is required.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Range name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }

  const range = validateAnalyticsDateRange(input.startISO, input.endISO);
  if (!range.ok) {
    throw new Error("Choose a valid range ending today or earlier, up to 10 years long.");
  }

  return {
    name,
    start_date: range.startISO,
    end_date: range.endISO,
    sort_order: input.sortOrder ?? 0,
  };
}

export const analyticsRangePresetsRepository = {
  async list(): Promise<AnalyticsRangePreset[]> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as AnalyticsRangePreset[] | null) ?? [];
  },

  async create(input: AnalyticsRangePresetInput): Promise<AnalyticsRangePreset> {
    const userId = await requireUserId();
    const supabase = createClient();
    const payload = {
      user_id: userId,
      ...normalizeInput(input),
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AnalyticsRangePreset;
  },

  async update(
    id: string,
    input: AnalyticsRangePresetInput,
  ): Promise<AnalyticsRangePreset> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        ...normalizeInput(input),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as AnalyticsRangePreset;
  },

  async remove(id: string): Promise<void> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async markUsed(id: string): Promise<AnalyticsRangePreset> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as AnalyticsRangePreset;
  },
};
