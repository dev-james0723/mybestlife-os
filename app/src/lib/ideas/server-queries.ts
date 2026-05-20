import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Idea } from "@/types/database";
import { normalizeIdea } from "@/lib/ideas/normalize-idea";

export async function listIdeasForAuthenticatedUser(): Promise<Idea[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => normalizeIdea(row))
    .filter((idea) => idea.id.length > 0);
}
