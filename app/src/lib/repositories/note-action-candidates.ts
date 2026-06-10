import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export type CreateAcceptedNoteActionCandidateInput = {
  note_id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  project_id?: string | null;
  tags?: string[];
  task_id?: string | null;
  ai_metadata?: Json | null;
};

export const noteActionCandidatesRepository = {
  async createAccepted(
    input: CreateAcceptedNoteActionCandidateInput,
  ): Promise<void> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { error } = await supabase.from("note_action_candidates").insert({
      user_id: userId,
      note_id: input.note_id,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? null,
      due_date: input.due_date || null,
      project_id: input.project_id ?? null,
      tags: input.tags ?? [],
      status: "accepted",
      task_id: input.task_id ?? null,
      ai_metadata: input.ai_metadata ?? null,
    });
    if (error) throw error;
  },
};
