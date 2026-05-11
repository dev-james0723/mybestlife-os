import { createClient } from "@/lib/supabase/client";
import type { WeeklyReview } from "@/types/database";

export type CreateWeeklyReviewInput = {
  review_date: string;
  content?: string | null;
  highlights?: string | null;
  challenges?: string | null;
  next_week_focus?: string | null;
};

export type UpdateWeeklyReviewInput = Partial<CreateWeeklyReviewInput>;

export const weeklyReviewsRepository = {
  async getAll(): Promise<WeeklyReview[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_reviews")
      .select("*")
      .order("review_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<WeeklyReview> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateWeeklyReviewInput): Promise<WeeklyReview> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_reviews")
      .insert({
        review_date: input.review_date,
        content: input.content ?? null,
        highlights: input.highlights ?? null,
        challenges: input.challenges ?? null,
        next_week_focus: input.next_week_focus ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateWeeklyReviewInput): Promise<WeeklyReview> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_reviews")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("weekly_reviews").delete().eq("id", id);
    if (error) throw error;
  },
};
