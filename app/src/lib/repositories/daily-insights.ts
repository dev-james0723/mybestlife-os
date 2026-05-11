import { createClient } from "@/lib/supabase/client";
import type {
  DailyInsightInteractionStatus,
  DailyInsights,
} from "@/types/database";

export const dailyInsightsRepository = {
  /** Returns today's insights row or null if not generated yet. */
  async getForDate(date: string): Promise<DailyInsights | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_insights")
      .select("*")
      .eq("date", date)
      .maybeSingle();
    if (error) throw error;
    return (data as DailyInsights | null) ?? null;
  },

  /** Returns the most recent N rows (for "past suggestions" view). */
  async listRecent(limit = 14): Promise<DailyInsights[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_insights")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as DailyInsights[];
  },

  async setInteraction(
    row: DailyInsights,
    suggestionId: string,
    status: DailyInsightInteractionStatus,
  ): Promise<DailyInsights> {
    const supabase = createClient();
    const next = {
      ...(row.interactions ?? {}),
      [suggestionId]: { status, at: new Date().toISOString() },
    };
    const { data, error } = await supabase
      .from("daily_insights")
      .update({ interactions: next })
      .eq("id", row.id)
      .select()
      .single();
    if (error) throw error;
    return data as DailyInsights;
  },
};
