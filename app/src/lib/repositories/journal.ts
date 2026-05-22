import { createClient } from "@/lib/supabase/client";
import type { JournalEntry, Json } from "@/types/database";
import {
  JOURNAL_AUDIO_BUCKET,
  JOURNAL_ILLUSTRATIONS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/journal/constants";

// ---------------------------------------------------------------------------
// Row <-> JournalEntry mapping
// ---------------------------------------------------------------------------

type JournalRow = {
  id: string;
  user_id: string;
  entry_date: string;
  topic: string;
  quadrant: "RED" | "YELLOW" | "BLUE" | "GREEN";
  primary_emotion: string;
  secondary_emotion: string | null;
  intensity: number;
  target: string | null;
  bullets: { items: string[] };
  self_story: string | null;
  needs: { items: string[] };
  next_tiny_step: string;
  appreciation: string | null;
  topic_extras: Json | null;
  context_factors: Json | null;
  project_ids: string[];
  task_ids: string[];
  ai_output: Json | null;
  ai_media: Json | null;
  source: string;
  created_at: string;
  updated_at: string;
};

function rowToEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    topic: row.topic,
    quadrant: row.quadrant,
    primaryEmotion: row.primary_emotion,
    secondaryEmotion: row.secondary_emotion,
    intensity: row.intensity,
    target: row.target,
    bullets: row.bullets ?? { items: [] },
    selfStory: row.self_story,
    needs: row.needs ?? { items: [] },
    nextTinyStep: row.next_tiny_step,
    appreciation: row.appreciation,
    topicExtras: row.topic_extras,
    contextFactors: row.context_factors,
    projectIds: row.project_ids ?? [],
    taskIds: row.task_ids ?? [],
    aiOutput: row.ai_output,
    aiMedia: row.ai_media,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type CreateJournalEntryInput = {
  entryDate: string;
  topic: string;
  quadrant: "RED" | "YELLOW" | "BLUE" | "GREEN";
  primaryEmotion: string;
  secondaryEmotion?: string | null;
  intensity: number;
  target?: string | null;
  bullets: { items: string[] };
  selfStory?: string | null;
  needs: { items: string[] };
  nextTinyStep: string;
  appreciation?: string | null;
  topicExtras?: Json | null;
  contextFactors?: Json | null;
  projectIds?: string[];
  taskIds?: string[];
};

export type UpdateJournalEntryInput = Partial<CreateJournalEntryInput> & {
  aiOutput?: Json | null;
  aiMedia?: Json | null;
};

function toInsertRow(
  input: CreateJournalEntryInput,
  userId: string,
): Partial<JournalRow> {
  return {
    user_id: userId,
    entry_date: input.entryDate,
    topic: input.topic,
    quadrant: input.quadrant,
    primary_emotion: input.primaryEmotion,
    secondary_emotion: input.secondaryEmotion ?? null,
    intensity: input.intensity,
    target: input.target ?? null,
    bullets: input.bullets,
    self_story: input.selfStory ?? null,
    needs: input.needs,
    next_tiny_step: input.nextTinyStep,
    appreciation: input.appreciation ?? null,
    topic_extras: input.topicExtras ?? null,
    context_factors: input.contextFactors ?? null,
    project_ids: input.projectIds ?? [],
    task_ids: input.taskIds ?? [],
  };
}

function toUpdateRow(input: UpdateJournalEntryInput): Partial<JournalRow> {
  const out: Partial<JournalRow> = {};
  if (input.entryDate !== undefined) out.entry_date = input.entryDate;
  if (input.topic !== undefined) out.topic = input.topic;
  if (input.quadrant !== undefined) out.quadrant = input.quadrant;
  if (input.primaryEmotion !== undefined)
    out.primary_emotion = input.primaryEmotion;
  if (input.secondaryEmotion !== undefined)
    out.secondary_emotion = input.secondaryEmotion;
  if (input.intensity !== undefined) out.intensity = input.intensity;
  if (input.target !== undefined) out.target = input.target;
  if (input.bullets !== undefined) out.bullets = input.bullets;
  if (input.selfStory !== undefined) out.self_story = input.selfStory;
  if (input.needs !== undefined) out.needs = input.needs;
  if (input.nextTinyStep !== undefined) out.next_tiny_step = input.nextTinyStep;
  if (input.appreciation !== undefined) out.appreciation = input.appreciation;
  if (input.topicExtras !== undefined) out.topic_extras = input.topicExtras;
  if (input.contextFactors !== undefined)
    out.context_factors = input.contextFactors;
  if (input.projectIds !== undefined) out.project_ids = input.projectIds;
  if (input.taskIds !== undefined) out.task_ids = input.taskIds;
  if (input.aiOutput !== undefined) out.ai_output = input.aiOutput;
  if (input.aiMedia !== undefined) out.ai_media = input.aiMedia;
  return out;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const journalRepository = {
  async getAll(): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as JournalRow[] | null)?.map(rowToEntry) ?? [];
  },

  async getRecent(limit = 10): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as JournalRow[] | null)?.map(rowToEntry) ?? [];
  },

  async getById(id: string): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return rowToEntry(data as JournalRow);
  },

  async create(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("not_authenticated");
    const { data, error } = await supabase
      .from("journal_entries")
      .insert(toInsertRow(input, userData.user.id))
      .select()
      .single();
    if (error) throw error;
    return rowToEntry(data as JournalRow);
  },

  async update(
    id: string,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .update(toUpdateRow(input))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToEntry(data as JournalRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // -------------------------------------------------------------------------
  // Storage helpers — Phase 3 will write to these buckets via the server.
  // The repository only exposes signed-URL refresh helpers for the client.
  // -------------------------------------------------------------------------

  async refreshIllustrationSignedUrl(path: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(JOURNAL_ILLUSTRATIONS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
  },

  async refreshAudioSignedUrl(path: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(JOURNAL_AUDIO_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
  },
};
