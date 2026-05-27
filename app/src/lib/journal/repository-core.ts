import type { SupabaseClient } from "@supabase/supabase-js";
import type { JournalEntry, Json } from "@/types/database";
import { requireAuthenticatedUserId } from "@/lib/grateful-things/repository-core";

export type JournalWriteInput = {
  entry_date: string;
  content?: string | null;
  emotion_quadrant?: Json | null;
  needs?: string[];
  topic?: string | null;
  primary_emotion?: string | null;
  secondary_emotion?: string | null;
  intensity?: number | null;
  target?: string | null;
  bullets?: string[];
  self_story?: string | null;
  next_tiny_step?: string | null;
  appreciation?: string | null;
  topic_extras?: Json;
  context_factors?: Json;
  ai_summary?: string | null;
  ai_reflection?: Json | null;
  ai_audio_script?: string | null;
  ai_audio_quotes?: Json;
  ai_illustration_url?: string | null;
  ai_illustration_style?: string | null;
  ai_illustration_symbolic_ratio?: number | null;
  ai_audio_url?: string | null;
  linked_project_ids?: string[];
  linked_task_ids?: string[];
};

function buildInsertPayload(userId: string, input: JournalWriteInput) {
  return {
    user_id: userId,
    entry_date: input.entry_date,
    content: input.content ?? null,
    emotion_quadrant: input.emotion_quadrant ?? null,
    needs: input.needs ?? [],
    topic: input.topic ?? null,
    primary_emotion: input.primary_emotion ?? null,
    secondary_emotion: input.secondary_emotion ?? null,
    intensity: input.intensity ?? null,
    target: input.target ?? null,
    bullets: input.bullets ?? [],
    self_story: input.self_story ?? null,
    next_tiny_step: input.next_tiny_step ?? null,
    appreciation: input.appreciation ?? null,
    topic_extras: input.topic_extras ?? {},
    context_factors: input.context_factors ?? {},
    ai_summary: input.ai_summary ?? null,
    ai_reflection: input.ai_reflection ?? null,
    ai_audio_script: input.ai_audio_script ?? null,
    ai_audio_quotes: input.ai_audio_quotes ?? [],
    ai_illustration_url: input.ai_illustration_url ?? null,
    ai_illustration_style: input.ai_illustration_style ?? null,
    ai_illustration_symbolic_ratio: input.ai_illustration_symbolic_ratio ?? null,
    ai_audio_url: input.ai_audio_url ?? null,
    linked_project_ids: input.linked_project_ids ?? [],
    linked_task_ids: input.linked_task_ids ?? [],
  };
}

export async function insertJournalEntry(
  supabase: SupabaseClient,
  userId: string,
  input: JournalWriteInput,
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert(buildInsertPayload(userId, input))
    .select()
    .single();
  if (error) throw error;
  return data as JournalEntry;
}

export async function updateJournalEntryRow(
  supabase: SupabaseClient,
  id: string,
  input: Partial<JournalWriteInput>,
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as JournalEntry;
}

export { requireAuthenticatedUserId };
