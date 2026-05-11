import { createClient } from "@/lib/supabase/client";
import type { Idea } from "@/types/database";

export type CreateIdeaInput = {
  content: string;
  source_type?: Idea["source_type"];
  capture_kind?: Idea["capture_kind"];
  voice_transcript?: string | null;
  linked_project_ids?: string[];
  linked_task_ids?: string[];
  status?: Idea["status"];
  // v2 fields
  title?: string | null;
  ai_tags?: string[];
  manual_tags?: string[];
  destinations?: string[];
  attachments?: Idea["attachments"];
  ai_suggestions?: Idea["ai_suggestions"];
  linked_knowledge_item_ids?: string[];
  linked_node_ids?: string[];
};

export type UpdateIdeaInput = Partial<CreateIdeaInput>;

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export const ideasRepository = {
  async getAll(): Promise<Idea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Idea[];
  },

  async getById(id: string): Promise<Idea> {
    const supabase = createClient();
    const { data, error } = await supabase.from("ideas").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Idea;
  },

  async create(input: CreateIdeaInput): Promise<Idea> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        user_id: userId,
        content: input.content,
        source_type: input.source_type ?? "text",
        capture_kind: input.capture_kind ?? "idea",
        voice_transcript: input.voice_transcript ?? null,
        linked_project_ids: input.linked_project_ids ?? [],
        linked_task_ids: input.linked_task_ids ?? [],
        status: input.status ?? "captured",
        // v2 fields
        ...(input.title !== undefined && { title: input.title }),
        ...(input.manual_tags !== undefined && { manual_tags: input.manual_tags }),
        ...(input.destinations !== undefined && { destinations: input.destinations }),
        ...(input.attachments !== undefined && { attachments: input.attachments }),
        ...(input.ai_suggestions !== undefined && { ai_suggestions: input.ai_suggestions }),
        ...(input.linked_knowledge_item_ids !== undefined && {
          linked_knowledge_item_ids: input.linked_knowledge_item_ids,
        }),
        ...(input.linked_node_ids !== undefined && { linked_node_ids: input.linked_node_ids }),
      })
      .select()
      .single();
    if (error) throw error;
    return data as Idea;
  },

  async update(id: string, input: UpdateIdeaInput): Promise<Idea> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ideas")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Idea;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) throw error;
  },
};
