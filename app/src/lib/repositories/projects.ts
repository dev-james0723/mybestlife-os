import { createClient } from "@/lib/supabase/client";
import { ensureError } from "@/lib/utils/ensure-error";
import type { Project } from "@/types/database";
import type { ThumbnailStyle } from "@/types/knowledge";

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw ensureError(error, "Failed to resolve user");
  if (!data.user) throw new Error("You must be signed in to create a project.");
  return data.user.id;
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: Project["status"];
  priority?: Project["priority"];
  start_date?: string;
  end_date?: string;
  color?: string;
  tags?: string[];
  thumbnail_url?: string;
  thumbnail_style?: Exclude<ThumbnailStyle, "na">;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export const projectsRepository = {
  async getAll(): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw ensureError(error, "Failed to load projects");
    return data ?? [];
  },

  async getById(id: string): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw ensureError(error, "Failed to load project");
    return data;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        ...input,
        user_id: userId,
        status: input.status ?? "planning",
        priority: input.priority ?? "medium",
        tags: input.tags ?? [],
      })
      .select()
      .single();
    if (error) throw ensureError(error, "Failed to create project");
    return data;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw ensureError(error, "Failed to update project");
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw ensureError(error, "Failed to delete project");
  },
};
